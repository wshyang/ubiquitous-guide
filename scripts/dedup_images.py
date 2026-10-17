"""Find duplicate artwork in the repository.

Exact duplicates are byte-identical files (SHA-256). Near duplicates are
visually almost identical images (64-bit difference hash, Hamming distance).

Usage:
    python -m scripts.dedup_images <dir> [--apply] [--max-distance N]

Without --apply the script only reports. With --apply it deletes the exact
duplicates, keeping the copy whose name has no " (N)" download suffix.
"""
from __future__ import annotations

import argparse
import hashlib
import re
from pathlib import Path

import numpy as np
from PIL import Image

HASH_SIZE = 8
DOWNLOAD_SUFFIX = re.compile(r"\s\(\d+\)(?=\.[^.]+$)")
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


def sha256_of(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def difference_hash(path: Path) -> np.ndarray:
    """Return a 64-bit boolean difference hash of the image at ``path``."""
    with Image.open(path) as img:
        grey = img.convert("L").resize((HASH_SIZE + 1, HASH_SIZE), Image.LANCZOS)
    pixels = np.asarray(grey, dtype=np.int16)
    return (pixels[:, 1:] > pixels[:, :-1]).flatten()


def find_exact_duplicates(paths: list[Path]) -> list[list[Path]]:
    by_digest: dict[str, list[Path]] = {}
    for path in paths:
        by_digest.setdefault(sha256_of(path), []).append(path)
    return [group for group in by_digest.values() if len(group) > 1]


def find_near_duplicates(paths: list[Path], max_distance: int) -> list[list[Path]]:
    hashes = {path: difference_hash(path) for path in paths}
    parent = {path: path for path in paths}

    def root(path: Path) -> Path:
        while parent[path] != path:
            parent[path] = parent[parent[path]]
            path = parent[path]
        return path

    for i, first in enumerate(paths):
        for second in paths[i + 1 :]:
            distance = int(np.count_nonzero(hashes[first] != hashes[second]))
            if distance <= max_distance:
                parent[root(first)] = root(second)

    clusters: dict[Path, list[Path]] = {}
    for path in paths:
        clusters.setdefault(root(path), []).append(path)
    return [group for group in clusters.values() if len(group) > 1]


def prefer_keeper(group: list[Path]) -> Path:
    """Keep the copy without a ' (N)' download suffix, then the shortest name."""
    return sorted(group, key=lambda p: (bool(DOWNLOAD_SUFFIX.search(p.name)), len(p.name), p.name))[0]


def collect_images(directory: Path) -> list[Path]:
    return sorted(p for p in directory.iterdir() if p.suffix.lower() in IMAGE_SUFFIXES and p.is_file())


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("directory", type=Path)
    parser.add_argument("--apply", action="store_true", help="delete exact duplicates")
    parser.add_argument("--max-distance", type=int, default=10)
    args = parser.parse_args()

    images = collect_images(args.directory)
    for group in find_exact_duplicates(images):
        keeper = prefer_keeper(group)
        for dup in group:
            if dup != keeper:
                print(f"EXACT  remove {dup.name}  (identical to {keeper.name})")
                if args.apply:
                    dup.unlink()
    remaining = collect_images(args.directory) if args.apply else images
    for group in find_near_duplicates(remaining, args.max_distance):
        print("NEAR   " + " <-> ".join(p.name for p in group) + "  (review manually)")


if __name__ == "__main__":
    main()
