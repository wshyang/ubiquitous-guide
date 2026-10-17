#!/usr/bin/env python3
"""Build every composite object class into public/composites/ (SPEC §4).

Usage: python scripts/composites/build_all.py [--preview-dir work/debug/composites]
Output: <out>/<class>/<variant>.png + <out>/<class>/anchors.json + <out>/manifest.json
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw

SCRIPTS_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = SCRIPTS_DIR.parent
sys.path.insert(0, str(SCRIPTS_DIR))

from composites import dragon_boat, kayak  # noqa: E402
from composites.geometry import write_json  # noqa: E402

SPRITES = REPO_ROOT / "public" / "sprites"
OUT = REPO_ROOT / "public" / "composites"
PREVIEW = REPO_ROOT / "work" / "debug" / "composites"


def build_manifest(classes: list[dict]) -> Path:
    payload = {
        "generated_by": "scripts/composites/build_all.py",
        "contract": "anchors are normalised to hull size; pivots in sprite pixels",
        "classes": [c["class"] for c in classes],
        "detail": {c["class"]: c["variants"] for c in classes},
    }
    return write_json(OUT / "manifest.json", payload)


def write_anchors(cls_name: str, variants: dict) -> Path:
    return write_json(OUT / cls_name / "anchors.json", {"class": cls_name, "variants": variants})


def render_preview(name: str, image: Image.Image, preview_dir: Path) -> None:
    """Composite over a water-ish backdrop for visual inspection (the screenshot loop)."""
    preview_dir.mkdir(parents=True, exist_ok=True)
    bg = Image.new("RGB", image.size, (64, 130, 158))
    bg.paste(image, (0, 0), image)
    draw = ImageDraw.Draw(bg)
    draw.text((6, 4), name, fill=(255, 255, 255))
    bg.save(preview_dir / f"{name}.png")


def build_all(preview: bool) -> int:
    classes = [dragon_boat.build(SPRITES, OUT), kayak.build(SPRITES, OUT)]
    for cls in classes:
        write_anchors(cls["class"], cls["variants"])
        if preview:
            for name, entry in cls["variants"].items():
                image = Image.open(REPO_ROOT / "public" / entry["composite"][1:])
                render_preview(name, image, PREVIEW)
    manifest_path = build_manifest(classes)
    total = sum(len(c["variants"]) for c in classes)
    print(f"composites: {total} variants across {len(classes)} classes")
    print(f"manifest: {manifest_path.relative_to(REPO_ROOT)}")
    return 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--preview", action="store_true", help="also render work/debug/composites/*.png")
    args = parser.parse_args(argv)
    return build_all(args.preview)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
