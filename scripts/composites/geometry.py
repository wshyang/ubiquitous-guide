"""Geometry for placing a paddle sprite on a boat: blade direction, grip and rotation.

Coordinates are image pixels with the origin at the top-left and y pointing
down. Angles are in degrees; positive angles turn the sprite counter-clockwise
on screen, matching PIL's ``Image.rotate``.
"""
from __future__ import annotations

import math

import numpy as np
from PIL import Image

GRIP_INSET = 0.08  # grip sits this fraction of the length in from the narrow end


def _opaque_bounds(sprite: Image.Image) -> tuple[int, int, np.ndarray]:
    """Return (left, top, mask) where mask is the opaque pixels cropped to their bounding box."""
    mask = np.asarray(sprite.convert("RGBA"))[..., 3] > 127
    ys, xs = np.nonzero(mask)
    left, top = int(xs.min()), int(ys.min())
    return left, top, mask[top : ys.max() + 1, left : xs.max() + 1]


def _alpha(sprite: Image.Image) -> np.ndarray:
    return _opaque_bounds(sprite)[2]


def _blade_is_at_bottom(alpha: np.ndarray) -> bool:
    """The blade is the wider end of a paddle; compare the widest rows of each quarter."""
    height = alpha.shape[0]
    quarter = max(1, height // 4)
    top_width = alpha[:quarter].sum(axis=1).max()
    bottom_width = alpha[-quarter:].sum(axis=1).max()
    return bool(bottom_width >= top_width)


def _end_centroid(alpha: np.ndarray, bottom: bool) -> tuple[float, float]:
    height = alpha.shape[0]
    quarter = max(1, height // 4)
    band = alpha[-quarter:] if bottom else alpha[:quarter]
    ys, xs = np.nonzero(band)
    y_offset = height - quarter if bottom else 0
    return float(xs.mean()), float(ys.mean() + y_offset)


def blade_direction(sprite: Image.Image) -> np.ndarray:
    """Unit vector from the grip toward the blade, in image coordinates."""
    alpha = _alpha(sprite)
    bottom = _blade_is_at_bottom(alpha)
    grip_x, grip_y = _end_centroid(alpha, bottom=not bottom)
    blade_x, blade_y = _end_centroid(alpha, bottom=bottom)
    vector = np.array([blade_x - grip_x, blade_y - grip_y], dtype=float)
    return vector / np.linalg.norm(vector)


def grip_point(sprite: Image.Image) -> tuple[float, float]:
    """Point on the shaft where the hands hold the paddle, in sprite pixels."""
    left, top, alpha = _opaque_bounds(sprite)
    height = alpha.shape[0]
    bottom = _blade_is_at_bottom(alpha)
    inset = height * GRIP_INSET
    y = inset if bottom else height - 1 - inset
    xs = np.nonzero(alpha[int(round(y))])[0]
    return left + float(xs.mean()), top + float(y)


def rotation_for_blade(sprite: Image.Image, target: tuple[float, float]) -> float:
    """Counter-clockwise angle that turns the blade direction onto ``target``."""
    current = blade_direction(sprite)
    target_unit = np.array(target, dtype=float) / np.linalg.norm(target)
    current_screen = math.atan2(-current[1], current[0])
    target_screen = math.atan2(-target_unit[1], target_unit[0])
    return math.degrees(target_screen - current_screen)


def compose_paddle(canvas: Image.Image, paddle: Image.Image, hand: tuple[float, float], angle: float) -> Image.Image:
    """Return a copy of ``canvas`` with ``paddle`` rotated by ``angle`` and gripped at ``hand``."""
    size = max(paddle.width, paddle.height)
    pad = size * 2
    padded = Image.new("RGBA", (pad * 2, pad * 2), (0, 0, 0, 0))
    gx, gy = grip_point(paddle)
    padded.alpha_composite(paddle.convert("RGBA"), (int(round(pad - gx)), int(round(pad - gy))))
    rotated = padded.rotate(angle, resample=Image.BICUBIC, center=(pad, pad))
    out = canvas.convert("RGBA").copy()
    hx, hy = hand
    out.alpha_composite(rotated, (int(round(hx - pad)), int(round(hy - pad))))
    return out
