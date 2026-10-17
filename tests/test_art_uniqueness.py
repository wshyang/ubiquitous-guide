"""SPEC §2 gate: the source-art archive must contain only unique files."""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import verify_art_uniqueness as gate  # noqa: E402


def test_archive_has_expected_file_count():
    files = gate.iter_art_files()
    assert len(files) == 11, f"archive should hold 11 unique files, found {len(files)}"


def test_archive_layout_is_meaningful():
    rel = {str(p.relative_to(gate.ART_ROOT)) for p in gate.iter_art_files()}
    assert "backdrops/kallang-daylight.jpeg" in rel
    assert "sheets/boats-and-oars.jpeg" in rel
    assert "reference/national-stadium-photo.png" in rel
    assert not any("Gemini_Generated" in r for r in rel), "cryptic export names must be gone"
    assert not any("(1)" in r for r in rel), "duplicate-suffix files must be gone"


def test_no_byte_duplicates():
    assert gate.find_byte_duplicates(gate.digest_art()) == []


def test_no_perceptual_duplicates():
    assert gate.find_perceptual_duplicates(gate.digest_art()) == []


def test_gate_passes_end_to_end():
    assert gate.run_gate() == 0
