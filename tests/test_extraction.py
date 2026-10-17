"""SPEC §3: sprite extraction — manifest contract, alpha purity, determinism."""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = REPO_ROOT / "scripts" / "extract_sprites.py"
MANIFEST = REPO_ROOT / "public" / "sprites" / "manifest.json"
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import extract_sprites as ex  # noqa: E402


@pytest.fixture(scope="module")
def manifest() -> dict:
    assert MANIFEST.exists(), "run `python scripts/extract_sprites.py` first"
    return json.loads(MANIFEST.read_text())


def test_manifest_pieces_exist_and_are_reachable(manifest):
    for piece in manifest["pieces"]:
        path = REPO_ROOT / piece["path"]
        assert path.is_file(), f"missing {piece['path']}"
        assert piece["url"] == f"/sprites/{piece['class']}/{path.name}"


def test_manifest_urls_are_unique(manifest):
    urls = [p["url"] for p in manifest["pieces"]]
    assert len(urls) == len(set(urls))
    assert all(re.fullmatch(r"/sprites/[\w-]+/[\w-]+-\d{2}\.png", u) for u in urls)


def test_every_class_directory_matches_manifest(manifest):
    sprite_root = REPO_ROOT / "public" / "sprites"
    dirs = {p.name for p in sprite_root.iterdir() if p.is_dir()}
    assert dirs == set(manifest["classes"])
    for cls in dirs:
        files = {f"{cls}-{i:02d}.png" for i in range(len([p for p in manifest["pieces"] if p["class"] == cls]))}
        assert {f.name for f in (sprite_root / cls).iterdir()} == files


def test_character_class_counts():
    counts = {"character-red": 12, "character-blue": 12, "character-green": 12,
              "character-yellow": 12, "character-orange": 13, "character-purple": 13}
    pieces = json.loads(MANIFEST.read_text())["pieces"]
    got = {c: len([p for p in pieces if p["class"] == c]) for c in counts}
    assert got == counts


def test_boats_and_oars_class_counts():
    counts = {"dragon-boat": 6, "small-boat": 12, "oar-wood": 35,
              "paddle-double": 12, "paddle-vertical": 12, "water-fx": 10}
    pieces = json.loads(MANIFEST.read_text())["pieces"]
    got = {c: len([p for p in pieces if p["class"] == c]) for c in counts}
    assert got == counts


def test_no_opaque_magenta_leak_in_any_piece(manifest):
    """Feather must not leave opaque magenta (R,G,B near 255/0/255) on edges."""
    leaks = []
    for piece in manifest["pieces"]:
        rgba = np.asarray(Image.open(REPO_ROOT / piece["path"]))
        rgb, alpha = rgba[..., :3].astype(int), rgba[..., 3]
        hot = (rgb[..., 0] > 190) & (rgb[..., 2] > 190) & (rgb[..., 1] < 70) & (alpha >= 200)
        if hot.any():
            leaks.append(f"{piece['name']}: {int(hot.sum())} opaque magenta px")
    assert not leaks, leaks


def test_pieces_have_transparent_background(manifest):
    """Every piece must cut (alpha=0), keep a solid body, and not be solid-frame."""
    for piece in manifest["pieces"]:
        alpha = np.asarray(Image.open(REPO_ROOT / piece["path"]))[..., 3]
        assert alpha.min() == 0, piece["name"]
        assert (alpha == 255).any(), piece["name"]
        # Thin ring-arc fragments legitimately have little solid area.
        assert (alpha == 255).mean() > 0.08, piece["name"]


def test_synthetic_sheet_extracts_two_pieces(tmp_path):
    """End-to-end on a generated fixture: two blocks on magenta -> two cuts."""
    sheet = tmp_path / "fixture.jpeg"
    arr = np.zeros((400, 600, 3), dtype=np.uint8)
    arr[:] = (255, 0, 255)
    arr[40:160, 30:180] = (200, 40, 40)     # red block
    arr[220:360, 300:560] = (40, 80, 200)   # blue block
    Image.fromarray(arr).save(sheet, quality=95)
    rgb = ex.load_rgb(sheet)
    alpha = ex.alpha_from_backdrop(rgb, ex.estimate_bg_color(rgb))
    spec = ex.SheetSpec("fixture", 500, (ex.ClassSpec("block", (0.0, 1.0)),))
    labels, n = ex.label_components(alpha, spec)
    boxes = ex.component_boxes(labels, n)
    assert n == 2 and len(boxes) == 2
    assigned, unassigned = ex.assign_classes(boxes, spec, alpha.shape)
    assert unassigned == []
    cuts = ex.build_cuts(assigned, spec, rgb, alpha)
    assert len(cuts) == 2
    for cut in cuts:
        center = cut.alpha[(cut.bbox[1] + cut.bbox[3]) // 2, (cut.bbox[0] + cut.bbox[2]) // 2]
        assert center == 255
    corner = cuts[0].alpha[0, 0]
    assert corner == 0


def test_extraction_is_deterministic(tmp_path):
    """Same inputs -> byte-identical outputs (manifest + a sample piece)."""
    result = subprocess.run(
        [sys.executable, str(SCRIPT), "clouds", "--out", str(tmp_path)],
        capture_output=True, text=True, cwd=REPO_ROOT)
    assert result.returncode == 0, result.stdout + result.stderr
    fresh = json.loads((tmp_path / "manifest.json").read_text())
    committed = json.loads(MANIFEST.read_text())
    fresh_clouds = [p for p in fresh["pieces"] if p["class"].startswith("cloud")]
    committed_clouds = [p for p in committed["pieces"] if p["class"].startswith("cloud")]
    assert fresh_clouds == committed_clouds
    sample = fresh_clouds[0]
    assert (tmp_path / sample["class"] / Path(sample["path"]).name).read_bytes() == \
           (REPO_ROOT / sample["path"]).read_bytes()
