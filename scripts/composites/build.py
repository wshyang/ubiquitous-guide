"""Build composite sprites for every object class and write them under public/assets.

Usage:
    python -m scripts.composites.build [--review DIR]

Writes public/assets/composites/kayaks/ and .../dragon-boats/ PNGs, each with a manifest.json of anchors.
With --review, also writes 4x zoomed copies with a 10-pixel grid for visual checks.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw

from scripts.composites import dragon_boat, kayak
from scripts.composites.geometry import grip_point

REPO_ROOT = Path(__file__).resolve().parents[2]
SPRITES = REPO_ROOT / "public" / "assets" / "sprites"
OUTPUT = REPO_ROOT / "public" / "assets" / "composites"
KAYAK_OUT = OUTPUT / "kayaks"
DRAGON_OUT = OUTPUT / "dragon-boats"
WAKE = ("effects-props-v1", "water_wake_02")


def load_sprite(sheet: str, name: str) -> Image.Image:
    return Image.open(SPRITES / sheet / f"{name}.png").convert("RGBA")


def build_dragon_boats() -> list[dict]:
    wake = load_sprite(*WAKE)
    entries = []
    for name in dragon_boat_names():
        composed, anchors = dragon_boat.compose_dragon_boat(load_sprite("boats", name), wake)
        composed.save(DRAGON_OUT / f"{name}.png", optimize=True)
        entries.append({"name": name, "file": f"{name}.png", "class": "dragon_boat", "anchors": anchors})
    return entries


def dragon_boat_names() -> list[str]:
    manifest = json.loads((SPRITES / "boats" / "manifest.json").read_text())
    return [p["name"] for p in manifest["pieces"] if p["name"].startswith("dragon_boat_")]


def kayak_names() -> list[str]:
    manifest = json.loads((SPRITES / "boats" / "manifest.json").read_text())
    return [p["name"] for p in manifest["pieces"] if p["name"].startswith("kayak_")]


def base_name_for_phase(name: str, phase: str) -> str:
    """Pair catch with frame f0 and pull with frame f1; single-frame kayaks reuse their one frame."""
    if name.endswith("_f0") or name.endswith("_f1"):
        return name[:-3] + ("_f0" if phase == "catch" else "_f1")
    return name


def build_kayaks(review_dir: Path | None) -> list[dict]:
    paddle = load_sprite("boats", kayak.PADDLE_SPRITE)
    grip_point(paddle)  # fail fast if the paddle has no usable grip
    entries = []
    names = kayak_names()
    for name in names:
        seats = kayak.seat_count_from_name(name)
        for phase in kayak.PHASE_TARGETS:
            base = base_name_for_phase(name, phase)
            hull = load_sprite("boats", base)
            composed, anchors = kayak.compose_kayak(hull, paddle, seats, phase)
            stem = name[:-3] if name.endswith(("_f0", "_f1")) else name
            out_name = f"{stem}_{phase}"
            composed.save(KAYAK_OUT / f"{out_name}.png", optimize=True)
            if review_dir is not None:
                save_review(composed, review_dir / f"{out_name}.png", anchors)
            entries.append({"name": out_name, "file": f"{out_name}.png", "class": "kayak", "seats": seats, "phase": phase, "base": base, "anchors": anchors})
    return entries


def save_review(image: Image.Image, path: Path, anchors: dict, scale: int = 4) -> None:
    zoomed = image.resize((image.width * scale, image.height * scale), Image.NEAREST)
    background = Image.new("RGBA", zoomed.size, (60, 140, 200, 255))
    background.alpha_composite(zoomed)
    draw = ImageDraw.Draw(background)
    for x in range(0, image.width, 10):
        draw.line([(x * scale, 0), (x * scale, background.height)], fill=(255, 255, 255, 60))
    for y in range(0, image.height, 10):
        draw.line([(0, y * scale), (background.width, y * scale)], fill=(255, 255, 255, 60))
    for label, point in anchors.items():
        if label.startswith(("hand", "blade", "waterline")):
            _mark_point(draw, label, point, scale)
    background.convert("RGB").save(path)


def _mark_point(draw: ImageDraw.ImageDraw, label: str, point: list[int], scale: int) -> None:
    cx, cy = point[0] * scale, point[1] * scale
    draw.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], outline=(255, 0, 0, 255), width=2)
    draw.text((cx + 7, cy - 6), label, fill=(255, 255, 0, 255))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--review", type=Path, default=None)
    args = parser.parse_args()
    KAYAK_OUT.mkdir(parents=True, exist_ok=True)
    DRAGON_OUT.mkdir(parents=True, exist_ok=True)
    if args.review:
        args.review.mkdir(parents=True, exist_ok=True)
    kayaks = build_kayaks(args.review)
    (KAYAK_OUT / "manifest.json").write_text(json.dumps({"class": "kayak", "composites": kayaks}, indent=2) + "\n")
    boats = build_dragon_boats()
    (DRAGON_OUT / "manifest.json").write_text(json.dumps({"class": "dragon_boat", "composites": boats}, indent=2) + "\n")
    print(f"kayaks: {len(kayaks)}, dragon boats: {len(boats)} -> {OUTPUT.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
