# Kallang Sports Day — sprite pipeline and animated scene

A canvas web app that places extracted sprites and composited boats on the Kallang backdrop and
animates them. Art sources are in `src/images/`. Everything the app serves is generated from them.

## Quick start

```bash
# Python art pipeline (once)
python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements-art.txt

# Web app
npm install
npm run dev            # http://localhost:3000
npm test && npm run typecheck && npm run build
```

## Regenerate assets

```bash
npm run art:dedup       # report duplicate artwork under src/images (add --apply to delete exact copies)
npm run art:extract     # sprite pieces -> public/assets/sprites/<sheet>/
npm run art:composites  # kayak and dragon-boat composites -> public/assets/composites/
npm run art:test        # pipeline unit tests
```

## Calibration screenshots

```bash
CHROME_PATH=/path/to/chromium node scripts/screenshots/capture.mjs --t 4000 --out scene.png
```

Open the app with `?t=<ms>` to freeze the clock. Layout values are in `src/scene/layout.ts`.
Kayak and dragon-boat anchors are in `scripts/composites/`. Decisions are logged in `docs/DECISIONS.md`.

## Layout

- `src/images/` — unique source art, grouped as backdrops, sprite sheets and references.
- `scripts/` — dedup, chroma key, extraction, composites, screenshot tool; tests in `scripts/tests/`.
- `src/scene/` — timing (pure), layout (calibration values), sprite loader, scene renderer.
- `public/assets/` — served by the app: backdrop, sprite pieces, composites.
- `GREENFIELD.md`, `CLAUDE.md`, `docs/` — the adopted coding discipline and decision register.
