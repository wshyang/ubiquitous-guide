"""Dragon-boat composite: hull + one wooden oar per rower at gunwale anchors (SPEC §4).

Tuning loop: edit DRAGON_CONFIG -> run build_all.py -> inspect the rendered PNG
under work/debug/composites/ -> adjust values again.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image

from composites import geometry as geo


@dataclass(frozen=True)
class DragonConfig:
    """Every magic number lives here — one place to tune per screenshot cycle."""

    oar_name: str = "oar-wood-06"          # near-vertical oar, T-grip top, blade bottom
    oar_pivot: tuple[float, float] = (16.5, 58.0)   # shaft point sitting on the gunwale
    rest_angle_cw: float = -26.0           # blade trails aft (image right), handle forward-up
    rower_x0: float = 0.305                # first rower anchor, fraction of hull width
    rower_x1: float = 0.845                # last rower anchor
    anchor_y: float = 0.62                 # gunwale height, fraction of hull height
    oar_count: int = 10
    pad_sides: int = 30
    pad_bottom: int = 64
    swing_deg: float = 16.0                # animation hint: +/- swing around rest
    stroke_fps: float = 1.8                # animation hint: stroke cycles per second


@dataclass(frozen=True)
class Variant:
    """One hull colour, keyed to its extracted sprite."""

    hull_name: str
    color: str


VARIANTS = (
    Variant("dragon-boat-00", "red"),
    Variant("dragon-boat-01", "blue"),
    Variant("dragon-boat-02", "green"),
    Variant("dragon-boat-03", "yellow"),
    Variant("dragon-boat-04", "orange"),
    Variant("dragon-boat-05", "purple"),
)


def rower_anchors(hull_size: tuple[int, int], cfg: DragonConfig) -> list[tuple[float, float]]:
    """Evenly spaced gunwale anchor points (hull-local pixels)."""
    w, h = hull_size
    span = cfg.rower_x1 - cfg.rower_x0
    step = span / (cfg.oar_count - 1)
    return [( (cfg.rower_x0 + i * step) * w, cfg.anchor_y * h) for i in range(cfg.oar_count)]


def build_variant(variant: Variant, sprites: Path, cfg: DragonConfig) -> tuple[Image.Image, dict]:
    """Stitch oars onto one hull; return composite image + anchors.json entry."""
    hull = geo.load_rgba(sprites / "dragon-boat" / f"{variant.hull_name}.png")
    oar = geo.load_rgba(sprites / "oar-wood" / f"{cfg.oar_name}.png")
    canvas = geo.padded_canvas(hull.size, cfg.pad_sides, cfg.pad_sides, 0, cfg.pad_bottom)
    hull_at = (float(cfg.pad_sides), 0.0)
    canvas = geo.paste_at(canvas, hull, hull_at)
    anchors_px = []
    for anchor in rower_anchors(hull.size, cfg):
        abs_anchor = (anchor[0] + hull_at[0], anchor[1] + hull_at[1])
        canvas = geo.stitch_at(canvas, oar, cfg.rest_angle_cw, cfg.oar_pivot, abs_anchor)
        anchors_px.append(anchor)
    entry = {
        "hull": f"/sprites/dragon-boat/{variant.hull_name}.png",
        "hull_size": list(hull.size),
        "composite": f"/composites/dragon-boat/dragon-boat-{variant.color}.png",
        "composite_size": list(canvas.size),
        "hull_offset": [int(hull_at[0]), int(hull_at[1])],
        "oar_sprite": f"/sprites/oar-wood/{cfg.oar_name}.png",
        "oar_size": list(oar.size),
        "oar_pivot": list(cfg.oar_pivot),
        "rest_angle_deg": cfg.rest_angle_cw,
        "anchors": [geo.normalized(a, hull.size) for a in anchors_px],
        "stroke": {"swing_deg": cfg.swing_deg, "fps": cfg.stroke_fps},
    }
    return canvas, entry


def build(sprites: Path, out_root: Path) -> dict:
    """Build all hull variants; write PNGs and anchors.json for the class."""
    cfg = DRAGON_CONFIG
    variants = {}
    for variant in VARIANTS:
        canvas, entry = build_variant(variant, sprites, cfg)
        out_dir = out_root / "dragon-boat"
        out_dir.mkdir(parents=True, exist_ok=True)
        canvas.save(out_dir / f"dragon-boat-{variant.color}.png")
        variants[f"dragon-boat-{variant.color}"] = entry
    return {"class": "dragon-boat", "variants": variants}


DRAGON_CONFIG = DragonConfig()
