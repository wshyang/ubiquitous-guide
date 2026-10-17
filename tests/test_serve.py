"""Server route confinement: the public URL space, and nothing else."""
import importlib.util
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]


def _serve():
    spec = importlib.util.spec_from_file_location("scene_serve", REPO / "scripts" / "serve.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_serves_index_on_root_aliases():
    serve = _serve()
    for path in ("/", "/app", "/index.html"):
        assert serve.resolve(path) == (REPO / "public" / "index.html").resolve()


def test_serves_the_module_and_asset_trees():
    serve = _serve()
    assert serve.resolve("/app/main.js").name == "main.js"
    assert serve.resolve("/sprites/manifest.json").name == "manifest.json"
    assert serve.resolve("/composites/manifest.json").name == "manifest.json"
    assert serve.resolve("/images/backdrops/kallang-daylight.jpeg").is_file()


def test_rejects_traversal_out_of_a_route_root():
    serve = _serve()
    # `..` after the route key must not climb past the route's own root.
    assert serve.resolve("/sprites/../../.git/config") is None
    assert serve.resolve("/app/../../SPEC.md") is None
    assert serve.resolve("/images/../app/scene-config.json") is None


def test_rejects_unknown_routes_and_direct_repo_paths():
    serve = _serve()
    assert serve.resolve("/../.git/config") is None
    assert serve.resolve("/SPEC.md") is None
    assert serve.resolve("/scripts/serve.py") is None
    assert serve.resolve("/nope") is None
