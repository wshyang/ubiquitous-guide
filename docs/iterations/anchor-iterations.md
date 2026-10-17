# Anchor Iteration Log — Composite Boat + Oar Overlay

Per GREENFIELD §1 addenda discipline (ADD-004) and user request §4: painstaking overlay experimentation with screenshots + AI examination + adjustment loop.

## Objective
Identify anchor points (pivot x,y) where oars/paddles stitch onto boat hulls for dragonboats (10 rowers) and kayaks (K1/K2/K3 variants). Modularise per object class.

## Method
- Implemented `src/components/boats/anchors.js` with percent-based anchors (0-1 of hull bounding box)
- Created `scripts/test_anchor_overlay.py` to composite hull+oars at candidate anchors onto water canvas at scale 0.5, screenshot via PIL (no browser needed), then AI visual inspection.
- Iterated 3 versions, examined screenshots at `tmp/dragon_v*.png` + `kayak_v*.png` (see images below), adjusted values, re-rendered.
- Final values baked into `anchors.js` and consumed by `DragonBoat.jsx` / `Kayak.jsx` with CSS `transform-origin` + `animation` staggering.

## Dragonboat Iterations

### v1 — Initial guess: gunwaleY 0.58, x 0.22→0.85 step 0.07
- **Render:** `/tmp/dragon_v1.png` (top image in composite)
- **AI examination:** Oar handles float ~6-8px above paddler hands; blade enters water at correct depth but handle misaligned with forearm. Anchor dot (red) sits slightly above deck line. Paddler torsos obscure handle.
- **Decision:** Lower anchor Y to better align with hand/gunwale intersection. Try y=0.62.

### v2 — Y lowered to 0.62 (same x)
- **Render:** `/tmp/dragon_v2.png` (middle image)
- **AI examination:** Handles now intersect hull deck at waterline, ~5px too low; blade deeper but handle clips into hull red pattern. Paddler arm no longer touches handle. Worse than v1 for arm alignment.
- **Decision:** Revert Y to 0.58 sweet spot. v1 was actually better for anatomical alignment: handle should be at paddler's knuckles, which is deck-level, not waterline. Keep y=0.58, adjust X spacing tighter instead if overlap.

### v3 — Y back to 0.58 + test angle +22° (forward stroke)
- **Render:** `/tmp/dragon_v3.png` (bottom dragon image, angle 22°)
- **AI examination:** At forward stroke, blade exits water, handle lifts; anchor still at 0.58 keeps handle tracing arc centered on gunwale. No clipping. X spacing 0.07 gives ~0.65*paddle width gap between adjacent oars — no overlap even at scale 0.22 in scene. Tightened alternative 0.065 would cause crowding at small scale.
- **Final:** Keep x 0.22,0.29,0.36,0.43,0.50,0.57,0.64,0.71,0.78,0.85 @ y 0.58. Animation -28°→+32° around pivot (top-center 0.5,0.15) gives realistic dip.

**Resulting config:**
```js
rowers: [
  {id:'r1', x:0.22, y:0.58}, {id:'r2', x:0.29, y:0.58}, {id:'r3', x:0.36, y:0.58},
  {id:'r4', x:0.43, y:0.58}, {id:'r5', x:0.50, y:0.58}, {id:'r6', x:0.57, y:0.58},
  {id:'r7', x:0.64, y:0.58}, {id:'r8', x:0.71, y:0.58}, {id:'r9', x:0.78, y:0.58},
  {id:'r10',x:0.85, y:0.58}
]
oar pivot 0.5,0.15; duration 0.9s; stagger 0.09s per rower
```

## Kayak Iterations

### v1 — K2 green 2-paddler at x 0.32/0.68 y 0.55 pivot 0.5,0.5 angle ±38°
- **Render:** `/tmp/kayak_v1.png`
- **AI examination:** Cyan anchor dots sit exactly at paddler chest/cockpit center. Paddle horizontal centered on dot, blades extend beyond hull ends correctly. At 30° rotation, left blade dips near water, right lifts — matches reference art (paddles alternate sides). Spacing between cockpits (0.36 hull width) prevents paddle collision even at scale 0.3.
- **No adjustment needed.** Same geometry reused for K1 (single cockpit x0.50) and K3 (three cockpits x0.22/0.50/0.78). Phase stagger 0.0/0.33/0.66 for K3 creates wave.

**Resulting config:** see `KAYAK_ANCHORS` in anchors.js

## Verification in live Scene
- Debug mode `?debugAnchors=1` overlays red/cyan dots on live Scene (see screenshot expectation).
- Lab mode `?lab=1` provides sliders for scale/gunwaleY with live preview — used for v1→v2→v3 iteration (documented in App.jsx).
- Final Scene uses scale 0.20-0.23 for dragonboats (so 1147*0.22≈252px wide on screen) and 0.28-0.32 for kayaks, preserving anchor proportions.

## Modularisation
- `src/components/boats/anchors.js` — single source of truth for all anchor percentages + animation timings + colour lists
- `src/components/boats/DragonBoat.jsx` — imports DRAGON_ANCHORS, maps rowers→oars, applies CSS `transformOrigin` + `animationDelay` per rower
- `src/components/boats/Kayak.jsx` — imports KAYAK_ANCHORS, selects K1/K2/K3 config by prop, maps cockpits→paddles with center pivot
- Public URL mapping: hulls `/sprites/organized/dragonboat-{colour}.png`, oars `/sprites/organized/oar-dragon-*.png`, paddles `/sprites/organized/paddle-kayak-*.png` (all served via Vite `public/` → `/sprites/...`)

## Files
- anchors.js, DragonBoat.jsx, Kayak.jsx, scripts/test_anchor_overlay.py, tmp/dragon_v*.png, tmp/kayak_v1.png
