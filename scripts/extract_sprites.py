#!/usr/bin/env python3
"""Cut magenta-backed sprite sheets into transparent, classed PNG pieces (SPEC §3).

Usage:
  python scripts/extract_sprites.py --report [sheet-stem ...]   # inspect geometry
  python scripts/extract_sprites.py [sheet-stem ...]            # extract to public/sprites

Output: public/sprites/<class>/<class>-NN.png + public/sprites/manifest.json
(the manifest is the public contract: every piece is reachable at its /sprites/ URL).
"""
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

REPO_ROOT = Path(__file__).resolve().parents[1]
SHEET_ROOT = REPO_ROOT / "src" / "images" / "sheets"
DEFAULT_OUT = REPO_ROOT / "public" / "sprites"
DEBUG_OUT = REPO_ROOT / "work" / "debug"

# Feather window: distance-to-backdrop colour below LOW -> fully transparent,
# above HIGH -> fully opaque. Between, alpha ramps so JPEG anti-aliasing fringe
# fades instead of leaving a magenta halo (tuned against balloon-arch pinks).
ALPHA_LOW = 65.0
ALPHA_HIGH = 120.0


@dataclass(frozen=True)
class ClassSpec:
    """One object class = one or more centre-bands (fractions of the sheet)."""

    name: str
    y: tuple[float, float]
    x: tuple[float, float] = (0.0, 1.0)
    row_tol: int = 60
    expected: int | None = None        # soft check, warn on mismatch


@dataclass(frozen=True)
class SheetSpec:
    stem: str
    min_area: int
    classes: tuple[ClassSpec, ...]
    excludes: tuple[tuple[float, float, float, float], ...] = ()  # title/label boxes
    weld: int = 2


@dataclass(frozen=True)
class Cut:
    """A component cut from a sheet, awaiting global numbering."""

    cls: str
    bbox: tuple[int, int, int, int]
    sheet: str
    rgb: np.ndarray
    alpha: np.ndarray


