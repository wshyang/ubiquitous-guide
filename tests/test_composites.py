"""SPEC §4: composite stitching — anchors contract, hull coverage, determinism."""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from composites import dragon_boat, geometry as geo, kayak  # noqa: E402

SPRITES = REPO_ROOT / "public" / "sprites"
COMPOSITES = REPO_ROOT / "public" / "composites"


@pytest.fixture(scope="module")
def manifest() -> dict:
    assert (COMPOSITES / "manifest.json").exists(), "run scripts/composites/build_all.py first"
    return json.loads((COMPOSITES / "manifest.json").read_text())


def test_manifest_references_resolve(manifest):
    for cls_name, variants in manifest["detail"].items():
        for name, entry in variants.items():
            for key in ("hull", "composite", "oar_sprite", "paddle_sprite"):
                if key in entry:
                    assert (REPO_ROOT / "public" / entry[key][1:]).is_file(), f"{name}: {key}"
            assert len(entry["anchors"]) >= 1


def test_dragon_boats_have_ten_normalised_anchors(manifest):
    variants = manifest["detail"]["dragon-boat"]
    assert len(variants) == 6
    for name, entry in variants.items():
        assert len(entry["anchors"]) == 10, name
        for a in entry["anchors"]:
            assert 0.0 <= a["x"] <= 1.0 and 0.0 <= a["y"] <= 1.0, (name, a)
        assert entry["stroke"]["swing_deg"] > 0 and entry["stroke"]["fps"] > 0


def test_small_boat_paddler_counts(manifest):
    expected = {"red-solo": 1, "red-solo-b": 1, "yellow-solo": 1, "yellow-solo-b": 1,
                "green-double": 2, "green-double-b": 2, "blue-double": 2, "blue-double-b": 2,
                "purple-triple": 3, "purple-triple-b": 3, "orange-double": 2, "pink-triple": 3}
    variants = manifest["detail"]["small-boat"]
    assert {n.removeprefix("small-boat-"): len(e["anchors"]) for n, e in variants.items()} == expected


def test_composite_contains_stitched_oars_outside_hull_silhouette(manifest):
    """Oars/paddles must add real pixels beyond the bare hull silhouette."""
    for cls_name, variants in manifest["detail"].items():
        for name, entry in variants.items():
            comp = np.asarray(Image.open(REPO_ROOT / "public" / entry["composite"][1:]))
            hull = np.asarray(Image.open(REPO_ROOT / "public" / entry["hull"][1:]))
            padded = np.zeros_like(comp)
            ox, oy = entry["hull_offset"]
            padded[oy:oy + hull.shape[0], ox:ox + hull.shape[1]] = hull
            added = int(((padded[..., 3] < 50) & (comp[..., 3] > 200)).sum())
            assert added > 1000, f"{name}: only {added} px stitched outside hull"


def test_dragon_blades_reach_below_hull(manifest):
    """Dragon oars dip past the keel — blade pixels under the hull bottom row."""
    for name, entry in manifest["detail"]["dragon-boat"].items():
        composite = np.asarray(Image.open(REPO_ROOT / "public" / entry["composite"][1:]))
        hull_bottom = entry["hull_offset"][1] + entry["hull_size"][1]
        below = composite[hull_bottom + 2:, :, 3]
        assert int((below > 200).sum()) > 5000, f"{name}: blades do not clear the keel"


def test_composite_is_larger_than_hull(manifest):
    for variants in manifest["detail"].values():
        for entry in variants.values():
            assert entry["composite_size"][1] > entry["hull_size"][1]
            assert entry["composite_size"][0] >= entry["hull_size"][0]


def test_rotated_pivot_identity_at_zero_angle():
    pivot = (10.0, 20.0)
    assert geo.rotated_pivot(pivot, 0.0, (100, 50), (100, 50)) == pivot
    grown = geo.rotated_pivot(pivot, 30.0, (100, 50), (140, 90))
    assert grown == (10.0 + 20.0, 20.0 + 20.0)


def test_rotate_point_is_clockwise_in_image_coords():
    x, y = geo.rotate_point((1.0, 0.0), 90.0)
    assert math.isclose(x, 0.0, abs_tol=1e-9) and math.isclose(y, 1.0, abs_tol=1e-9)


def test_stitch_places_pivot_exactly_on_anchor():
    base = Image.new("RGBA", (200, 200), (0, 0, 0, 0))
    sprite = Image.new("RGBA", (40, 60), (255, 0, 0, 255))
    pivot = (20.0, 30.0)
    anchor = (100.0, 120.0)
    out = geo.stitch_at(base, sprite, 35.0, pivot, anchor)
    arr = np.asarray(out)
    # The anchor pixel itself must be covered by the (rotated) sprite.
    assert arr[int(anchor[1]), int(anchor[0]), 3] == 255
    # Nothing may be drawn outside the base canvas (paste never grows it).
    assert out.size == base.size


def test_kayak_build_is_deterministic(tmp_path):
    result = kayak.build(SPRITES, tmp_path)
    committed = json.loads((COMPOSITES / "manifest.json").read_text())["detail"]["small-boat"]
    assert result["variants"] == committed
    sample = result["variants"]["small-boat-red-solo"]
    fresh = (tmp_path / "small-boat" / "small-boat-red-solo.png").read_bytes()
    assert fresh == (REPO_ROOT / "public" / sample["composite"][1:]).read_bytes()
