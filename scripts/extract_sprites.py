#!/usr/bin/env python3
"""
Sprite Extractor — Greenfield Discipline ADD-003
Extracts individual sprites from magenta-backed sheets (255,0,255) into public/sprites/
with alpha transparency. Uses PIL + numpy + iterative BFS labeling (no OpenCV needed).
Handles JPEG chroma bleeding via tolerance + morphological cleanup.
"""
import os, json, math, hashlib
from pathlib import Path
from PIL import Image
import numpy as np

SRC_DIR = Path("src/images")
OUT_ROOT = Path("public/sprites")
MANIFEST_PATH = OUT_ROOT / "manifest.json"

# Magenta chroma key: pure (255,0,255). JPEG compress introduces fringe: use distance threshold.
MAGENTA = np.array([255,0,255], dtype=np.int16)
TOLERANCE = 55  # Euclidean distance in RGB space; tuned for JPEG fringe
# Alternative fast check: r>200 & g<80 & b>200

MIN_AREA = {
    "sprites-characters-6colours-magenta.jpg": 400,  # characters tiny ~600px
    "sprites-boats-dragon-kayak-oars-water.jpg": 300,  # smallest oar ~500px
    "sprites-clouds-varied-magenta.jpg": 500,
    "sprites-water-wake-splash-ripple-props.jpg": 200,
    "sprites-event-props-banners-tents-podiums.jpg": 300,
}

PADDING = 4  # extra transparent border around each crop

def is_magenta(pixel_row):
    """pixel_row: (H,W,3) uint8 -> bool mask (H,W) True if magenta background"""
    # fast path + distance
    r = pixel_row[:,:,0].astype(np.int16)
    g = pixel_row[:,:,1].astype(np.int16)
    b = pixel_row[:,:,2].astype(np.int16)
    # distance to magenta
    dist = np.sqrt((r.astype(np.float32)-255)**2 + (g.astype(np.float32)-0)**2 + (b.astype(np.float32)-255)**2)
    mask = dist < TOLERANCE
    # additional heuristic for JPEG pink bleed near edges (e.g., magenta 200-255)
    # keep dist as primary; no need for second.
    return mask

def label_components(mask_foreground):
    """
    mask_foreground: bool HxW where True = foreground (non-magenta)
    Returns labeled array and number of labels using BFS (8-connectivity).
    Implemented with iterative stack to avoid scipy dependency.
    For performance, use Python loops with numpy? We'll use simple flood fill via scan + BFS using deque.
    For large images (~2000x2000) naive BFS per pixel is heavy but okay (<~20M pixels total).
    We optimize with union-find via 2-pass algorithm implemented manually.
    """
    h,w = mask_foreground.shape
    labels = np.zeros((h,w), dtype=np.int32)
    current_label = 0
    from collections import deque

    # For speed, we iterate and BFS only when we find unlabeled foreground
    # Use deque
    for y in range(h):
        for x in range(w):
            if mask_foreground[y,x] and labels[y,x]==0:
                current_label += 1
                # BFS
                dq = deque()
                dq.append((y,x))
                labels[y,x] = current_label
                while dq:
                    cy,cx = dq.popleft()
                    # 8 neighbours
                    for ny in (cy-1, cy, cy+1):
                        if ny<0 or ny>=h: continue
                        for nx in (cx-1, cx, cx+1):
                            if nx<0 or nx>=w: continue
                            if ny==cy and nx==cx: continue
                            if mask_foreground[ny,nx] and labels[ny,nx]==0:
                                labels[ny,nx]=current_label
                                dq.append((ny,nx))
    return labels, current_label

