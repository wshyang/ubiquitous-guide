"""Cut individual sprites out of magenta-backed sheets.

Usage:
    python -m scripts.sprites.extract [--config scripts/sprites/sheets.json] [--only ID]

For every sheet listed in the config this writes one transparent PNG per piece
into the sheet's output directory, plus a manifest.json describing each piece
(source box, pixel size, and piece name). Output is served from /public, so the
app loads sprites from /assets/sprites/<sheet-dir>/<name>.png.
"""
from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image

from scripts.sprites.chromakey import alpha_from_magenta, unmix_magenta
from scripts.sprites.components import PieceMask, extract_piece_masks

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = REPO_ROOT / "scripts" / "sprites" / "sheets.json"


@dataclass(frozen=True)
class Region:
    prefix: str
    box: tuple[int, int, int, int]
    labels: list[str] | None


@dataclass(frozen=True)
class SheetPlan:
    sheet_id: str
    source: Path
    output_dir: Path
    merge_radius: int
    min_area: int
    regions: list[Region]


def load_plans(config_path: Path) -> list[SheetPlan]:
    raw = json.loads(config_path.read_text())
    return [_parse_sheet(entry) for entry in raw["sheets"]]


def _parse_sheet(entry: dict) -> SheetPlan:
    return SheetPlan(
        sheet_id=entry["id"],
        source=REPO_ROOT / entry["source"],
        output_dir=REPO_ROOT / entry["output_dir"],
        merge_radius=entry["merge_radius"],
        min_area=entry["min_area"],
        regions=[_parse_region(r) for r in entry["regions"]],
    )


def _parse_region(entry: dict) -> Region:
    return Region(prefix=entry["prefix"], box=tuple(entry["box"]), labels=entry.get("labels"))


def piece_name(region: Region, index: int) -> str:
    if region.labels is not None and index < len(region.labels):
        return region.labels[index]
    return f"{region.prefix}_{index:02d}"


def render_piece(rgb: np.ndarray, piece: PieceMask) -> Image.Image:
    x0, y0, x1, y1 = piece.box
    colours = unmix_magenta(rgb[y0:y1, x0:x1], piece.alpha)
    rgba = np.dstack([colours, piece.alpha])
    return Image.fromarray(rgba, mode="RGBA")


def extract_region(rgb: np.ndarray, plan: SheetPlan, region: Region) -> list[dict]:
    x0, y0, x1, y1 = region.box
    sub_rgb = rgb[y0:y1, x0:x1]
    alpha = alpha_from_magenta(sub_rgb)
    pieces = extract_piece_masks(alpha, plan.merge_radius, plan.min_area)
    entries = []
    for index, piece in enumerate(pieces):
        name = piece_name(region, index)
        render_piece(sub_rgb, piece).save(plan.output_dir / f"{name}.png", optimize=True)
        px0, py0, px1, py1 = piece.box
        entries.append({
            "name": name,
            "file": f"{name}.png",
            "source_box": [x0 + px0, y0 + py0, x0 + px1, y0 + py1],
            "width": px1 - px0,
            "height": py1 - py0,
        })
    return entries


def extract_sheet(plan: SheetPlan) -> list[dict]:
    rgb = np.asarray(Image.open(plan.source).convert("RGB"))
    plan.output_dir.mkdir(parents=True, exist_ok=True)
    entries: list[dict] = []
    for region in plan.regions:
        entries.extend(extract_region(rgb, plan, region))
    (plan.output_dir / "manifest.json").write_text(json.dumps({"sheet": plan.sheet_id, "source": str(plan.source.relative_to(REPO_ROOT)), "pieces": entries}, indent=2) + "\n")
    return entries


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--only", help="extract only the sheet with this id")
    args = parser.parse_args()
    for plan in load_plans(args.config):
        if args.only and plan.sheet_id != args.only:
            continue
        entries = extract_sheet(plan)
        print(f"{plan.sheet_id}: {len(entries)} pieces -> {plan.output_dir.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