SHEET_SPECS: dict[str, SheetSpec] = {
    "character-poses": SheetSpec(
        stem="character-poses",
        min_area=1500,
        classes=(
            ClassSpec("character-red", (0.00, 0.200), row_tol=90, expected=12),
            ClassSpec("character-blue", (0.200, 0.397), row_tol=90, expected=12),
            ClassSpec("character-green", (0.397, 0.577), row_tol=90, expected=12),
            ClassSpec("character-yellow", (0.577, 0.733), row_tol=90, expected=12),
            ClassSpec("character-orange", (0.733, 0.871), row_tol=90, expected=13),
            ClassSpec("character-purple", (0.871, 1.01), row_tol=90, expected=13),
        ),
    ),
    "clouds": SheetSpec(
        stem="clouds",
        min_area=400,
        classes=(
            ClassSpec("cloud-small", (0.00, 0.30), row_tol=70, expected=14),
            ClassSpec("cloud-medium", (0.30, 0.51), row_tol=70, expected=4),
            ClassSpec("cloud-large", (0.51, 0.70), row_tol=70, expected=2),
            ClassSpec("cloud-wisp", (0.70, 1.01), row_tol=70, expected=14),
        ),
    ),
    "boats-and-oars": SheetSpec(
        stem="boats-and-oars",
        min_area=250,
        classes=(
            ClassSpec("dragon-boat", (0.00, 0.64), x=(0.00, 0.53), row_tol=90, expected=6),
            ClassSpec("small-boat", (0.00, 0.64), x=(0.53, 1.01), row_tol=60, expected=12),
            ClassSpec("oar-wood", (0.64, 1.01), x=(0.00, 0.51), row_tol=60, expected=35),
            ClassSpec("paddle-double", (0.64, 0.93), x=(0.51, 0.755), row_tol=55, expected=12),
            ClassSpec("paddle-vertical", (0.64, 0.93), x=(0.755, 1.01), row_tol=60, expected=12),
            ClassSpec("water-fx", (0.93, 1.01), x=(0.53, 1.01), row_tol=40, expected=10),
        ),
    ),
    # Section 1 water effects + Section 2 event props (untitled variant).
    "water-effects-event-props-a": SheetSpec(
        stem="water-effects-event-props-a",
        min_area=250,
        excludes=(
            (0.010, 0.012, 0.630, 0.072),   # title 1
            (0.010, 0.498, 0.520, 0.560),   # title 2
        ),
        classes=(
            # -- section 1: water --
            ClassSpec("wake", (0.072, 0.48), x=(0.00, 0.45), row_tol=70),
            ClassSpec("splash", (0.07, 0.47), x=(0.385, 0.43), row_tol=55),
            ClassSpec("splash", (0.07, 0.19), x=(0.43, 0.65), row_tol=55),
            ClassSpec("spray", (0.27, 0.345), x=(0.86, 1.01), row_tol=45),
            ClassSpec("oar-dip", (0.19, 0.47), x=(0.385, 0.65), row_tol=55),
            ClassSpec("oar-dip", (0.20, 0.345), x=(0.655, 1.01), row_tol=45),
            ClassSpec("ripple", (0.055, 0.20), x=(0.655, 1.01), row_tol=45),
            ClassSpec("spray", (0.345, 0.48), x=(0.635, 1.01), row_tol=45),
            # -- section 2: event props --
            ClassSpec("banner", (0.555, 0.705), x=(0.00, 0.175), row_tol=45, expected=2),
            ClassSpec("bunting", (0.705, 0.80), x=(0.00, 0.175), row_tol=45, expected=4),
            ClassSpec("bunting", (0.705, 0.80), x=(0.22, 0.36), row_tol=45),
            ClassSpec("flag", (0.555, 0.705), x=(0.175, 0.36), row_tol=45, expected=5),
            ClassSpec("flag", (0.705, 0.80), x=(0.175, 0.22), row_tol=45),
            ClassSpec("tent", (0.555, 0.75), x=(0.36, 0.68), row_tol=55, expected=7),
            ClassSpec("event-flag", (0.66, 0.73), x=(0.72, 0.81), row_tol=45, expected=1),
            ClassSpec("balloon-arch", (0.555, 0.66), x=(0.68, 1.01), row_tol=55, expected=2),
            ClassSpec("tent", (0.80, 1.01), x=(0.00, 0.40), row_tol=55),
            ClassSpec("arch-start-finish", (0.75, 1.01), x=(0.40, 0.665), row_tol=55, expected=1),
            ClassSpec("flag-pole", (0.75, 1.01), x=(0.655, 0.715), row_tol=55, expected=2),
            ClassSpec("podium", (0.74, 0.83), x=(0.715, 0.85), row_tol=45, expected=1),
            ClassSpec("trophy", (0.83, 0.905), x=(0.715, 0.85), row_tol=45, expected=2),
            ClassSpec("barrier", (0.905, 1.01), x=(0.715, 0.85), row_tol=45, expected=2),
            ClassSpec("event-gear", (0.74, 1.01), x=(0.85, 1.01), row_tol=55, expected=8),
        ),
    ),
    # Section 1 water effects + Section 2 event props (labelled variant).
    "water-effects-event-props-b-labeled": SheetSpec(
        stem="water-effects-event-props-b-labeled",
        min_area=250,
        excludes=(
            (0.30, 0.015, 0.70, 0.055),    # title 1
            (0.23, 0.505, 0.775, 0.556),   # title 2
            (0.13, 0.060, 0.232, 0.097),   # label: Water Wakes
            (0.43, 0.060, 0.61, 0.097),    # label: Splash & Spray Effects
            (0.85, 0.060, 0.915, 0.097),   # label: Ripples
            (0.57, 0.288, 0.73, 0.322),    # label: Oar/Paddle Splashes
            (0.06, 0.553, 0.175, 0.590),   # label: Event Banners
            (0.29, 0.553, 0.40, 0.590),    # label: Outpost Tents
            (0.48, 0.553, 0.635, 0.590),   # label: Event Infrastructure
            (0.678, 0.553, 0.80, 0.590),   # label: Award Ceremony
            (0.83, 0.553, 0.986, 0.590),   # label: Equipment & Barriers
        ),
        classes=(
            # -- section 1: water --
            ClassSpec("wake", (0.06, 0.48), x=(0.00, 0.355), row_tol=70),
            ClassSpec("splash", (0.06, 0.31), x=(0.355, 0.75), row_tol=55),
            ClassSpec("oar-dip", (0.31, 0.49), x=(0.355, 0.79), row_tol=55),
            ClassSpec("ripple", (0.055, 0.47), x=(0.79, 1.01), row_tol=55),
            # -- section 2: event props --
            ClassSpec("banner", (0.59, 0.80), x=(0.00, 0.23), row_tol=55),
            ClassSpec("bunting", (0.80, 0.96), x=(0.00, 0.14), row_tol=45, expected=3),
            ClassSpec("flag", (0.80, 0.96), x=(0.14, 0.23), row_tol=45, expected=2),
            ClassSpec("tent", (0.59, 1.01), x=(0.23, 0.46), row_tol=55, expected=10),
            ClassSpec("arch-start-finish", (0.59, 0.73), x=(0.46, 0.66), row_tol=55, expected=1),
            ClassSpec("tent", (0.73, 1.01), x=(0.46, 0.66), row_tol=55),
            ClassSpec("podium", (0.59, 0.70), x=(0.66, 0.83), row_tol=45, expected=1),
            ClassSpec("flag-pole", (0.70, 0.82), x=(0.775, 0.83), row_tol=45, expected=3),
            ClassSpec("trophy", (0.70, 0.82), x=(0.66, 0.775), row_tol=45, expected=1),
            ClassSpec("flag-pole", (0.84, 1.01), x=(0.66, 0.73), row_tol=45),
            ClassSpec("balloon-arch", (0.84, 1.01), x=(0.73, 0.83), row_tol=45, expected=1),
            ClassSpec("event-gear", (0.59, 1.01), x=(0.83, 1.01), row_tol=55),
        ),
    ),
}


