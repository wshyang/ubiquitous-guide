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
