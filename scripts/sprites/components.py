"""Split an alpha mask into individual sprite pieces by connected components."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from scipy import ndimage

Box = tuple[int, int, int, int]  # x0, y0, x1, y1 (exclusive end)


@dataclass(frozen=True)
class Piece:
    box: Box

    @property
    def area(self) -> int:
        x0, y0, x1, y1 = self.box
        return (x1 - x0) * (y1 - y0)


@dataclass(frozen=True)
class PieceMask:
    """A piece plus the alpha values that belong to it, cropped to its box."""

    box: Box
    alpha: np.ndarray


def find_pieces(mask: np.ndarray, merge_radius: int, min_area: int) -> list[Piece]:
    return [Piece(box=pm.box) for pm in extract_piece_masks(mask, merge_radius, min_area)]


def extract_piece_masks(mask: np.ndarray, merge_radius: int, min_area: int) -> list[PieceMask]:
    """Group opaque pixels into pieces, merging parts closer than ``merge_radius``.

    Pieces are returned in reading order (top-to-bottom, then left-to-right).
    Each piece keeps only the alpha of its own component, so neighbouring
    sprites that fall inside its box do not leak into it.
    """
    solid = mask > 0
    grown = ndimage.binary_dilation(solid, iterations=merge_radius) if merge_radius else solid
    labels, count = ndimage.label(grown)
    found = [_component(mask, solid, labels == idx) for idx in range(1, count + 1)]
    kept = [p for p in found if p is not None and _box_area(p.box) >= min_area]
    return sort_reading_order(kept)


def sort_reading_order(pieces: list[Any]) -> list[Any]:
    """Order pieces row by row, then left to right.

    Rows are banded by vertical centre: a piece starts a new row when its
    centre sits more than half the median piece height below the row's first
    piece. This tolerates ragged tops inside one row of sprites.
    """
    if not pieces:
        return []
    median_height = float(np.median([p.box[3] - p.box[1] for p in pieces]))
    by_centre = sorted(pieces, key=lambda p: (p.box[1] + p.box[3]) / 2)
    rows: list[list[PieceMask]] = []
    row_centre = None
    for piece in by_centre:
        centre = (piece.box[1] + piece.box[3]) / 2
        if row_centre is None or centre - row_centre > median_height / 2:
            rows.append([])
            row_centre = centre
        rows[-1].append(piece)
    return [p for row in rows for p in sorted(row, key=lambda q: q.box[0])]


def _box_area(box: Box) -> int:
    x0, y0, x1, y1 = box
    return (x1 - x0) * (y1 - y0)


def _component(mask: np.ndarray, solid: np.ndarray, region: np.ndarray) -> PieceMask | None:
    own = np.where(solid & region, mask, 0).astype(np.uint8)
    if not own.any():
        return None
    ys, xs = np.nonzero(own)
    box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    x0, y0, x1, y1 = box
    return PieceMask(box=box, alpha=own[y0:y1, x0:x1])