def load_rgb(path: Path) -> np.ndarray:
    with Image.open(path) as im:
        return np.asarray(im.convert("RGB"))


def estimate_bg_color(rgb: np.ndarray) -> np.ndarray:
    """Modal backdrop colour from the image border ring."""
    ring = np.concatenate([rgb[:2].reshape(-1, 3), rgb[-2:].reshape(-1, 3),
                           rgb[:, :2].reshape(-1, 3), rgb[:, -2:].reshape(-1, 3)])
    return np.median(ring, axis=0).astype(np.float32)


def alpha_from_backdrop(rgb: np.ndarray, bg: np.ndarray) -> np.ndarray:
    """Feathered alpha from colour distance to the magenta backdrop."""
    dist = np.linalg.norm(rgb.astype(np.float32) - bg, axis=-1)
    ramp = np.clip((dist - ALPHA_LOW) / (ALPHA_HIGH - ALPHA_LOW), 0.0, 1.0)
    return (ramp * 255.0).astype(np.uint8)


def box_mask(shape: tuple[int, int], box: tuple[float, float, float, float]) -> np.ndarray:
    """Boolean mask for an exclude box given as width/height fractions."""
    h, w = shape
    x0, y0, x1, y1 = box
    mask = np.zeros(shape, dtype=bool)
    mask[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)] = True
    return mask


def apply_excludes(alpha: np.ndarray, spec: SheetSpec) -> np.ndarray:
    """Zero alpha inside title/label boxes so text never becomes a piece."""
    cleaned = alpha.copy()
    for box in spec.excludes:
        cleaned[box_mask(cleaned.shape, box)] = 0
    return cleaned


def label_components(alpha: np.ndarray, spec: SheetSpec) -> tuple[np.ndarray, int]:
    """Binary mask -> welded, area-filtered connected components."""
    mask = alpha >= 80
    if spec.weld:
        mask = ndimage.binary_closing(mask, iterations=spec.weld)
    labels, _ = ndimage.label(mask, structure=np.ones((3, 3), dtype=bool))
    sizes = np.bincount(labels.ravel())
    keep = sizes >= spec.min_area
    keep[0] = False
    relabeled = keep[labels].astype(np.int32) * labels
    return relabeled, int(relabeled.max())


def component_boxes(labels: np.ndarray, n: int) -> list[tuple]:
    """Return (x0, y0, x1, y1, cx, cy) per component id 1..n."""
    boxes = []
    for cid in range(1, n + 1):
        ys, xs = np.where(labels == cid)
        if xs.size == 0:
            continue
        x0, x1 = int(xs.min()), int(xs.max()) + 1
        y0, y1 = int(ys.min()), int(ys.max()) + 1
        boxes.append((x0, y0, x1, y1, (x0 + x1) / 2, (y0 + y1) / 2))
    return boxes


def in_spec(box: tuple, spec: ClassSpec, shape: tuple[int, int]) -> bool:
    """True when the component centre falls inside the class band."""
    h, w = shape
    _, _, _, _, cx, cy = box
    y0, y1 = spec.y[0] * h, spec.y[1] * h
    x0, x1 = spec.x[0] * w, spec.x[1] * w
    return x0 <= cx < x1 and y0 <= cy < y1


def cluster_rows(boxes: list[tuple], row_tol: int) -> list[list[tuple]]:
    """Greedy y-clustering: components within row_tol px form a reading row."""
    rows: list[list[tuple]] = []
    for box in sorted(boxes, key=lambda b: b[5]):
        if rows and box[5] - np.mean([b[5] for b in rows[-1]]) <= row_tol:
            rows[-1].append(box)
        else:
            rows.append([box])
    return [sorted(row, key=lambda b: b[4]) for row in rows]


