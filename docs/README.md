# Ubiquitous Guide — Kallang Diorama

## Overview
Pixel-art animated diorama of the Kallang Sports Hub waterfront, built from 11 deduped source artworks (magenta-backed sprite sheets + backdrops) into a Vite React SPA with 491 extracted sprites.

## Greenfield Discipline
Adopted `wshyang/greenfield` as coding discipline: `CLAUDE.md` + `FDS_BUILDER.md` copied to repo root, addenda register at `docs/specs/addenda-register.md`. Living spec + tests-first + isolation + ORM discipline per GREENFIELD.md §1-10.

## Deliverables Mapped

1. **Dedup** — `docs/specs/dedup-report.md` + `git log` shows removal of 2 byte-identical duplicates (SHA256 verified), 11 uniques retained
2. **Filing** — `src/images/` with meaningful filenames (backdrop-kallang-*, sprites-*, reference-photo-*)
3. **Extraction** — `scripts/extract_sprites.py` (PIL+numpy, magenta chroma key ±55, BFS connected components, alpha falloff) → `public/sprites/{characters,boats,clouds,waterfx,props}/` (491 PNGs) + `public/sprites/organized/` semantic aliases + `public/sprites/manifest.json` + `public/images/` public copy
4. **Composite overlay** — `src/components/boats/anchors.js` + `DragonBoat.jsx` + `Kayak.jsx` modularised per object class, anchor points painstakingly measured via `scripts/test_anchor_overlay.py` iterative screenshots (`/tmp/dragon_v*.png`, `/tmp/kayak_v1.png`) logged in `docs/iterations/anchor-iterations.md`, lab mode `?lab=1` for slider experimentation, debug `?debugAnchors=1`
5. **Web app** — `src/components/Scene.jsx` layered sky/stadium/promenade/water with CSS keyframe loops (drift, oar-row, paddle-kayak, bob, wave, splash), varying sprites via staggered delays + colour variants, documented in `docs/specs/scene-spec.md`

## Run

```bash
npm install
npm run extract   # regenerate public/sprites from src/images
npm run dev       # vite at http://localhost:5173
npm run build     # dist/
```

- Lab: http://localhost:5173/?lab=1
- Debug anchors: http://localhost:5173/?debugAnchors=1
- Manifest: http://localhost:5173/sprites/manifest.json
- Organized sprites: http://localhost:5173/sprites/organized/dragonboat-red.png etc.
- Originals: http://localhost:5173/images/backdrop-*.jpg

## Public URL Paths
All extracted pieces publicly accessible via Vite `public/` → site root. See `docs/specs/scene-spec.md#public-url-paths`.

## Tech
Vite 5 + React 19 + Tailwind 3, pixelated rendering, CSS transforms, no mock data layer.

## Deployment
Dockerfile template from greenfield `initial-templates/` available; `dist/` is static hostable.
