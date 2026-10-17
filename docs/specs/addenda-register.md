# Addenda Register — Ubiquitous Guide (Living Spec Additions)

This register records every decision not dictated by the base spec, per GREENFIELD.md §1 (Record every decision, up front, in a living spec).

Format: ID | Date | Decision | Why | Spec Section | Impact

## Addenda

### ADD-001 — 2026-10-17 — Adopt Greenfield Discipline
**What:** Copied wshyang/greenfield GREENFIELD.md as CLAUDE.md and FDS_BUILDER.md as doctrine. Established docs/specs + docs/addenda discipline.
**Why:** User requested we adopt Greenfield MD as coding discipline to avoid avoidable pain (spec drift, missing tests, schema drift).
**Spec Section:** §1 Addendum Discipline, §0 How to use template
**Impact:** All future agents must follow GREENFIELD rules (living spec, tests-first, isolation, ORM discipline, etc.). Decision source: wshyang/greenfield@8ba74027.

### ADD-002 — 2026-10-17 — Dedup Source Art & Meaningful Filing
**What:** Source had 13 files, 2 exact byte-duplicates (hash collision). Deduped to 11 uniques. Filed into src/images with semantic filenames:
- backdrop-kallang-sunset-magenta-01.jpg (ex Gemini 1t2nkv...)
- backdrop-kallang-daytime-turquoise.jpg (ex 2jlj7b...)
- backdrop-kallang-sunset-orange-02.jpg (ex 7x6cuk...)
- backdrop-kallang-populated-crowded-day.jpg (ex on5iyh...)
- backdrop-sky-gradient-blue.jpg (ex wiwael...)
- sprites-characters-6colours-magenta.jpg (ex 3opyjq...)
- sprites-boats-dragon-kayak-oars-water.jpg (ex 7cr2ov...)
- sprites-clouds-varied-magenta.jpg (ex aoywri...)
- sprites-water-wake-splash-ripple-props.jpg (ex v7m2ev...)
- sprites-event-props-banners-tents-podiums.jpg (ex n64hnk... part 1) — actually combined in original? Split: n64hnk contains water effects top + props bottom.
- reference-photo-sportshub-real.jpg (ex SportsHub.png)
**Why:** Magenta backing indicates sprite sheets vs backdrops. Need deterministic asset inventory for extraction script and public URL mapping.
**Spec Section:** Task deliverable 1 & 2
**Impact:** Original Gemini_* filenames removed from repo root; src/images becomes canonical source. Extraction script reads from src/images only. Public URL path = /images and /sprites.

### ADD-003 — 2026-10-17 — Extraction Strategy: Magenta Chroma Key + Connected Components
**What:** Implement Python extractor using PIL+numpy: treat (255,0,255) ± tolerance 40 as transparent, flood-fill outer border to keep interior magenta holes? Use morphological ops + contour detection via BFS to cut individual pieces. Output PNG with alpha to public/sprites/<category>/...
**Why:** Art has magenta backing (255,0,255) for chroma key. Need sprite-per-file for animation. Manual slicing brittle; automated extraction enables reproducibility and dedup via perceptual hash.
**Spec Section:** Task deliverable 3
**Impact:** scripts/extract_sprites.py is source of truth. Run on build to regenerate public/sprites. Must preserve pixel-art crispness (NEAREST).

### ADD-004 — 2026-10-17 — Composite Object Overlay: Boats + Oars Anchor Points
**What:** Modularise each boat class (Dragonboat 6 colours, Kayak K1 2 variants, K2 4 variants, K3 2 variants, K4 2 variants) as React components with anchor points (x,y, rotation origin) for oars. Oars are separate sprites overlaid with CSS transform-origin.
**Why:** Boats with oars are composite — oars must animate independent of hull. Anchor points painstakingly measured via overlay experimentation + screenshot feedback loop.
**Spec Section:** Task deliverable 4
**Impact:** src/components/boats/* each exports ANCHORS constant and BoatWithOars component. Animation uses CSS keyframes rotating oars around anchor.

### ADD-005 — 2026-10-17 — Web App Architecture: Vite + React + Tailwind, Static Asset Hosting
**What:** Deliver final artefact as Vite React SPA. Scene composition: backdrop layer (Kallang dome), water layer (animated boats), sky layer (drifting clouds), promenade layer (props + characters). Public sprites served at /sprites/... (Vite public dir). Deployable via Dockerfile from greenfield template.
**Why:** Greenfield templates provide Dockerfile.dev + Dockerfile; user requested publicly accessible URL path. Vite public dir maps 1:1.
**Spec Section:** Task deliverable 5
**Impact:** Entire scene animated via CSS transforms + requestAnimationFrame for parallax. Vary sprites via random selection + staggered delays.

### ADD-006 — 2026-10-17 — Image Filing Decision: Backdrops vs Variants vs Object Classes
**What:** Classify each source image as BACKDROP (full-scene, not to cut) vs SPRITE_SHEET (many small pieces to cut) vs REFERENCE (real photo, not used in animation but kept for fidelity check).
**Why:** Task requires distinguishing backdrops vs variants of object classes to animate.
**Spec Section:** Task 1 intro
**Impact:** Only SPRITE_SHEET images go through extraction; BACKDROP images used as scene layers (maybe parallax).
