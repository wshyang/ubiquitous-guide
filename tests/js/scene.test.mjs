import assert from "node:assert/strict";
import { test } from "node:test";
import { buildScene } from "../../public/app/scene.js";
import { loadComposites, loadConfig, loadSprites } from "./helpers.mjs";

async function build() {
  const [config, sprites, composites] = await Promise.all([
    loadConfig(), loadSprites(), loadComposites(),
  ]);
  return { config, sprites, composites, scene: buildScene(config, sprites, composites) };
}

test("buildScene is deterministic for a fixed seed", async () => {
  const { config, sprites, composites } = await build();
  const a = buildScene(config, sprites, composites);
  const b = buildScene(config, sprites, composites);
  assert.deepEqual(a, b);
});

test("scene population matches the config intent", async () => {
  const { config, scene } = await build();
  assert.equal(scene.clouds.length, config.clouds.count);
  assert.equal(scene.walkers.length, config.walkers.count);
  assert.equal(scene.cheerers.length, config.cheerers.spots.length);
  assert.equal(scene.ripples.length, config.ripples.slots);
  assert.equal(scene.props.length, 29);
  const dragons = scene.boats.filter((b) => b.kind === "dragon").length;
  const smalls = scene.boats.filter((b) => b.kind === "small").length;
  assert.equal(dragons, config.boats.dragonCount);
  assert.equal(smalls, config.boats.smallCount);
});

test("every lane flows one direction with one shared speed", async () => {
  const { config, scene } = await build();
  for (const lane of config.lanes) {
    const boats = scene.boats.filter((b) => config.lanes[b.laneIndex] === lane);
    assert.ok(boats.length > 0, "lane is populated");
    assert.ok(boats.every((b) => b.dir === lane.dir), "dir follows lane");
    const [s0, s1] = config.boats.speed[lane.traffic];
    assert.ok(boats.every((b) => b.speed >= s0 && b.speed <= s1));
    assert.equal(new Set(boats.map((b) => b.speed)).size, 1, "equal speeds prevent pass-through");
  }
});

test("boats spawn without hull overlap inside a lane", async () => {
  const { config, scene } = await build();
  for (const lane of config.lanes) {
    const laneBoats = scene.boats.filter((b) => config.lanes[b.laneIndex] === lane);
    const sorted = [...laneBoats].sort((a, b) => a.x0 - b.x0);
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1];
      const cur = sorted[i];
      const hullGap = (prev.entry.hull_size[0] + cur.entry.hull_size[0]) / 2 * lane.scale;
      assert.ok(cur.x0 - prev.x0 > hullGap, `gap ${cur.x0 - prev.x0} vs hull ${hullGap}`);
    }
  }
});

test("lanes clear the measured quay face and the canvas bottom", async () => {
  const { config, scene } = await build();
  for (const boat of scene.boats) {
    const lane = config.lanes[boat.laneIndex];
    const [, hullH] = boat.entry.hull_size;
    const bottom = lane.y + hullH * lane.scale;
    assert.ok(lane.y >= 1355, `lane y ${lane.y} must sit below the pier face (1352)`);
    assert.ok(bottom <= 1536, `hull bottom ${bottom} exceeds the canvas`);
  }
});

test("no two boats share a variant", async () => {
  const { scene } = await build();
  const keys = scene.boats.map((b) => b.variantKey);
  assert.equal(new Set(keys).size, keys.length);
});

test("ripples avoid the quay and stay in open water", async () => {
  const { scene } = await build();
  for (const r of scene.ripples) {
    if (r.x > 1780) {
      assert.ok(r.y >= 1445, `right ring y=${r.y} must clear the pier face`);
    } else {
      assert.ok(r.y <= 1330, `left ring y=${r.y} must stay in the open strip`);
      assert.ok(r.y >= 1160);
    }
  }
});

test("a broken prop reference fails loudly", async () => {
  const { config, sprites, composites } = await build();
  const broken = { ...config, props: [{ class: "no-such-class", index: 0, x: 0, y: 0, scale: 1 }] };
  assert.throws(() => buildScene(broken, sprites, composites), /no-such-class/);
  const outOfRange = { ...config, props: [{ class: "trophy", index: 99, x: 0, y: 0, scale: 1 }] };
  assert.throws(() => buildScene(outOfRange, sprites, composites), /out of range/);
});