def ordered_boxes(boxes: list[tuple], spec: ClassSpec) -> list[tuple]:
    """Reading order: rows top-to-bottom, pieces left-to-right."""
    ordered = []
    for row in cluster_rows(boxes, spec.row_tol):
        ordered.extend(row)
    return ordered


def assign_classes(boxes: list[tuple], spec: SheetSpec, shape: tuple[int, int]) -> tuple[dict, list]:
    """Map each component to its class (first matching band wins); collect strays."""
    assigned: dict[str, list[tuple]] = {c.name: [] for c in spec.classes}
    unassigned = []
    for box in boxes:
        target = next((c for c in spec.classes if in_spec(box, c, shape)), None)
        if target is None:
            unassigned.append(box)
        else:
            assigned[target.name].append(box)
    return assigned, unassigned


def build_cuts(assigned: dict, spec: SheetSpec, rgb: np.ndarray, alpha: np.ndarray) -> list[Cut]:
    """Class maps -> reading-ordered cuts (global indices assigned later)."""
    cuts = []
    for cls_name, cls_boxes in assigned.items():
        cls_spec = next(c for c in dict.fromkeys(spec.classes) if c.name == cls_name)
        for box in ordered_boxes(cls_boxes, cls_spec):
            bbox = (int(box[0]), int(box[1]), int(box[2]), int(box[3]))
            cuts.append(Cut(cls_name, bbox, spec.stem, rgb, alpha))
    return cuts


def check_expected(cuts: list[Cut], spec: SheetSpec) -> list[str]:
    """Soft count checks: warn (do not fail) when a band's yield looks off."""
    warnings = []
    counts: dict[str, int] = {}
    for cut in cuts:
        counts[cut.cls] = counts.get(cut.cls, 0) + 1
    for cls in dict.fromkeys(spec.classes):
        got = counts.get(cls.name, 0)
        if cls.expected is not None and got != cls.expected:
            warnings.append(f"class {cls.name} on {spec.stem} expected {cls.expected}, got {got}")
    return warnings


def collect_sheet(path: Path, spec: SheetSpec) -> tuple[list[Cut], list[str]]:
    """One sheet -> cuts + warnings (no files written yet)."""
    rgb = load_rgb(path)
    alpha = apply_excludes(alpha_from_backdrop(rgb, estimate_bg_color(rgb)), spec)
    labels, n = label_components(alpha, spec)
    boxes = component_boxes(labels, n)
    assigned, unassigned = assign_classes(boxes, spec, alpha.shape)
    cuts = build_cuts(assigned, spec, rgb, alpha)
    warnings = check_expected(cuts, spec)
    for box in unassigned:
        warnings.append(
            f"unassigned component on {spec.stem} at ({int(box[4])},{int(box[5])}) "
            f"size {int(box[2]-box[0])}x{int(box[3]-box[1])}")
    return cuts, warnings


def number_cuts(cuts: list[Cut], sheet_order: list[str]) -> list[tuple[int, Cut]]:
    """Global per-class numbering: sheet order, then reading order."""
    sheet_rank = {stem: i for i, stem in enumerate(sheet_order)}
    by_class: dict[str, list[Cut]] = {}
    for cut in cuts:
        by_class.setdefault(cut.cls, []).append(cut)
    numbered = []
    for cls_name in sorted(by_class):
        cls_cuts = sorted(by_class[cls_name],
                          key=lambda c: (sheet_rank[c.sheet], c.bbox[1], c.bbox[0]))
        numbered.extend((i, cut) for i, cut in enumerate(cls_cuts))
    return numbered


def write_cut(index: int, cut: Cut, out_root: Path) -> dict:
    """Write one PNG and return its manifest entry."""
    x0, y0, x1, y1 = cut.bbox
    pad = 1
    ys0, ys1 = max(0, y0 - pad), min(cut.alpha.shape[0], y1 + pad)
    xs0, xs1 = max(0, x0 - pad), min(cut.alpha.shape[1], x1 + pad)
    tile = np.dstack([cut.rgb[ys0:ys1, xs0:xs1], cut.alpha[ys0:ys1, xs0:xs1]])
    out_dir = out_root / cut.cls
    out_dir.mkdir(parents=True, exist_ok=True)
    name = f"{cut.cls}-{index:02d}.png"
    Image.fromarray(tile, "RGBA").save(out_dir / name)
    return {
        "class": cut.cls,
        "index": index,
        "name": f"{cut.cls}-{index:02d}",
        "url": f"/sprites/{cut.cls}/{name}",
        "path": f"public/sprites/{cut.cls}/{name}",
        "sheet": cut.sheet,
        "bbox": [int(v) for v in cut.bbox],
        "size": [int(x1 - x0), int(y1 - y0)],
    }


