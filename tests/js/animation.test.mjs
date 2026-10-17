import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bobY, drift, frameAt, oarAngle, rotateVector, shouldSplash, strokeDepth,
  tipPosition, wrap,
} from "../../public/app/animation.js";

test("wrap keeps values inside [min, max) for positive and negative inputs", () => {
  assert.equal(wrap(5, 0, 10), 5);
  assert.equal(wrap(10, 0, 10), 0);
  assert.equal(wrap(-1, 0, 10), 9);
  assert.equal(wrap(-1005, -780, 3532), 3307);
  assert.equal(wrap(4000, -780, 3532), -312);
});

test("drift moves by direction * speed * seconds", () => {
  assert.equal(drift(100, 20, -1, 3), 40);
  assert.equal(drift(100, 20, 1, 0.5), 110);
});

test("oarAngle oscillates rest +/- swing at fps cadence", () => {
  assert.equal(oarAngle(-26, 16, 1.8, 0, 0), -26);
  const peak = oarAngle(-26, 16, 1.8, 1 / (4 * 1.8), 0);
  assert.ok(Math.abs(peak - (-10)) < 1e-9, `expected -10, got ${peak}`);
  const trough = oarAngle(-26, 16, 1.8, 3 / (4 * 1.8), 0);
  assert.ok(Math.abs(trough - (-42)) < 1e-9, `expected -42, got ${trough}`);
});

test("strokeDepth spans [-1, 1] and matches the oar sine", () => {
  for (let t = 0; t < 4; t += 0.17) {
    const d = strokeDepth(2.2, t, 0.7);
    assert.ok(d >= -1 && d <= 1);
    assert.equal(d, oarAngle(0, 1, 2.2, t, 0.7));
  }
});

test("shouldSplash fires only past the threshold, default -0.55", () => {
  assert.equal(shouldSplash(-0.6), true);
  assert.equal(shouldSplash(-0.5), false);
  assert.equal(shouldSplash(0.5), false);
  assert.equal(shouldSplash(-0.4, -0.3), true);
  assert.equal(shouldSplash(-0.25, -0.3), false);
});

test("frameAt cycles pose lists and never returns undefined", () => {
  const frames = [4, 5];
  assert.equal(frameAt(frames, 0, 6), 4);
  assert.equal(frameAt(frames, 1 / 6, 6), 5);
  assert.equal(frameAt(frames, 2 / 6, 6), 4);
  assert.equal(frameAt(frames, 100.5, 6, 3), 4);
  for (let t = 0; t < 10; t += 0.37) {
    assert.ok([4, 5].includes(frameAt(frames, t, 7, 2)));
  }
});

test("bobY stays within amplitude", () => {
  for (const phase of [0, 1.3, 4.2]) {
    for (let t = 0; t < 5; t += 0.1) {
      const y = bobY(t, 2.6, 0.7, phase);
      assert.ok(y >= -2.6 && y <= 2.6);
    }
  }
});

test("rotateVector rotates CW in y-down image coordinates", () => {
  const [x0, y0] = rotateVector(10, 0, 90);
  assert.ok(Math.abs(x0) < 1e-9);
  assert.ok(Math.abs(y0 - 10) < 1e-9, "90 deg CW must send +x to +y");
  const [x1, y1] = rotateVector(0, 5, -90);
  assert.ok(Math.abs(x1 - 5) < 1e-9);
  assert.ok(Math.abs(y1) < 1e-9);
});

test("tipPosition adds the rotated local tip to the anchor", () => {
  const [tx, ty] = tipPosition([100, 200], [0, 40], 90);
  assert.ok(Math.abs(tx - 60) < 1e-9, `x drifted: ${tx}`);
  assert.ok(Math.abs(ty - 200) < 1e-9, `y drifted: ${ty}`);
});