def extract_one(src_path: Path, out_category: str):
    print(f"\n=== Extracting {src_path.name} -> {out_category} ===")
    img = Image.open(src_path).convert("RGB")
    arr = np.array(img)  # H,W,3
    h,w,_ = arr.shape
    print(f"  size {w}x{h}")
    magenta_mask = is_magenta(arr)  # True = background
    foreground = ~magenta_mask
    print(f"  foreground pixels: {foreground.sum()} / {h*w} ({foreground.sum()/(h*w)*100:.1f}%)")

    # Optional morphological clean: remove single-pixel noise (1px magenta holes inside foreground?)
    # We'll do opening: erode then dilate? But simpler to filter by area later.
    # Label components
    labels, n_labels = label_components(foreground)
    print(f"  raw components: {n_labels}")

    min_area = MIN_AREA.get(src_path.name, 400)

    # Compute bounding boxes per label
    bboxes = {}
    for y in range(h):
        # faster row-wise using numpy where?
        row_labels = labels[y]
        # we could vectorize, but loop okay for now? This is O(H*W) anyway.
        pass

    # Vectorized bbox via iterating labels
    # Build dict label -> (minx,miny,maxx,maxy, area)
    # Use numpy bincount style? Simple loop over labels
    # Instead use for label in 1..n: find coords via np.where (could be heavy for 500 labels x 2M pixels)
    # Optimize: use Python loop to accumulate in one pass
    stats = {}  # label -> [minx, miny, maxx, maxy, count]
    for y in range(h):
        for x in range(w):
            lbl = labels[y,x]
            if lbl==0: continue
            if lbl not in stats:
                stats[lbl] = [x,y,x,y,1]
            else:
                s = stats[lbl]
                if x < s[0]: s[0]=x
                if y < s[1]: s[1]=y
                if x > s[2]: s[2]=x
                if y > s[3]: s[3]=y
                s[4]+=1

    print(f"  stats computed for {len(stats)} labels")

    # Filter by area and by position (exclude header text near top)
    # For sheets with header text, we know header occupies top ~8% and is black/white text on magenta.
    # Those text components are small (area < ~600) and y < 150 and width >> height? But we'll just use min_area + heuristic
    # Also exclude components that are huge but likely composite background? Not needed.

    # For the boats sheet, we expect ~6 dragonboats (big), 12 kayaks (medium), 36 loose oars/paddles (thin), 7 splashes (small-medium), plus maybe text? But there is no header text on that sheet.
    # For event props sheet, header text is present at ~y<100, x centered. Those letters will be small ~200-500px area but scattered. We want to exclude them.
    # Heuristic: if y_max < 140 and area < 2000 and src is event-props, skip.
    filtered = []
    for lbl, (minx,miny,maxx,maxy,cnt) in stats.items():
        if cnt < min_area:
            continue
        # header text filter
        if src_path.name == "sprites-event-props-banners-tents-podiums.jpg":
            if maxy < 120:  # top title area
                continue
            # also second header "2. Festive..." at around y~ 300-400? Actually image height ~ 2000, header at ~ 45%? Let's just keep heuristic narrow.
        if src_path.name == "sprites-water-wake-splash-ripple-props.jpg":
            if maxy < 130:
                continue
        # aspect ratio filter: exclude extremely thin lines that are jpeg artifacts at border? But oars are thin tall (width ~15 height ~100) -> keep.
        wbox = maxx-minx+1
        hbox = maxy-miny+1
        # skip if both dims tiny (<10)
        if wbox < 8 and hbox < 8:
            continue
        filtered.append((lbl, minx,miny,maxx,maxy,cnt,wbox,hbox))

    # Sort by position top-to-bottom, left-to-right for deterministic naming
    filtered.sort(key=lambda t: (t[2]//20, t[1]))  # bucket rows

    print(f"  filtered components: {len(filtered)} (min_area={min_area})")
    for f in filtered[:10]:
        print(f"    lbl {f[0]} bbox {f[1]},{f[2]}-{f[3]},{f[4]} area {f[5]} size {f[6]}x{f[7]}")

    # Prepare output dir
    out_dir = OUT_ROOT / out_category
    out_dir.mkdir(parents=True, exist_ok=True)
    # Clean old files? Keep.
    # Create RGBA image for transparency
    # magenta -> transparent, others opaque; also make any pixel close to magenta semi-transparent? For anti-aliased edge, we can compute alpha based on distance
    # Compute alpha: if magenta mask true => 0, else if distance < 80 and not mask? That would be edge fringe; we can compute alpha = 255 * (dist - TOL)/(80 - TOL) clipped? Simpler: if dist < TOL then 0 else 255, but preserve edge.

    # Compute per-pixel alpha using distance falloff for smoother edge
    r = arr[:,:,0].astype(np.float32)
    g = arr[:,:,1].astype(np.float32)
    b = arr[:,:,2].astype(np.float32)
    dist = np.sqrt((r-255)**2 + (g-0)**2 + (b-255)**2)
    # alpha: 0 if dist < TOL, 255 if dist > TOL+30, linear in between
    alpha = np.clip((dist - TOLERANCE) / 30 * 255, 0, 255).astype(np.uint8)
    # Force foreground where we know foreground? Actually alpha already derived from dist; magenta=0, foreground=255, edge = semi.
    rgba = np.dstack([arr, alpha])
    pil_rgba = Image.fromarray(rgba, "RGBA")

    manifest_entries = []
    for idx, (lbl, minx,miny,maxx,maxy,cnt,wbox,hbox) in enumerate(filtered):
        # expand bbox by padding, clamp
        x0 = max(0, minx - PADDING)
        y0 = max(0, miny - PADDING)
        x1 = min(w, maxx + 1 + PADDING)
        y1 = min(h, maxy + 1 + PADDING)
        crop = pil_rgba.crop((x0,y0,x1,y1))
        # Further trim fully transparent border? Already padded, okay.
        # Save
        fname = f"{out_category}-{idx:03d}-{wbox}x{hbox}.png"
        out_path = out_dir / fname
        crop.save(out_path, "PNG")
        manifest_entries.append({
            "file": f"/sprites/{out_category}/{fname}",
            "path": str(out_path),
            "bbox": [int(x0), int(y0), int(x1), int(y1)],
            "size": [int(wbox), int(hbox)],
            "area": int(cnt),
            "label": int(lbl)
        })
        print(f"    saved {fname} {wbox}x{hbox}")

    print(f"  total saved: {len(manifest_entries)} to {out_dir}")
    return manifest_entries

def main():
    # mapping src -> category
    mappings = [
        ("sprites-characters-6colours-magenta.jpg", "characters"),
        ("sprites-boats-dragon-kayak-oars-water.jpg", "boats"),
        ("sprites-clouds-varied-magenta.jpg", "clouds"),
        ("sprites-water-wake-splash-ripple-props.jpg", "waterfx"),
        ("sprites-event-props-banners-tents-podiums.jpg", "props"),
    ]
    all_manifest = {}
    for src_name, cat in mappings:
        src_path = SRC_DIR / src_name
        if not src_path.exists():
            print(f"WARN missing {src_path}")
            continue
        entries = extract_one(src_path, cat)
        all_manifest[cat] = entries

    # Also copy backdrops to public for direct URL access
    public_images = Path("public/images")
    public_images.mkdir(parents=True, exist_ok=True)
    for p in SRC_DIR.glob("*"):
        if p.suffix.lower() in (".jpg",".jpeg",".png"):
            import shutil
            shutil.copy(p, public_images / p.name)
            print(f"copied {p.name} to public/images")

    # Write manifest
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    with open(MANIFEST_PATH, "w") as f:
        json.dump(all_manifest, f, indent=2)
    print(f"\nManifest written to {MANIFEST_PATH}")
    # Summary
    total = sum(len(v) for v in all_manifest.values())
    print(f"TOTAL sprites extracted: {total}")
    for k,v in all_manifest.items():
        print(f"  {k}: {len(v)}")

if __name__ == "__main__":
    main()
