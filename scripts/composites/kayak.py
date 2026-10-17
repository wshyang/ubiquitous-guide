"""Kayak object class: paddlers' hands and blade anchors for stitching paddles onto hulls.

A kayak sprite is the hull plus seated paddlers (no paddles). This module adds one
wood paddle per seat. Each paddle grip is pinned to the paddler's hand anchor, and
its angle depends on the stroke phase: ``catch`` (blade forward) or ``pull`` (blade
back). Anchors are expressed as fractions of the hull box so one table covers every
kayak colour of the same seat count.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

from PIL import Image

from scripts.composites.geometry import compose_paddle, rotation_for_blade

PADDLE_SPRITE = "paddle_wood_09"
PADDLE_SCALE = 0.8
MARGIN = {"left": 20, "right": 20, "top": 40, "bottom": 110}
WATERLINE_FRACTION = 0.86

# Blade direction in image coordinates (y down): catch = forward and down, pull = back and down.
PHASE_TARGETS = {"catch": (0.5, 1.0), "pull": (-0.5, 1.0)}


@dataclass(frozen=True)
class SeatLayout:
    seat_fractions: tuple[float, ...]  # paddler x-positions along the hull, 0 = stern, 1 = bow
    hand_fraction_y: float  # hand height as a fraction of hull height (top = 0)


# Iteration 2 (review of kayak_green_2seat and kayak_red_1seat at 3x): the first pass
# put grips ~9px right of the hands on the 2-seat hull and ~25px high on the 1-seat hull.
SEAT_LAYOUTS = {
    1: SeatLayout(seat_fractions=(0.48,), hand_fraction_y=0.60),
    2: SeatLayout(seat_fractions=(0.40, 0.58), hand_fraction_y=0.41),
    3: SeatLayout(seat_fractions=(0.34, 0.53, 0.71), hand_fraction_y=0.41),
}


def seat_count_from_name(name: str) -> int:
    """Read the seat count from names like kayak_red_1seat_f0 or kayak_pink_3seat."""
    for count in SEAT_LAYOUTS:
        if f"{count}seat" in name:
            return count
    raise ValueError(f"no seat count in kayak name: {name}")


def compose_kayak(hull: Image.Image, paddle: Image.Image, seats: int, phase: str) -> tuple[Image.Image, dict]:
    """Return the composed kayak image and its anchor points in canvas pixels."""
    layout = SEAT_LAYOUTS[seats]
    target = PHASE_TARGETS[phase]
    scaled = paddle.resize((round(paddle.width * PADDLE_SCALE), round(paddle.height * PADDLE_SCALE)), Image.LANCZOS)
    angle = rotation_for_blade(scaled, target)
    canvas = _blank_canvas(hull)
    origin_x, origin_y = MARGIN["left"], MARGIN["top"]
    canvas.alpha_composite(hull.convert("RGBA"), (origin_x, origin_y))
    anchors = _base_anchors(hull, origin_x, origin_y)
    unit = _unit(target)
    tip_distance = scaled.height * 0.92
    for index, fraction in enumerate(layout.seat_fractions):
        hand = (origin_x + fraction * hull.width, origin_y + layout.hand_fraction_y * hull.height)
        canvas = compose_paddle(canvas, scaled, hand=hand, angle=angle)
        anchors[f"hand_seat_{index + 1}"] = _round_point(hand)
        anchors[f"blade_tip_seat_{index + 1}"] = _round_point((hand[0] + unit[0] * tip_distance, hand[1] + unit[1] * tip_distance))
    return canvas, anchors


def _blank_canvas(hull: Image.Image) -> Image.Image:
    width = hull.width + MARGIN["left"] + MARGIN["right"]
    height = hull.height + MARGIN["top"] + MARGIN["bottom"]
    return Image.new("RGBA", (width, height), (0, 0, 0, 0))


def _base_anchors(hull: Image.Image, origin_x: int, origin_y: int) -> dict:
    waterline_y = origin_y + WATERLINE_FRACTION * hull.height
    return {
        "hull_box": [origin_x, origin_y, origin_x + hull.width, origin_y + hull.height],
        "waterline_bow": _round_point((origin_x + hull.width * 0.97, waterline_y)),
        "waterline_stern": _round_point((origin_x + hull.width * 0.03, waterline_y)),
    }


def _unit(vector: tuple[float, float]) -> tuple[float, float]:
    length = math.hypot(*vector)
    return vector[0] / length, vector[1] / length


def _round_point(point: tuple[float, float]) -> list[int]:
    return [int(round(point[0])), int(round(point[1]))]
