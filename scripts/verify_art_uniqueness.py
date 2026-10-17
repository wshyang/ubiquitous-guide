#!/usr/bin/env python3
"""Dedup gate for the source-art archive (SPEC §2).

Fails when any two files under src/images/ are byte-identical (sha256) or
perceptually identical (dHash hamming distance == 0). Prints the full
uniqueness report so a reviewer can see every file's digests.
"""
from __future__ import annotations

import hashlib
import sys
from dataclasses import dataclass
from pathlib import Path

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[1]
ART_ROOT = REPO_ROOT / "src" / "images"
HASH_SIZE = 8  # dHash: 8x8 -> 64 bits


@dataclass(frozen=True)
class ArtDigest:
    """Digest bundle for one archive file."""

    path: Path
    sha256: str
    dhash: int


def iter_art_files(root: Path = ART_ROOT) -> list[Path]:
    """Return every image file in the archive, sorted for stable reports."""
    exts = {".jpeg", ".jpg", ".png", ".webp", ".gif"}
    return sorted(p for p in root.rglob("*") if p.suffix.lower() in exts)


def sha256_of(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def dhash_of(path: Path, size: int = HASH_SIZE) -> int:
    """Difference hash: resize to (size+1, size) greyscale, compare neighbours."""
    with Image.open(path) as im:
        small = im.convert("L").resize((size + 1, size), Image.LANCZOS)
        bits = 0
        for y in range(size):
            for x in range(size):
                left = small.getpixel((x, y))
                right = small.getpixel((x + 1, y))
                bits = (bits << 1) | (1 if left > right else 0)
        return bits


def digest_art(root: Path = ART_ROOT) -> list[ArtDigest]:
    return [ArtDigest(p, sha256_of(p), dhash_of(p)) for p in iter_art_files(root)]


def find_byte_duplicates(digests: list[ArtDigest]) -> list[tuple[ArtDigest, ArtDigest]]:
    return _pairs_with(digests, lambda a, b: a.sha256 == b.sha256)


def find_perceptual_duplicates(digests: list[ArtDigest]) -> list[tuple[ArtDigest, ArtDigest]]:
    return _pairs_with(digests, lambda a, b: _hamming(a.dhash, b.dhash) == 0)


def _pairs_with(digests, predicate) -> list[tuple[ArtDigest, ArtDigest]]:
    pairs = []
    for i, a in enumerate(digests):
        for b in digests[i + 1 :]:
            if predicate(a, b):
                pairs.append((a, b))
    return pairs


def _hamming(a: int, b: int) -> int:
    return (a ^ b).bit_count()


def format_report(digests: list[ArtDigest]) -> str:
    lines = [f"{d.path.relative_to(REPO_ROOT)}  sha256={d.sha256[:16]}…  dhash={d.dhash:016x}" for d in digests]
    return "\n".join(lines)


def run_gate(root: Path = ART_ROOT) -> int:
    digests = digest_art(root)
    if not digests:
        print("FAIL: no art files found", file=sys.stderr)
        return 1
    byte_dupes = find_byte_duplicates(digests)
    percept_dupes = find_perceptual_duplicates(digests)
    print(format_report(digests))
    print(f"\n{len(digests)} files checked; "
          f"{len(byte_dupes)} byte-duplicates; {len(percept_dupes)} perceptual-duplicates")
    for a, b in byte_dupes + percept_dupes:
        print(f"DUPLICATE: {a.path} == {b.path}", file=sys.stderr)
    return 1 if (byte_dupes or percept_dupes) else 0


if __name__ == "__main__":
    sys.exit(run_gate())
