"""Chroma key for magenta-backed sprite sheets.

The key measures how "magenta" a pixel is: the smaller of red and blue minus
green. Pure magenta (255, 0, 255) scores 255; neutral and sprite colours score
near or below zero. Alpha ramps linearly between two thresholds so that
anti-aliased sprite edges keep partial transparency instead of a magenta halo.
"""
from __future__ import annotations

import numpy as np

OPAQUE_BELOW = 60
TRANSPARENT_ABOVE = 140


def magenta_strength(rgb: np.ndarray) -> np.ndarray:
    """Return a per-pixel magenta score in the range [-255, 255]."""
    pixels = rgb.astype(np.int16)
    return np.minimum(pixels[..., 0], pixels[..., 2]) - pixels[..., 1]


def alpha_from_magenta(rgb: np.ndarray) -> np.ndarray:
    """Return a uint8 alpha channel: 0 for magenta backing, 255 for sprite pixels."""
    strength = magenta_strength(rgb).astype(np.float32)
    ramp = (TRANSPARENT_ABOVE - strength) / (TRANSPARENT_ABOVE - OPAQUE_BELOW)
    return (np.clip(ramp, 0.0, 1.0) * 255).round().astype(np.uint8)


def unmix_magenta(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """Despill magenta from partly transparent edge pixels to remove pink halos.

    The excess magenta (min of red and blue minus green) is removed from red
    and blue in proportion to how transparent the pixel is. Fully opaque
    pixels keep their colour; fully transparent pixels are irrelevant.
    """
    pixels = rgb.astype(np.float32)
    excess = np.clip(magenta_strength(rgb).astype(np.float32), 0.0, None)
    transparency = 1.0 - alpha.astype(np.float32) / 255.0
    spill = (excess * transparency)[..., None]
    despilled = pixels - spill * np.array([1.0, 0.0, 1.0], dtype=np.float32)
    return np.clip(despilled, 0, 255).round().astype(np.uint8)
