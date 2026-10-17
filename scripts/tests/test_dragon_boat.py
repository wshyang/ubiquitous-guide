"""Anchor geometry for the dragon-boat class."""
from PIL import Image

from scripts.composites.dragon_boat import compose_dragon_boat


def test_wake_extends_canvas_past_the_stern_and_anchors_sit_on_waterline() -> None:
    hull = Image.new("RGBA", (400, 100), (200, 30, 30, 255))
    wake = Image.new("RGBA", (120, 20), (255, 255, 255, 255))

    canvas, anchors = compose_dragon_boat(hull, wake)

    assert canvas.width > hull.width + 10
    assert anchors["waterline_stern"][1] == anchors["waterline_bow"][1]
    assert anchors["waterline_bow"][0] < anchors["waterline_stern"][0]
    assert 0 <= anchors["waterline_stern"][0] <= canvas.width
