# CLAUDE.md — The Kallang Scene (ubiquitous-guide)

> Adopted discipline: **[GREENFIELD.md](./GREENFIELD.md)** (verbatim copy of
> [`wshyang/greenfield/GREENFIELD.md`](https://github.com/wshyang/greenfield)).
> This index contextualises that template to this project's stack; where this
> file and GREENFIELD.md agree, this file is the shorter restatement — the
> template remains the reference.

## Project

A pixel-art animated scene of **The Kallang** (Singapore sports hub waterfront).
Source art (AI-generated JPEG/PNG sheets with magenta backing) is archived,
deduplicated, cut into transparent sprites, stitched into composite objects
(boats + oars), and rendered by a browser scene with looping animations.

## Stack (placeholders resolved)

| Placeholder        | Actual choice                                                 |
| ------------------ | ------------------------------------------------------------- |
| Language (tooling) | Python 3.11 in `.venv` at `../.venv-img` **or** any venv with `requirements-dev.txt` |
| Art pipeline       | Pillow + NumPy scripts under `scripts/`, configs inline per sheet |
| Frontend           | Static vanilla ES modules + Canvas2D, no bundler, no framework |
| Tests              | `pytest` (Python), `node --test` (pure JS modules)            |
| Server             | `serve.py` (stdlib only) — binds `0.0.0.0:3000`, see §container contract |
| Dev entrypoint     | `dev.sh` (Bash 3.2-compatible)                                |
| Package manager    | pip (tooling), npm (JS test deps only, optional)              |

## Standing instructions for agents

1. **Record every decision** as an addendum in [SPEC.md](./SPEC.md) in the
   same change that makes it (GREENFIELD §1). Never let SPEC.md drift.
2. **Tests first where the layer is real**: pipeline scripts get pytest
   coverage against generated fixtures; pure JS logic gets `node --test`.
   Say exactly which layer ran — never claim "tests pass" without running it
   (GREENFIELD §8).
3. **Function design**: ≤ 20-line bodies (50 hard), guard clauses, ≤ 3 params,
   no flag parameters, no in-place mutation, domain-grouped modules, 800-LOC
   file hard limit (GREENFIELD §7).
4. **`data-testid`** on every interactive control, named
   `{component-kebab}__{element-role}` (GREENFIELD §6).
5. **Source art is immutable**: everything under `src/images/` is the archive.
   Derived art is *generated* into `public/` by scripts — never hand-edit
   outputs; change the script and regenerate.
6. **Container contract**: server listens on `0.0.0.0:3000`
   (GREENFIELD §10.1); dev server must accept the forwarded preview origin.
7. Addenda are sequential (`A1, A2, …`), independent of SPEC section numbers.

## Repository layout

```
GREENFIELD.md          # adopted discipline template (verbatim, upstream)
CLAUDE.md              # this index
SPEC.md                # living functional spec + addenda register
src/images/            # IMMUTABLE deduplicated source art
  backdrops/           #   full-scene backdrops (incl. sky variants)
  sheets/              #   magenta-backed sprite sheets
  reference/           #   photographic reference (not used in scene)
scripts/
  verify_art_uniqueness.py   # dedup gate (sha256 + perceptual hash)
  extract_sprites.py         # sheet -> transparent pieces (deliverable 3)
  composites/                # per-object-class stitch modules (deliverable 4)
  serve.py                   # static server, 0.0.0.0:3000
public/
  index.html           # the scene web app (deliverable 5)
  app/                 # ES modules: scene layers + animation loops
  sprites/<class>/…    # extracted pieces — public URL path /sprites/…
  composites/<class>/… # stitched objects + anchors.json
tests/                 # pytest suites
dev.sh                 # one-command local env (serve on :3000)
```

## Pipeline (data flow)

```
src/images/sheets/*.jpeg
  --extract_sprites.py--> public/sprites/<class>/*.png + manifest.json
  --scripts/composites/--> public/composites/<class>/*.png + anchors.json
public/* + src/images/backdrops/* --serve.py--> http://0.0.0.0:3000/ (scene app)
```

## Key commands

```sh
./dev.sh                        # serve scene at http://localhost:3000
python -m pytest tests/         # python layer
node --test tests/js/           # JS pure-logic layer
python scripts/verify_art_uniqueness.py          # dedup gate
python scripts/extract_sprites.py                # regenerate sprites
python scripts/composites/build_all.py           # regenerate composites
```
