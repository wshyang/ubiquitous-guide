# Decisions register (addenda)

Sequentially numbered, never renumbered. Each entry: what was decided, why, which part of the
work it relates to, and what a future reader must know.

## ADR-001 — Adopt GREENFIELD.md as the coding discipline
- **Decided:** `GREENFIELD.md` is copied verbatim to the repo root; `CLAUDE.md` is the project
  index that fills its placeholders. `docs/FDS_BUILDER.md` (from the same greenfield repository) is
  kept as a reference for writing functional specs, not as an enforced rule.
- **Why:** the user asked for it explicitly; it gives one place for test, structure and
  decision-recording rules.
- **Impact:** §§4–5 and §10 are deferred (see ADR-006).

## ADR-002 — Exact duplicates removed, near duplicates kept
- **Decided:** byte-identical files are removed (`scripts/dedup_images.py --apply`). Two pairs were
  identical: `Gemini_..._1t2nkv1t2nkv1t2n (1).jpeg` and `Gemini_..._n64hnkn64hnkn64h (1).jpeg`.
  Near-duplicates (difference hash distance ≤ 10) are reported for review but not deleted:
  - `1t2n` vs `7x6c`: same stadium layout, different sky (kept both).
  - `2jlj` vs `on5i`: same scene, `on5i` has people and boats added (kept both; `on5i` is the
    populated reference).
- **Impact:** originals were moved into `src/images/` with descriptive names
  (`backdrops/`, `sprite-sheets/`, `reference/`). Checksums of the kept files match the originals.

## ADR-003 — Magenta chroma key with soft alpha and despill
- **Decided:** the key measures `min(R, B) − G`. Alpha ramps from opaque at 60 to transparent at
  140. Edge pixels are despilled (magenta removed from red and blue in proportion to
  transparency).
- **Why:** hard thresholds left pink halos on anti-aliased edges; the ramp keeps pink-lilac
  sprites (the lilac dragon boat and the pink kayak) opaque.
- **Impact:** backdrops are never keyed; only sprite sheets go through the key.

## ADR-004 — Sprite extraction by named regions, reading-order labels
- **Decided:** each sheet is described in `scripts/sprites/sheets.json` as named regions. Pieces are
  connected components (merge radius 3–4 px) inside each region, sorted into rows (banded by
  vertical centre), then left to right. Labels from the config are applied in that order;
  unlabelled pieces are `<prefix>_NN`.
- **Why:** the sheets are generated art with no metadata; a region plan is the most reliable way
  to get meaningful names. Plain top-to-bottom sorting interleaved ragged rows (found during the
  kids sheet review), so banding was added with a test.
- **Impact:** text headings in the effects sheets fall outside the regions. Regions can be
  re-cut without touching code. Output: `public/assets/sprites/<sheet>/` with `manifest.json`.

## ADR-005 — Composite anchors are calibrated by review, not measured
- **Decided:** each composite class has a module (`scripts/composites/kayak.py`,
  `dragon_boat.py`) with anchor tables. Kayaks get one wood paddle per seat, grip pinned to the
  paddler's hand, with a catch angle (blade forward) and a pull angle (blade back). Dragon boats get
  a stern wake and waterline anchors; their rowers already hold paddle shafts, so no oars are
  overlaid on them.
- **Calibration log:**
  1. First pass: grips were about 9 px right of the hands on the 2-seat hull and about 25 px too
     high on the 1-seat hull.
  2. Second pass: 1-seat hand moved to (0.48, 0.60); 2-seat hands at x 0.40 and 0.58, y 0.41. The
     3-seat layout (0.34, 0.53, 0.71; y 0.41) was checked at 3x and the grips sit on the hands.
- **Impact:** composites are generated into `public/assets/composites/{kayaks,dragon-boats}/` with
  anchors in each manifest. The app spawns splashes at the blade tip anchors' world positions.

## ADR-006 — Deferred GREENFIELD sections
- **Decided:** no database, ORM, migrations (§§4–5), no Dockerfiles or SHIP-HATS pipeline (§10).
- **Why:** the deliverable is a static canvas app built from local assets. There is no backend,
  persistence or deployment target yet.
- **Impact:** revisit when any of those exist; this entry should then be superseded by a new one.

## ADR-007 — Scene timing is a pure function of simulated time
- **Decided:** stroke period 1.6 s (catch then pull), walk cycle 560 ms, cheer every 6.4 s for
  1 s, splash lifetime 420 ms, boats wrap across the stage. `?t=<ms>` freezes the clock.
- **Why:** deterministic frames make the calibration screenshots reproducible and let unit tests
  cover the animation maths without a browser.
- **Impact:** layout values that the user may tune live in `src/scene/layout.ts`.
