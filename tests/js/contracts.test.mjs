import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { countsByClass, loadComposites, loadConfig, loadSprites, repoRoot } from "./helpers.mjs";

async function all() {
  const [config, sprites, composites] = await Promise.all([
    loadConfig(), loadSprites(), loadComposites(),
  ]);
  return { config, sprites, composites, counts: countsByClass(sprites.pieces) };
}

test("animation swing/fps agree with the composite stroke contract", async () => {
  const { config, composites } = await all();
  const pairs = [
    ["dragon-boat", config.animation.dragonOar],
    ["small-boat", config.animation.kayakPaddle],
  ];
  for (const [cls, anim] of pairs) {
    for (const entry of Object.values(composites.detail[cls])) {
      assert.equal(entry.stroke.swing_deg, anim.swingDeg, `${cls} swing`);
      assert.equal(entry.stroke.fps, anim.fps, `${cls} fps`);
    }
  }
});

test("every referenced sprite URL exists in the sprite manifest", async () => {
  const { config, sprites, composites } = await all();
  const urls = new Set(sprites.pieces.map((p) => p.url));
  const urlsFromBoats = [];
  for (const group of Object.values(composites.detail)) {
    for (const e of Object.values(group)) {
      urlsFromBoats.push(e.hull, e.oar_sprite ?? e.paddle_sprite);
    }
  }
  for (const url of urlsFromBoats) assert.ok(urls.has(url), `missing ${url}`);
  for (const p of config.props) {
    const name = `${p.class}-${String(p.index).padStart(2, "0")}.png`;
    const url = `/sprites/${p.class}/${name}`;
    assert.ok(urls.has(url), `prop missing ${url}`);
  }
});

test("sprite pick lists fit inside their classes", async () => {
  const { config, counts } = await all();
  const wakeCount = counts["wake"];
  for (const i of config.wakeSprites) assert.ok(i < wakeCount, `wake ${i} >= ${wakeCount}`);
  const splashCount = counts[config.splashClass];
  assert.ok(splashCount > 0, "splash class exists");
  for (const i of config.splashSprites) assert.ok(i < splashCount, `splash ${i} >= ${splashCount}`);
});

test("pose tables only reference frames the character sheets contain", async () => {
  const { config, counts } = await all();
  for (const [color, poseKey] of Object.entries(config.colorPoseKey)) {
    const available = counts[color];
    const table = config.poses[poseKey];
    assert.ok(available >= 12, `${color} has ${available} frames`);
    for (const frames of Object.values(table)) {
      for (const frame of frames) assert.ok(frame < available, `${color}[${poseKey}] frame ${frame}`);
    }
  }
});

test("lane layout can host the configured fleets", async () => {
  const { config } = await all();
  const kinds = new Set(config.lanes.map((l) => l.traffic));
  assert.deepEqual([...kinds].sort(), ["dragon", "small"]);
  assert.ok(config.lanes.filter((l) => l.traffic === "dragon").length > 0);
  assert.ok(config.lanes.filter((l) => l.traffic === "small").length > 0);
  assert.equal(config.boats.dragonCount + config.boats.smallCount, 7);
});

test("backdrops resolve to real files under src/images via /images", async () => {
  const { config } = await all();
  for (const b of config.backdrops) {
    assert.ok(b.url.startsWith("/images/"), `${b.id} must be served from /images`);
    const disk = join(repoRoot, "src", b.url.replace(/^\//, ""));
    assert.ok(existsSync(disk), `missing file ${disk}`);
  }
});
