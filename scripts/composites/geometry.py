"""Shared stitching geometry: rotation about a pivot, canvas padding, JSON contract."""
from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image


def load_rgba(path: Path) -> Image.Image:
    with Image.open(path) as im:
        return im.convert("RGBA")


def rotated_pivot(pivot: tuple[float, float], angle_cw: float,
                  in_size: tuple[int, int], out_size: tuple[int, int]) -> tuple[float, float]:
    """Where `pivot` lands in the expanded canvas after rotate(-angle, center=pivot)."""
    # PIL rotate(expand=True) shifts content by ((out-in)/2); center-relative point
    # maps to itself plus that shift.
    dx = (out_size[0] - in_size[0]) / 2
    dy = (out_size[1] - in_size[1]) / 2
    return pivot[0] + dx, pivot[1] + dy


def rotate_sprite(sprite: Image.Image, angle_cw: float,
                  pivot: tuple[float, float]) -> tuple[Image.Image, tuple[float, float]]:
    """Rotate sprite CW about pivot (NEAREST keeps pixel-art crisp)."""
    rotated = sprite.rotate(-angle_cw, resample=Image.NEAREST, expand=True, center=pivot)
    return rotated, rotated_pivot(pivot, angle_cw, sprite.size, rotated.size)


def paste_at(base: Image.Image, sprite: Image.Image,
             at: tuple[float, float]) -> Image.Image:
    """Paste sprite's top-left to `at` (no mutation of inputs)."""
    out = base.copy()
    out.paste(sprite, (int(round(at[0])), int(round(at[1]))), sprite)
    return out


def stitch_at(base: Image.Image, sprite: Image.Image, angle_cw: float,
              pivot: tuple[float, float], anchor: tuple[float, float]) -> Image.Image:
    """Rotate sprite about pivot, then place pivot exactly on anchor."""
    rotated, moved_pivot = rotate_sprite(sprite, angle_cw, pivot)
    at = (anchor[0] - moved_pivot[0], anchor[1] - moved_pivot[1])
    return paste_at(base, rotated, at)


def padded_canvas(size: tuple[int, int], left: int, right: int,
                  top: int, bottom: int) -> Image.Image:
    """Transparent canvas grown by per-side padding."""
    return Image.new("RGBA", (size[0] + left + right, size[1] + top + bottom), (0, 0, 0, 0))


def rotate_point(point: tuple[float, float], angle_cw: float) -> tuple[float, float]:
    """Rotate a vector CW in image coords (y down) — used for blade-tip math."""
    rad = math.radians(angle_cw)
    x, y = point
    return x * math.cos(rad) - y * math.sin(rad), x * math.sin(rad) + y * math.cos(rad)


def normalized(point: tuple[float, float], size: tuple[int, int]) -> dict:
    return {"x": round(point[0] / size[0], 4), "y": round(point[1] / size[1], 4)}


def write_json(path: Path, payload: dict) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n")
    return path
