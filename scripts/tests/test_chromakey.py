"""Tests for the magenta chroma key used to cut sprites out of sheets."""
import numpy as np

from scripts.sprites.chromakey import alpha_from_magenta


def _pixel(rgb: tuple[int, int, int]) -> np.ndarray:
    return np.array([[rgb]], dtype=np.uint8)


def test_pure_magenta_background_is_transparent() -> None:
    assert alpha_from_magenta(_pixel((255, 0, 255)))[0, 0] == 0


def test_solid_sprite_colours_are_opaque() -> None:
    for rgb in [(220, 30, 30), (255, 255, 255), (20, 20, 25), (60, 120, 200)]:
        assert alpha_from_magenta(_pixel(rgb))[0, 0] == 255, rgb


def test_alpha_is_monotonic_between_magenta_and_sprite() -> None:
    # Blend a dark outline into magenta: alpha must lie strictly between the extremes.
    blended = _pixel((137, 10, 140))  # 50/50 of (20,20,25) and magenta
    alpha = int(alpha_from_magenta(blended)[0, 0])
    assert 0 < alpha < 255


def test_unmix_removes_magenta_fringe_from_edge_pixels() -> None:
    from scripts.sprites.chromakey import unmix_magenta

    # 50% dark outline (20,20,25) over magenta should come back close to the outline colour.
    observed = np.array([[[137, 10, 140]]], dtype=np.uint8)
    alpha = np.array([[41]], dtype=np.uint8)
    restored = unmix_magenta(observed, alpha)[0, 0]

    assert int(restored[0]) < 60 and int(restored[1]) < 60 and int(restored[2]) < 60
