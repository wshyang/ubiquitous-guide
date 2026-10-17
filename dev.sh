#!/usr/bin/env bash
# Dev loop: run both test gates, then serve the scene (SPEC: tests before code).
set -euo pipefail
cd "$(dirname "$0")"

PY="${PY:-$HOME/.venv-img/bin/python}"
if [ ! -x "$PY" ]; then PY=python3; fi

echo "== pytest (python gates) =="
"$PY" -m pytest tests/ -q

echo "== node --test (js gates) =="
node --test tests/js/*.test.mjs

echo "== serving on 0.0.0.0:3000 =="
exec "$PY" scripts/serve.py
