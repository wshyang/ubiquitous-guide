"""Tests for the composite geometry: blade direction, rotation about the grip, anchors."""
import numpy as np
from PIL import Image

from scripts.composites.geometry import (
    blade_direction,
    compose_paddle,
    grip_point,
    rotation_for_blade,
)


def _paddle_sprite(blade_at_bottom: bool) -> Image.Image:
    """A 20x100 shaft with a 20x30 blade at one end."""
    arr = np.zeros((100, 20, 4), dtype=np.uint8)
    arr[:, 9:11, :3] = (150, 100, 50)
    arr[:, 9:11, 3] = 255
    rows = slice(70, 100) if blade_at_bottom else slice(0, 30)
    arr[rows, :, :3] = (170, 120, 60)
    arr[rows, :, 3] = 255
    return Image.fromarray(arr, "RGBA")


def test_blade_direction_points_to_the_blade_end() -> None:
    down = blade_direction(_paddle_sprite(blade_at_bottom=True))
    up = blade_direction(_paddle_sprite(blade_at_bottom=False))

    assert down[1] > 0.9 and abs(down[0]) < 0.1
    assert up[1] < -0.9 and abs(up[0]) < 0.1


def test_grip_sits_on_the_narrow_end() -> None:
    gx, gy = grip_point(_paddle_sprite(blade_at_bottom=True))

    assert gy < 50 and abs(gx - 10) <= 1


def test_rotation_turns_blade_to_target_direction() -> None:
    target = (-0.5, 1.0)
    angle = rotation_for_blade(_paddle_sprite(blade_at_bottom=True), target)
    padded = Image.new("RGBA", (300, 300), (0, 0, 0, 0))
    padded.alpha_composite(_paddle_sprite(blade_at_bottom=True), (140, 100))
    rotated = blade_direction(padded.rotate(angle, resample=Image.BICUBIC, center=(150, 150)))

    assert np.dot(rotated, np.array(target) / np.linalg.norm(target)) > 0.98


def test_compose_places_grip_on_the_hand_anchor() -> None:
    canvas = Image.new("RGBA", (200, 200), (0, 0, 0, 0))
    paddle = _paddle_sprite(blade_at_bottom=True)
    placed = compose_paddle(canvas, paddle, hand=(120, 80), angle=0.0)
    alpha = np.asarray(placed)[..., 3]
    ys, xs = np.nonzero(alpha)

    assert abs(xs.mean() - 120) < 3
    assert ys.min() < 80 < ys.max()
