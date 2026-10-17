/**
 * Seeded RNG (mulberry32) — deterministic scene variation, pure and testable.
 */

/** @returns {{next: () => number, range: (a: number, b: number) => number,
 *            int: (a: number, b: number) => number, pick: <T>(xs: T[]) => T,
 *            shuffle: <T>(xs: T[]) => T[]}} */
export function makeRandom(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const range = (a, b) => a + (b - a) * next();
  const int = (a, b) => Math.floor(range(a, b + 1));
  const pick = (xs) => xs[int(0, xs.length - 1)];
  const shuffle = (xs) => {
    const out = xs.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = int(0, i);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  return { next, range, int, pick, shuffle };
}
