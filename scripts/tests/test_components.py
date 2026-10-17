"""Tests for splitting an alpha mask into individual sprite pieces."""
import numpy as np

from scripts.sprites.components import Piece, find_pieces


def _mask_with_blocks(blocks: list[tuple[int, int, int, int]]) -> np.ndarray:
    mask = np.zeros((60, 80), dtype=np.uint8)
    for x0, y0, x1, y1 in blocks:
        mask[y0:y1, x0:x1] = 255
    return mask


def test_separate_blocks_become_separate_pieces() -> None:
    mask = _mask_with_blocks([(2, 2, 12, 12), (30, 20, 45, 40)])

    pieces = find_pieces(mask, merge_radius=2, min_area=10)

    assert [p.box for p in pieces] == [(2, 2, 12, 12), (30, 20, 45, 40)]


def test_nearby_blocks_merge_within_merge_radius() -> None:
    mask = _mask_with_blocks([(2, 2, 12, 12), (13, 2, 20, 12)])

    pieces = find_pieces(mask, merge_radius=2, min_area=10)

    assert pieces == [Piece(box=(2, 2, 20, 12))]


def test_tiny_specks_are_dropped() -> None:
    mask = _mask_with_blocks([(5, 5, 7, 7), (30, 30, 50, 50)])

    pieces = find_pieces(mask, merge_radius=1, min_area=20)

    assert [p.box for p in pieces] == [(30, 30, 50, 50)]


def test_piece_alpha_excludes_neighbours_inside_its_box() -> None:
    from scripts.sprites.components import extract_piece_masks

    mask = _mask_with_blocks([(2, 2, 12, 12), (14, 2, 24, 12)])
    mask[2:12, 14:24] = 0  # second block is separate, first block fills its own box only
    pieces = extract_piece_masks(mask, merge_radius=0, min_area=10)

    assert pieces[0].alpha.shape == (10, 10)
    assert pieces[0].alpha.all()


def test_reading_order_groups_rows_before_columns() -> None:
    from scripts.sprites.components import Piece, sort_reading_order

    # Row one has slightly ragged tops (42..49); row two starts lower.
    shuffled = [
        Piece(box=(402, 44, 500, 300)),
        Piece(box=(204, 42, 340, 300)),
        Piece(box=(24, 44, 160, 300)),
        Piece(box=(24, 416, 160, 670)),
        Piece(box=(204, 411, 340, 668)),
    ]

    ordered = sort_reading_order(shuffled)

    assert [p.box[0] for p in ordered] == [24, 204, 402, 24, 204]
