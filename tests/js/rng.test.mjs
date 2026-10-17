import assert from "node:assert/strict";
import { test } from "node:test";
import { makeRandom } from "../../public/app/rng.js";

test("same seed replays the identical sequence", () => {
  const a = makeRandom(42);
  const b = makeRandom(42);
  for (let i = 0; i < 200; i += 1) assert.equal(a.next(), b.next());
});

test("different seeds diverge", () => {
  const a = makeRandom(42);
  const b = makeRandom(43);
  const seqA = Array.from({ length: 5 }, () => a.next());
  const seqB = Array.from({ length: 5 }, () => b.next());
  assert.notDeepEqual(seqA, seqB);
});

test("next stays in [0, 1) and range/int stay inside bounds", () => {
  const rng = makeRandom(7);
  for (let i = 0; i < 500; i += 1) {
    const v = rng.next();
    assert.ok(v >= 0 && v < 1);
    const r = rng.range(-3.5, 9.25);
    assert.ok(r >= -3.5 && r < 9.25);
    const n = rng.int(2, 6);
    assert.ok(n >= 2 && n <= 6);
    assert.equal(n, Math.floor(n));
  }
});

test("shuffle returns a deterministic permutation", () => {
  const xs = ["a", "b", "c", "d", "e", "f", "g"];
  const one = makeRandom(9).shuffle(xs);
  const two = makeRandom(9).shuffle(xs);
  assert.deepEqual(one, two);
  assert.deepEqual([...one].sort(), [...xs].sort());
  assert.deepEqual(xs, ["a", "b", "c", "d", "e", "f", "g"], "input not mutated");
});

test("pick selects from the list deterministically", () => {
  const rng = makeRandom(3);
  const xs = [10, 20, 30];
  const picks = Array.from({ length: 30 }, () => rng.pick(xs));
  assert.ok(picks.every((p) => xs.includes(p)));
  const rng2 = makeRandom(3);
  const again = Array.from({ length: 30 }, () => rng2.pick(xs));
  assert.deepEqual(picks, again);
});
