# SPEC.md — The Kallang Scene (living functional spec)

Source of truth for what this repository ships. Decisions not dictated by the
base spec are recorded as **sequentially-numbered addenda** in the Addenda
register at the bottom (GREENFIELD.md §1). Addenda are written in the same
change that makes the decision.

## 1. Purpose

Deliver a browser scene of The Kallang waterfront, populated from archived
AI-generated art, with sprites animated in loops (boats rowing across the
water, clouds drifting, characters moving along the promenade, event props
dressing the grounds).

## 2. Source art contract

- `src/images/` is the immutable archive: deduplicated, meaningful filenames,
  grouped into `backdrops/`, `sheets/`, `reference/`.
- Every file in the archive must be unique — byte-level (sha256) and
  perceptual (dHash) — enforced by `scripts/verify_art_uniqueness.py`.
- Sprite sheets carry a **magenta backing** (approx. RGB 255/0/255) that must
  be matted out to alpha when cutting pieces.

## 3. Extraction (sprite cutting)

- `scripts/extract_sprites.py` cuts each sheet's pieces into
  `public/sprites/<object-class>/` (public URL path `/sprites/…`).
- Output: transparent PNGs + `public/sprites/manifest.json` listing every
  piece (class, source sheet, pixel bbox, file, dimensions).
- Piece naming: `<class>-<index>.png`, zero-padded, stable across runs.
- Section titles drawn on the sheet are excluded, never emitted as pieces.

## 4. Composite objects (boats + oars)

- Object classes: `dragon-boat`, `kayak` (solo/double/triple paddler hulls).
- Each class has its own stitch module under `scripts/composites/` that:
  1. overlays oars/paddles onto the hull at configured anchor points,
  2. emits the stitched PNG plus `<class>/anchors.json` with normalized
     (0–1) anchor coordinates, oar pivot, rest angle, and z-order.
- Anchors are the contract the web app uses to pivot oars during animation.

## 5. Scene web app

- Static app at `public/index.html`, ES modules under `public/app/`.
- Layers, bottom → top: backdrop → clouds → far promenade props → water
  traffic (boats, wakes, splashes) → near promenade (characters, props).
- Animation: deterministic (seeded RNG), fixed-timestep loops; per-class
  cycle rates (walk cycle, oar stroke, splash, cloud drift).
- Sprite variation: boats vary hull color/speed/lane/direction; walkers vary
  shirt color/path/cycle phase; clouds vary sprite/scale/speed.
- Interactive controls (where present) carry `data-testid` attributes.

## 6. Validation

- Python layer: `pytest` (extraction/composite/uniqueness tests run against
  real generated fixtures; no mocks of the image data itself).
- JS layer: `node --test` for pure logic (loops, seeded RNG, anchor math).
- Honest reporting: every validation claim names the layer actually run.

---

## Addenda register

### A1 — Adopt GREENFIELD.md as project discipline
- **Decided:** upstream `wshyang/greenfield/GREENFIELD.md` copied verbatim to
  `GREENFIELD.md`; contextualised index written as `CLAUDE.md`.
- **Why:** the team wants the greenfield conventions (decision records,
  tests-first, function design, container contract) as the standing discipline.
- **Spec §:** 0 (meta).
- **Impact:** all future changes follow CLAUDE.md standing instructions;
  every non-obvious decision lands here in the same change.

### A2 — Dedup + filing of root-level art
- **Decided:** two byte-identical duplicates (`…(1).jpeg` of the magenta-sky
  backdrop and of the water/event sheet) deleted; the 11 unique files renamed
  and filed into `src/images/{backdrops,sheets,reference}` with meaningful
  names; `verify_art_uniqueness.py` added as the standing dedup gate.
- **Why:** Gemini exports collided two pairs; cryptic hash filenames don't
  communicate object classes.
- **Spec §:** 2.
- **Impact:** sheet-to-pipeline paths are stable; the gate must pass in CI
  before any pipeline change merges.

