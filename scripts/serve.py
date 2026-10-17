#!/usr/bin/env python3
"""Static server for The Kallang Scene — stdlib only, container contract port 3000.

URL map:
  /                 -> public/index.html
  /app/*            -> public/app/*
  /sprites/*        -> public/sprites/*   (extracted pieces)
  /composites/*     -> public/composites/*
  /images/*         -> src/images/*       (immutable source art, e.g. backdrops)
Environment: HOST (default 0.0.0.0), PORT (default 3000).
"""
from __future__ import annotations

import mimetypes
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

REPO_ROOT = Path(__file__).resolve().parents[1]
PUBLIC = REPO_ROOT / "public"
SOURCE_IMAGES = REPO_ROOT / "src" / "images"

ROUTES = {
    "": ("file", PUBLIC / "index.html"),
    "app": ("tree", PUBLIC / "app"),
    "sprites": ("tree", PUBLIC / "sprites"),
    "composites": ("tree", PUBLIC / "composites"),
    "images": ("tree", SOURCE_IMAGES),
}


def resolve(path: str) -> Path | None:
    """Map a request path to a file inside the allowed roots (or None)."""
    parts = [unquote(p) for p in urlparse(path).path.split("/") if p]
    if not parts:
        return _existing(ROUTES[""][1], PUBLIC)
    if parts == ["app"] or parts == ["index.html"]:
        return _existing(ROUTES[""][1], PUBLIC)
    kind, root = ROUTES.get(parts[0], (None, None))
    if kind is None:
        return None
    if kind == "file":
        return None
    target = root.joinpath(*parts[1:])
    return _existing(target, root)


def _existing(target: Path, root: Path) -> Path | None:
    """Resolve and confine to `root` — never serve outside the route tree."""
    try:
        resolved = target.resolve()
        resolved.relative_to(root.resolve())
    except (ValueError, OSError):
        return None
    return resolved if resolved.is_file() else None


class SceneHandler(BaseHTTPRequestHandler):
    """Serve resolved files with sane MIME types; 404 everything else."""

    def do_GET(self) -> None:  # noqa: N802 (stdlib naming)
        self._serve(head_only=False)

    def do_HEAD(self) -> None:  # noqa: N802
        self._serve(head_only=True)

    def _serve(self, head_only: bool) -> None:
        target = resolve(self.path)
        if target is None:
            self.send_error(404, "not found")
            return
        body = target.read_bytes()
        ctype, _ = mimetypes.guess_type(target.name)
        self.send_response(200)
        self.send_header("Content-Type", ctype or "application/octet-stream")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if not head_only:
            try:
                self.wfile.write(body)
            except ConnectionResetError:
                pass  # client went away mid-transfer; not our problem

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def main(argv: list[str]) -> int:
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "3000"))
    if len(argv) >= 2:
        port = int(argv[1])
    server = ThreadingHTTPServer((host, port), SceneHandler)
    print(f"The Kallang Scene at http://{host}:{port}/ (serving {PUBLIC})")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
