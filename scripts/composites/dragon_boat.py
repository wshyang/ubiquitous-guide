"""Dragon-boat object class: anchor points for stitching a wake onto the stern.

Each dragon-boat sprite already contains its rowers and their paddle shafts (checked
in the zoomed review), so no oars are overlaid here. The class adds the water wake
at the stern and records the waterline and bow/stern anchors that the app uses to
place the boat on a lane.
"""
from __future__ import annotations

from PIL import Image

WATERLINE_FRACTION = 0.84
LEFT_MARGIN = 10
TOP_MARGIN = 10
BOTTOM_MARGIN = 30
WAKE_OVERLAP = 0.15  # fraction of the wake width that tucks under the hull


def compose_dragon_boat(hull: Image.Image, wake: Image.Image) -> tuple[Image.Image, dict]:
    """Return the boat with its wake attached at the stern, and its anchors in canvas pixels."""
    wake_tuck = int(wake.width * WAKE_OVERLAP)
    canvas_width = LEFT_MARGIN + hull.width + wake.width - wake_tuck
    canvas_height = TOP_MARGIN + hull.height + BOTTOM_MARGIN
    canvas = Image.new("RGBA", (canvas_width, canvas_height), (0, 0, 0, 0))
    canvas.alpha_composite(hull.convert("RGBA"), (LEFT_MARGIN, TOP_MARGIN))
    waterline = TOP_MARGIN + hull.height * WATERLINE_FRACTION
    stern_x = LEFT_MARGIN + hull.width * 0.98
    wake_y = round(waterline - wake.height / 2)
    canvas.alpha_composite(wake.convert("RGBA"), (round(stern_x - wake_tuck), wake_y))
    anchors = {
        "hull_box": [LEFT_MARGIN, TOP_MARGIN, LEFT_MARGIN + hull.width, TOP_MARGIN + hull.height],
        "waterline_bow": [round(LEFT_MARGIN + hull.width * 0.02), round(waterline)],
        "waterline_stern": [round(stern_x), round(waterline)],
        "wake_origin": [round(stern_x), round(waterline)],
    }
    return canvas, anchors
