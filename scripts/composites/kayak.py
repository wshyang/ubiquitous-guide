"""Kayak/canoe composite: hull + one double-blade paddle per paddler (SPEC §4).

Tuning loop: edit KAYAK_CONFIG -> run build_all.py -> inspect render -> adjust.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image

from composites import geometry as geo


@dataclass(frozen=True)
class KayakConfig:
    """Tunables for the small-boat class — one screenshot cycle per adjustment."""

    paddle_name: str = "paddle-double-01"           # horizontal double-blade paddle
    paddle_pivot: tuple[float, float] = (89.0, 15.5)  # centre = paddler's hands
    rest_angle_cw: float = -14.0                    # forward (bow-left) blade dipped
    anchor_y: float = 0.48                          # chest/hand height fraction
    pad_sides: int = 60
    pad_bottom: int = 46
    swing_deg: float = 24.0
    stroke_fps: float = 2.2


@dataclass(frozen=True)
class SmallVariant:
    """One hull: its sprite, layout name, and paddler hand x-fractions."""

    hull_name: str
    layout: str
    hand_x: tuple[float, ...]


VARIANTS = (
    SmallVariant("small-boat-00", "red-solo", (0.45,)),
    SmallVariant("small-boat-01", "red-solo-b", (0.45,)),
    SmallVariant("small-boat-02", "yellow-solo", (0.45,)),
    SmallVariant("small-boat-03", "yellow-solo-b", (0.45,)),
    SmallVariant("small-boat-04", "green-double", (0.33, 0.56)),
    SmallVariant("small-boat-05", "green-double-b", (0.33, 0.56)),
    SmallVariant("small-boat-06", "blue-double", (0.33, 0.56)),
    SmallVariant("small-boat-07", "blue-double-b", (0.33, 0.56)),
    SmallVariant("small-boat-08", "purple-triple", (0.27, 0.46, 0.65)),
    SmallVariant("small-boat-09", "purple-triple-b", (0.27, 0.46, 0.65)),
    SmallVariant("small-boat-10", "orange-double", (0.33, 0.56)),
    SmallVariant("small-boat-11", "pink-triple", (0.27, 0.46, 0.65)),
)


def paddler_anchors(hull_size: tuple[int, int], hand_x: tuple[float, ...],
                    cfg: KayakConfig) -> list[tuple[float, float]]:
    """Hand anchor points (hull-local pixels) for each paddler."""
    w, h = hull_size
    return [(fx * w, cfg.anchor_y * h) for fx in hand_x]


def build_variant(variant: SmallVariant, sprites: Path, cfg: KayakConfig) -> tuple[Image.Image, dict]:
    """Stitch one paddle per paddler; return composite + anchors.json entry."""
    hull = geo.load_rgba(sprites / "small-boat" / f"{variant.hull_name}.png")
    paddle = geo.load_rgba(sprites / "paddle-double" / f"{cfg.paddle_name}.png")
    canvas = geo.padded_canvas(hull.size, cfg.pad_sides, cfg.pad_sides, 0, cfg.pad_bottom)
    hull_at = (float(cfg.pad_sides), 0.0)
    canvas = geo.paste_at(canvas, hull, hull_at)
    anchors_px = paddler_anchors(hull.size, variant.hand_x, cfg)
    for anchor in anchors_px:
        abs_anchor = (anchor[0] + hull_at[0], anchor[1] + hull_at[1])
        canvas = geo.stitch_at(canvas, paddle, cfg.rest_angle_cw, cfg.paddle_pivot, abs_anchor)
    entry = {
        "hull": f"/sprites/small-boat/{variant.hull_name}.png",
        "hull_size": list(hull.size),
        "composite": f"/composites/small-boat/small-boat-{variant.layout}.png",
        "composite_size": list(canvas.size),
        "hull_offset": [int(hull_at[0]), int(hull_at[1])],
        "paddle_sprite": f"/sprites/paddle-double/{cfg.paddle_name}.png",
        "paddle_size": list(paddle.size),
        "paddle_pivot": list(cfg.paddle_pivot),
        "rest_angle_deg": cfg.rest_angle_cw,
        "anchors": [geo.normalized(a, hull.size) for a in anchors_px],
        "stroke": {"swing_deg": cfg.swing_deg, "fps": cfg.stroke_fps},
    }
    return canvas, entry


def build(sprites: Path, out_root: Path) -> dict:
    """Build all hull variants; write PNGs and anchors.json for the class."""
    cfg = KAYAK_CONFIG
    variants = {}
    for variant in VARIANTS:
        canvas, entry = build_variant(variant, sprites, cfg)
        out_dir = out_root / "small-boat"
        out_dir.mkdir(parents=True, exist_ok=True)
        canvas.save(out_dir / f"small-boat-{variant.layout}.png")
        variants[f"small-boat-{variant.layout}"] = entry
    return {"class": "small-boat", "variants": variants}


KAYAK_CONFIG = KayakConfig()
