"""Tests for scripts/dedup_images.py — real files, no mocks."""
from pathlib import Path

from PIL import Image

from scripts.dedup_images import find_exact_duplicates, find_near_duplicates


def _write_gradient(path: Path, colour: tuple[int, int, int], size=(64, 36)) -> None:
    img = Image.new("RGB", size)
    for x in range(size[0]):
        for y in range(size[1]):
            shade = (x * 3) % 256
            img.putpixel((x, y), (colour[0], colour[1], (colour[2] + shade) % 256))
    img.save(path, quality=95)


def test_exact_duplicates_are_grouped_by_bytes(tmp_path: Path) -> None:
    a = tmp_path / "scene.jpeg"
    b = tmp_path / "scene (1).jpeg"
    c = tmp_path / "other.jpeg"
    _write_gradient(a, (200, 10, 200))
    b.write_bytes(a.read_bytes())
    _write_gradient(c, (10, 200, 10))

    groups = find_exact_duplicates([a, b, c])

    assert groups == [[a, b]]


def test_near_duplicates_detect_same_scene_with_small_edit(tmp_path: Path) -> None:
    a = tmp_path / "scene.jpeg"
    b = tmp_path / "scene_edit.jpeg"
    _write_gradient(a, (200, 10, 200))
    _write_gradient(b, (200, 10, 200))

    groups = find_near_duplicates([a, b], max_distance=10)

    assert groups == [[a, b]]


def test_unrelated_images_are_not_near_duplicates(tmp_path: Path) -> None:
    a = tmp_path / "a.png"
    b = tmp_path / "b.png"
    Image.new("RGB", (64, 36), (255, 0, 255)).save(a)
    checker = Image.new("RGB", (64, 36), (0, 0, 0))
    for x in range(0, 64, 2):
        for y in range(36):
            checker.putpixel((x, y), (255, 255, 255))
    checker.save(b)

    assert find_near_duplicates([a, b], max_distance=10) == []