def draw_debug(rgb: np.ndarray, boxes: list[tuple], out_path: Path) -> Path:
    """Annotated overlay (index + centre per component) for visual inspection."""
    im = Image.fromarray(rgb)
    draw = ImageDraw.Draw(im)
    for i, box in enumerate(boxes, start=1):
        x0, y0, x1, y1, cx, cy = box
        draw.rectangle([x0, y0, x1 - 1, y1 - 1], outline=(0, 255, 0), width=3)
        draw.text((cx - 8, cy - 8), str(i), fill=(0, 255, 0))
    im.thumbnail((1500, 1500))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    im.save(out_path)
    return out_path


def report_sheet(path: Path, spec: SheetSpec) -> None:
    """Geometry report: row clusters + numbered debug overlay (excludes applied)."""
    rgb = load_rgb(path)
    alpha = apply_excludes(alpha_from_backdrop(rgb, estimate_bg_color(rgb)), spec)
    labels, n = label_components(alpha, spec)
    boxes = component_boxes(labels, n)
    print(f"\n=== {path.stem}: {len(boxes)} components, size={rgb.shape[1]}x{rgb.shape[0]} ===")
    for i, row in enumerate(cluster_rows(boxes, 60), start=1):
        cxs = [b[4] for b in row]
        print(f"  row {i:2d}: cy~{int(np.mean([b[5] for b in row])):5d}  n={len(row):3d}  cx {int(min(cxs)):5d}..{int(max(cxs)):5d}")
    dbg = draw_debug(rgb, boxes, DEBUG_OUT / f"{path.stem}-components.png")
    print(f"  debug: {dbg.relative_to(REPO_ROOT)}")


def display_path(path: Path) -> str:
    """Repo-relative path when possible, absolute otherwise (e.g. tmp outputs)."""
    try:
        return str(path.relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


def write_manifest(entries: list[dict], out_root: Path) -> Path:
    """Deterministic manifest: sorted by class+index; the public sprite contract."""
    entries = sorted(entries, key=lambda e: (e["class"], e["index"]))
    payload = {
        "generated_by": "scripts/extract_sprites.py",
        "contract": "every piece is reachable at its `url` path",
        "count": len(entries),
        "classes": sorted({e["class"] for e in entries}),
        "pieces": entries,
    }
    out_root.mkdir(parents=True, exist_ok=True)
    path = out_root / "manifest.json"
    path.write_text(json.dumps(payload, indent=2) + "\n")
    return path


def selected_specs(stems: list[str]) -> dict[str, SheetSpec]:
    """Resolve CLI sheet names; unknown names abort loudly (no silent skips)."""
    if not stems:
        return SHEET_SPECS
    unknown = [s for s in stems if s not in SHEET_SPECS]
    if unknown:
        raise SystemExit(
            f"unknown sheet(s): {', '.join(unknown)}; known: {', '.join(sorted(SHEET_SPECS))}")
    return {s: SHEET_SPECS[s] for s in stems}


def run_extract(specs: dict[str, SheetSpec], out_root: Path) -> int:
    """Collect all sheets, number globally, write pieces + manifest."""
    all_cuts: list[Cut] = []
    all_warnings: list[str] = []
    for stem, spec in specs.items():
        cuts, warnings = collect_sheet(SHEET_ROOT / f"{stem}.jpeg", spec)
        all_cuts += cuts
        all_warnings += warnings
        print(f"{stem}: {len(cuts)} pieces")
    numbered = number_cuts(all_cuts, list(specs))
    entries = [write_cut(index, cut, out_root) for index, cut in numbered]
    manifest = write_manifest(entries, out_root)
    for warning in all_warnings:
        print(f"WARN {warning}")
    print(f"manifest: {display_path(manifest)} ({len(entries)} pieces)")
    return 1 if any("unassigned" in w for w in all_warnings) else 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sheets", nargs="*", help="sheet stems (default: all)")
    parser.add_argument("--report", action="store_true",
                        help="geometry report + debug overlay, write nothing")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args(argv)
    specs = selected_specs(args.sheets)

    if args.report:
        for spec in specs.values():
            report_sheet(SHEET_ROOT / f"{spec.stem}.jpeg", spec)
        return 0
    return run_extract(specs, args.out)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