### A3 — Sprite extraction contract
- **Decided:** `scripts/extract_sprites.py` cuts all five sheets into
  `public/sprites/<class>/` (401 pieces, 33 classes) with a deterministic
  manifest. Magenta matting uses distance-to-border-median colour with a
  [65,120] alpha feather; pieces are bbox crops (a crop may *enclose* a
  smaller component — e.g. the table under a tent, the flag inside a balloon
  arch — which makes each piece a self-contained dressing variant; this is
  intended). Class bands are centre-based, first-match-wins, tuned via
  `--report` + debug overlays; sheet titles/labels are excluded boxes.
- **Why:** pieces feed the animation layer; the manifest is the public
  contract (`/sprites/…` URL per piece).
- **Spec §:** 3.
- **Impact:** global per-class numbering spans both water/props sheet
  variants (e.g. `tent-00..06` = variant A, `tent-07..16` = variant B);
  regeneration must stay byte-identical (pytest enforces this).

### A4 — Composite stitching modules and anchor contract
- **Decided:** per-class stitch modules under `scripts/composites/`
  (`dragon_boat.py`, `kayak.py`, shared `geometry.py`, CLI `build_all.py`),
  each owning a single `*Config` dataclass holding every magic number.
  Dragon boats: 10 evenly-spaced gunwale anchors (rower_x0/x1, anchor_y),
  one vertical oar per anchor, rest rake -26° CW (blade trails aft), pivot on
  the shaft where the oarlock sits. Small boats: one horizontal double-paddle
  per paddler (hand_x fractions per layout), forward blade dipped (-14° CW).
  `anchors.json` per class: anchors normalised to hull size, pivots in sprite
  pixels, composite/hull offsets, rest angle, and stroke hints
  (swing_deg/fps) for the animation layer.
- **Why:** the scene needs machine-readable stitch points to animate oars;
  the composite PNG is the inspected artefact of the tuning loop
  (render → view → adjust config → render).
- **Spec §:** 4.
- **Impact:** hull sprites stay oar-free under `/sprites/`; animated boats
  stitch at runtime from anchors, while `/composites/<class>/<variant>.png`
  is the pre-stitched reference (also usable as static art).

### A5 — Scene app build, placement tuning, and verification scope
- **Decided:** `public/app/scene-config.json` is the single source of truth
  (world 2752×1536, seed, backdrops, lanes, boats, walkers, cheerers,
  ripples, pose tables, 29 prop placements, animation params); modules split
  as `rng / animation / scene / render / assets / main` (pure builders vs.
  DOM), no bundler. `scripts/scene_preview.py` mirrors the JS builders
  bit-for-bit (mulberry32 verified identical against node) to render
  placement previews under `work/debug/scene/`. Placement rules derived from
  measured backdrop pixels: all boat lanes sit at y ≥ 1355 because the quay
  face runs down to y≈1352 for x 1900–2700; lanes use equal per-lane speeds
  (55/45 px/s) so boats never pass through each other; lane direction comes
  from the lane; ripple slots use an x-grid with y constrained beside the
  quay (y ≥ 1445 for x > 1780, else the open strip 1160–1330). Cloud bands
  are restricted to the sky above the stadium. `scripts/serve.py` confines
  each route to its own root (`/`, `/app`, `/sprites`, `/composites`,
  `/images → src/images`) — a repo-root check proved insufficient when
  `/sprites/../../.git/config` escaped; `tests/test_serve.py` pins this.
- **Why:** the final artefact must be the whole animated scene; eyeballed
  coordinates were wrong before (A3 lesson), so placement is measured and
  preview-inspected (render → view → adjust) with the same config the app
  loads.
- **Spec §:** 5, 6.
- **Impact:** `dev.sh` runs both gates then serves 0.0.0.0:3000; verification
  is honestly scoped — no browser exists in this environment, so correctness
  claims rest on 434/434 served URLs, node module import + buildScene
  determinism, 28 node tests, 28 pytest tests, and PIL previews of the same
  seeded state; in-browser animation itself is not screenshot-verified here.
