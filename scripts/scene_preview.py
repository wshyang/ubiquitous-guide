#!/usr/bin/env python
"""Placement previewer for scene-config.json (stdlib + Pillow only).

Renders a static frame of the exact scene the web app builds (same seed, same
rng draw order, same sprite indices) so prop coordinates can be inspected and
tuned without a browser. Outputs three views under work/debug/scene/.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parents[1]
OUT_DIR = REPO / "work" / "debug" / "scene"
PREVIEW_T = 9.551  # chosen so several blades sit on a strong deep beat (splash check)
VIEW = 0.5
PAD_X, PAD_Y = 1100, 300


class Rng:
    """mulberry32 — bit-identical port of public/app/rng.js."""

    def __init__(self, seed: int):
        self.state = seed & 0xFFFFFFFF

    @staticmethod
    def _i32(v: int) -> int:
        v &= 0xFFFFFFFF
        return v - 0x100000000 if v >= 0x80000000 else v

    @classmethod
    def _imul(cls, a: int, b: int) -> int:
        return cls._i32((a & 0xFFFFFFFF) * (b & 0xFFFFFFFF))

    def next(self) -> float:
        self.state = (self.state + 0x6D2B79F5) & 0xFFFFFFFF
        t = self.state
        t = self._imul(t ^ (t >> 15), t | 1)
        t = t ^ self._i32(t + self._imul(t ^ ((t & 0xFFFFFFFF) >> 7), t | 61))
        return ((t ^ ((t & 0xFFFFFFFF) >> 14)) & 0xFFFFFFFF) / 4294967296

    def range(self, a: float, b: float) -> float:
        return a + (b - a) * self.next()

    def int(self, a: int, b: int) -> int:
        return math.floor(self.range(a, b + 1))

    def pick(self, xs):
        return xs[self.int(0, len(xs) - 1)]

    def shuffle(self, xs):
        out = list(xs)
        for i in range(len(out) - 1, 0, -1):
            j = self.int(0, i)
            out[i], out[j] = out[j], out[i]
        return out


def counts_by_class(pieces) -> dict:
    counts = {}
    for p in pieces:
        counts[p["class"]] = counts.get(p["class"], 0) + 1
    return counts


def build_clouds(cfg, counts, rng) -> list:
    out = []
    for i in range(cfg["clouds"]["count"]):
        cls = cfg["clouds"]["classes"][i % len(cfg["clouds"]["classes"])]
        band = cfg["clouds"]["yBands"][i % len(cfg["clouds"]["yBands"])]
        s0, s1 = cfg["clouds"]["classScale"][cfg["clouds"]["classes"].index(cls)]
        out.append({
            "cls": cls, "index": rng.int(0, counts[cls] - 1),
            "x": rng.range(-200, cfg["world"]["width"] + 200),
            "y": rng.range(band[0], band[1]),
            "scale": rng.range(s0, s1),
            "speed": rng.range(*cfg["clouds"]["speed"]),
            "dir": -1 if i % 2 == 0 else 1,
            "alpha": rng.range(*cfg["clouds"]["alpha"]),
            "phase": rng.range(0, 2 * math.pi),
        })
    return out


def fill_lanes(total: int, lane_count: int) -> list:
    per = [total // lane_count] * lane_count
    for i in range(total - sum(per)):
        per[i] += 1
    return per


def build_boats(cfg, detail, rng) -> list:
    dragon_keys = rng.shuffle(list(detail["dragon-boat"]))
    small_keys = rng.shuffle(list(detail["small-boat"]))
    dragon_lanes = sum(1 for l in cfg["lanes"] if l["traffic"] == "dragon")
    small_lanes = len(cfg["lanes"]) - dragon_lanes
    per = {
        "dragon": fill_lanes(cfg["boats"]["dragonCount"], dragon_lanes),
        "small": fill_lanes(cfg["boats"]["smallCount"], small_lanes),
    }
    rank = {"dragon": 0, "small": 0}
    cursor = {"dragon": 0, "small": 0}
    boats = []
    for lane_index, lane in enumerate(cfg["lanes"]):
        kind = lane["traffic"]
        lane_rank = rank[kind]
        rank[kind] += 1
        n_in_lane = per[kind][lane_rank]
        for i in range(n_in_lane):
            if kind == "dragon":
                variant = dragon_keys[cursor["dragon"]]
                cursor["dragon"] += 1
                entry = detail["dragon-boat"][variant]
            else:
                variant = small_keys[cursor["small"]]
                cursor["small"] += 1
                entry = detail["small-boat"][variant]
            boats.append({
                "kind": kind, "variant": variant, "entry": entry,
                "laneIndex": lane_index,
                "x0": (i + 0.5) / n_in_lane * cfg["world"]["width"] + rng.range(-90, 90),
                "speed": rng.range(*cfg["boats"]["speed"][kind]),
                "dir": lane["dir"],
                "phase": rng.range(0, 2 * math.pi),
                "bobPhase": rng.range(0, 2 * math.pi),
                "wakeIndex": rng.pick(cfg["wakeSprites"]),
                "splashIndex": rng.pick(cfg["splashSprites"]),
            })
    return boats


def build_walkers(cfg, counts, rng) -> list:
    colors = rng.shuffle(cfg["colors"])
    walkers = []
    for i in range(cfg["walkers"]["count"]):
        path = cfg["walkers"]["paths"][i % len(cfg["walkers"]["paths"])]
        color = colors[i % len(colors)]
        walkers.append({
            "color": color, "poseKey": cfg["colorPoseKey"][color],
            "index": rng.int(0, counts[color] - 1),
            "pathIndex": i % len(cfg["walkers"]["paths"]),
            "x0": path["x0"] + (path["x1"] - path["x0"]) * (i + 0.5) / cfg["walkers"]["count"],
            "dir": -1 if i % 2 == 0 else 1,
            "speed": rng.range(*cfg["walkers"]["speed"]),
            "fps": rng.range(*cfg["walkers"]["fps"]),
            "phase": rng.range(0, 2 * math.pi),
            "framePhase": rng.int(0, 2),
        })
    return walkers


def build_cheerers(cfg, counts, rng) -> list:
    colors = rng.shuffle(cfg["colors"])
    f0, f1 = cfg["animation"]["cheerFps"]
    out = []
    for i, (x, y) in enumerate(cfg["cheerers"]["spots"]):
        color = colors[i % len(colors)]
        out.append({
            "color": color, "poseKey": cfg["colorPoseKey"][color],
            "index": rng.int(0, counts[color] - 1), "x": x, "y": y,
            "group": "cheer" if i % 2 == 0 else "cheer2",
            "fps": rng.range(f0, f1), "phase": rng.range(0, 4),
        })
    return out


def build_ripples(cfg, rng) -> list:
    band = cfg["ripples"]["band"]
    slots = cfg["ripples"]["slots"]
    cells = (band["x1"] - band["x0"]) / slots
    out = []
    for i in range(slots):
        x = band["x0"] + cells * (i + 0.5) + rng.range(-cells / 3, cells / 3)
        y_lo = 1445 if x > 1780 else band["y0"]
        y_hi = band["y1"] if x > 1780 else 1330
        out.append({
            "x": x,
            "y": rng.range(y_lo, y_hi),
            "born": i * 0.85,
            "hold": rng.range(*cfg["ripples"]["holdSec"]),
            "period": rng.range(3.2, 5.6),
            "scale": rng.range(*cfg["ripples"]["scale"]),
            "frameOffset": rng.int(0, len(cfg["ripples"]["frames"]) - 1),
        })
    return out


def build_scene(cfg, sprites, detail) -> dict:
    rng = Rng(cfg["seed"])
    counts = counts_by_class(sprites["pieces"])
    return {
        "clouds": build_clouds(cfg, counts, rng),
        "boats": build_boats(cfg, detail, rng),
        "walkers": build_walkers(cfg, counts, rng),
        "cheerers": build_cheerers(cfg, counts, rng),
        "ripples": build_ripples(cfg, rng),
        "props": cfg["props"],
    }


def wrap(value: float, lo: float, hi: float) -> float:
    span = hi - lo
    v = (value - lo) % span
    return lo + v


def frame_at(frames, seconds: float, fps: float, phase: float = 0) -> int:
    step = math.floor(seconds * fps + phase)
    return frames[step % len(frames)]


def rot_vec(x: float, y: float, deg: float) -> tuple:
    r = math.radians(deg)
    return x * math.cos(r) - y * math.sin(r), x * math.sin(r) + y * math.cos(r)


def paste_rgba(base: Image.Image, img: Image.Image, xy: tuple, alpha: float = 1.0):
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    mask = img.getchannel("A")
    if alpha < 1.0:
        mask = mask.point(lambda v: int(v * alpha))
    base.paste(img, (round(xy[0]), round(xy[1])), mask)


def scaled(img: Image.Image, factor: float) -> Image.Image:
    w, h = max(1, round(img.width * factor)), max(1, round(img.height * factor))
    return img.resize((w, h), Image.LANCZOS)


def paste_center(base: Image.Image, img: Image.Image, cx: float, cy: float,
                 angle: float = 0.0, alpha: float = 1.0):
    rot = img.rotate(-angle, resample=Image.BICUBIC, expand=True) if angle else img
    paste_rgba(base, rot, (cx - rot.width / 2, cy - rot.height / 2), alpha)


class Assets:
    """Opens sprite pieces from the manifest, cached by URL path."""

    def __init__(self, sprites):
        self.by_url = {p["url"]: p for p in sprites["pieces"]}
        self.cache = {}

    def get(self, url: str) -> Image.Image:
        if url not in self.cache:
            self.cache[url] = Image.open(REPO / self.by_url[url]["path"]).convert("RGBA")
        return self.cache[url]

    def piece(self, cls: str, index: int) -> Image.Image:
        return self.get(f"/sprites/{cls}/{cls}-{index:02d}.png")


def stroke_state(entry, cfg, boat, anchor_i: int, t: float) -> dict:
    anim = cfg["animation"]["dragonOar" if boat["kind"] == "dragon" else "kayakPaddle"]
    phase = boat["phase"] + anchor_i * anim["phaseStep"]
    fps = entry["stroke"]["fps"]
    angle = entry["rest_angle_deg"] + anim["swingDeg"] * math.sin(2 * math.pi * fps * t + phase)
    depth = math.sin(2 * math.pi * fps * t + phase)
    return {"angle": angle, "depth": depth, "fps": fps}


def draw_blade_splash(layer, cfg, assets, boat, entry, tip_local, anchor, angle, depth):
    sign = -1 if boat["kind"] == "dragon" else 1
    threshold = cfg["animation"]["splashThreshold"]
    if depth * sign >= threshold:
        return
    floor = abs(threshold)
    strength = min(1.0, (abs(depth) - floor) / (1 - floor))
    alpha = cfg["animation"]["splashAlpha"] * (0.35 + 0.65 * strength)
    base = 0.85 if boat["kind"] == "dragon" else 0.6
    img = scaled(assets.piece(cfg["splashClass"], boat["splashIndex"]), base * (0.7 + 0.3 * strength))
    tx, ty = rot_vec(tip_local[0], tip_local[1], angle)
    cx = anchor[0] + tx
    cy = anchor[1] + ty
    paste_center(layer, img, cx, cy, angle, alpha)


def draw_oar(layer, cfg, assets, boat, entry, anchor, anchor_i, t):
    w, h = entry["hull_size"]
    ax, ay = anchor["x"] * w, anchor["y"] * h
    state = stroke_state(entry, cfg, boat, anchor_i, t)
    dragon = boat["kind"] == "dragon"
    sprite_url = entry["oar_sprite"] if dragon else entry["paddle_sprite"]
    pivot = entry["oar_pivot"] if dragon else entry["paddle_pivot"]
    oar = assets.get(sprite_url)
    rot = oar.rotate(-state["angle"], resample=Image.BICUBIC, expand=True)
    cx_img, cy_img = oar.width / 2, oar.height / 2
    rx, ry = rot_vec(pivot[0] - cx_img, pivot[1] - cy_img, state["angle"])
    center_x = (PAD_X + ax) - rx
    center_y = (PAD_Y + ay) - ry
    paste_rgba(layer, rot, (center_x - rot.width / 2, center_y - rot.height / 2))
    if dragon:
        tip_local = (0, oar.height - pivot[1])
    else:
        tip_local = (-pivot[0], 0)
    draw_blade_splash(layer, cfg, assets, boat, entry, tip_local,
                      (PAD_X + ax, PAD_Y + ay), state["angle"], state["depth"])


def boat_layer(cfg, assets, boat, t: float) -> tuple:
    entry = boat["entry"]
    w, h = entry["hull_size"]
    layer = Image.new("RGBA", (w + 2 * PAD_X, PAD_Y + h + 600), (0, 0, 0, 0))
    stretch = min(0.9, 0.35 + boat["speed"] / 120)
    wake = scaled(assets.piece("wake", boat["wakeIndex"]), stretch)
    wake = wake.resize((wake.width, max(1, round(wake.height * 0.45))), Image.LANCZOS)
    paste_rgba(layer, wake, (PAD_X + w + wake.width * 0.08, PAD_Y + h * 0.95 - wake.height / 2),
               cfg["animation"]["wakeAlpha"])
    paste_rgba(layer, assets.get(entry["hull"]), (PAD_X, PAD_Y))
    for i, anchor in enumerate(entry["anchors"]):
        draw_oar(layer, cfg, assets, boat, entry, anchor, i, t)
    return layer, PAD_Y


def draw_clouds(world, cfg, scene, assets, t: float):
    for c in scene["clouds"]:
        x = wrap(c["x"] + c["dir"] * c["speed"] * t, -400, c["x"] + 400)
        y = c["y"] + math.sin(t * 0.1 + c["phase"]) * 6
        img = scaled(assets.piece(c["cls"], c["index"]), c["scale"])
        paste_rgba(world, img, (x - img.width / 2, y - img.height / 2), c["alpha"])


def draw_props(world, scene, assets):
    for prop in scene["props"]:
        img = scaled(assets.piece(prop["class"], prop["index"]), prop["scale"])
        paste_rgba(world, img, (prop["x"] - img.width / 2, prop["y"] - img.height))


def draw_cheerers(world, cfg, scene, assets, t: float):
    for c in scene["cheerers"]:
        frames = cfg["poses"][c["poseKey"]][c["group"]]
        img = scaled(assets.piece(c["color"], frame_at(frames, t, c["fps"], c["phase"])),
                     cfg["cheerers"]["scale"])
        paste_rgba(world, img, (c["x"] - img.width / 2, c["y"] - img.height))


def draw_walkers(world, cfg, scene, assets, t: float):
    for w in scene["walkers"]:
        path = cfg["walkers"]["paths"][w["pathIndex"]]
        x = wrap(w["x0"] + w["dir"] * w["speed"] * t, path["x0"], path["x1"])
        frames = cfg["poses"][w["poseKey"]]["walk"]
        idx = frame_at(frames, t, w["fps"], w["framePhase"])
        img = scaled(assets.piece(w["color"], idx), cfg["walkers"]["scale"])
        if w["dir"] < 0:
            img = img.transpose(Image.FLIP_LEFT_RIGHT)
        paste_rgba(world, img, (x - img.width / 2, path["y"] - img.height))


def ripple_state(slot, t: float):
    age = t - slot["born"]
    if age < 0:
        return None
    in_cycle = age % slot["period"]
    if in_cycle >= slot["hold"]:
        return None
    fade = min(min(1, in_cycle * 3), min(1, (slot["hold"] - in_cycle) * 2))
    return {"frameStep": math.floor(in_cycle * 3), "fade": fade}


def draw_ripples(world, cfg, scene, assets, t: float):
    a0, a1 = cfg["animation"]["rippleAlpha"]
    for slot in scene["ripples"]:
        state = ripple_state(slot, t)
        if not state:
            continue
        frames = cfg["ripples"]["frames"]
        idx = frames[(state["frameStep"] + slot["frameOffset"]) % len(frames)]
        img = scaled(assets.piece("ripple", idx), slot["scale"])
        paste_rgba(world, img, (slot["x"] - img.width / 2, slot["y"] - img.height / 2),
                   (a0 + a1) / 2 * state["fade"])


def draw_boats(world, cfg, scene, assets, t: float):
    for boat in scene["boats"]:
        lane = cfg["lanes"][boat["laneIndex"]]
        m = cfg["boats"]["margin"]
        x = wrap(boat["x0"] + boat["dir"] * boat["speed"] * t, -m, cfg["world"]["width"] + m)
        bob = cfg["animation"]["bob"]
        y = lane["y"] + bob["amp"] * math.sin(2 * math.pi * bob["freq"] * t + boat["bobPhase"])
        layer, oy = boat_layer(cfg, assets, boat, t)
        size = (max(1, round(layer.width * lane["scale"])), max(1, round(layer.height * lane["scale"])))
        resized = layer.resize(size, Image.LANCZOS)
        if boat["dir"] == 1:
            resized = resized.transpose(Image.FLIP_LEFT_RIGHT)
        paste_rgba(world, resized, (x - size[0] / 2, y - oy * lane["scale"]))


def render_world(cfg, scene, assets) -> Image.Image:
    world = Image.new("RGBA", (cfg["world"]["width"], cfg["world"]["height"]))
    backdrop = Image.open(REPO / "src" / cfg["backdrops"][0]["url"].lstrip("/")).convert("RGB")
    world.paste(backdrop.resize(world.size, Image.LANCZOS), (0, 0))
    t = PREVIEW_T
    draw_clouds(world, cfg, scene, assets, t)
    draw_props(world, scene, assets)
    draw_cheerers(world, cfg, scene, assets, t)
    draw_walkers(world, cfg, scene, assets, t)
    draw_ripples(world, cfg, scene, assets, t)
    draw_boats(world, cfg, scene, assets, t)
    return world


def save_views(world, cfg, scene) -> list:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    full = world.convert("RGB").resize(
        (round(world.width * VIEW), round(world.height * VIEW)), Image.LANCZOS)
    full.save(OUT_DIR / "preview-full.png")
    world.crop((0, 1150, world.width, world.height)).save(OUT_DIR / "preview-water.png")
    world.crop((0, 1040, world.width, 1250)).save(OUT_DIR / "preview-walkway.png")
    return [str(p.relative_to(REPO)) for p in sorted(OUT_DIR.glob("*.png"))]


def boat_summary(cfg, scene) -> str:
    lines = []
    for b in scene["boats"]:
        m = cfg["boats"]["margin"]
        x = wrap(b["x0"] + b["dir"] * b["speed"] * PREVIEW_T, -m, cfg["world"]["width"] + m)
        lines.append(f"  lane{b['laneIndex']} {b['variant']:<24} x={x:7.1f} dir={b['dir']:+d}")
    return "\n".join(lines)


def main() -> int:
    cfg = json.loads((REPO / "public" / "app" / "scene-config.json").read_text())
    sprites = json.loads((REPO / "public" / "sprites" / "manifest.json").read_text())
    comps = json.loads((REPO / "public" / "composites" / "manifest.json").read_text())
    scene = build_scene(cfg, sprites, comps["detail"])
    assets = Assets(sprites)
    try:
        world = render_world(cfg, scene, assets)
    except (KeyError, FileNotFoundError) as exc:
        print(f"preview failed: {exc}", file=sys.stderr)
        return 1
    outputs = save_views(world, cfg, scene)
    print(f"scene seed={cfg['seed']} t={PREVIEW_T}s "
          f"clouds={len(scene['clouds'])} boats={len(scene['boats'])} "
          f"walkers={len(scene['walkers'])} cheerers={len(scene['cheerers'])} "
          f"ripples={len(scene['ripples'])} props={len(scene['props'])}")
    print("boats:")
    print(boat_summary(cfg, scene))
    print("outputs:")
    for path in outputs:
        print(f"  {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
