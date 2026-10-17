/**
 * Animation math — pure functions of time; shared by the app and node tests.
 * Angles are degrees, CW-positive in image coordinates (y down), matching the
 * composite stitchers (SPEC §4).
 */

/** Wrap `value` into [min, max), e.g. loops for boats and clouds. */
export function wrap(value, min, max) {
  const span = max - min;
  let v = (value - min) % span;
  if (v < 0) v += span;
  return min + v;
}

/** Position along a loop: start + direction * speed * seconds. */
export function drift(value, speed, dir, seconds) {
  return value + dir * speed * seconds;
}

/** Oar/paddle rake: rest angle oscillated by a sine stroke. */
export function oarAngle(restDeg, swingDeg, fps, seconds, phase) {
  return restDeg + swingDeg * Math.sin(2 * Math.PI * fps * seconds + phase);
}

/** Stroke depth in [-1, 1]; negative = blade driving down (splash window). */
export function strokeDepth(fps, seconds, phase) {
  return Math.sin(2 * Math.PI * fps * seconds + phase);
}

/** Splash only while the blade is deep — keeps effects rhythmic, not constant. */
export function shouldSplash(depth, threshold = -0.55) {
  return depth < threshold;
}

/** Pick a sprite frame from a pose list at `fps` — the walk/cheer cycle. */
export function frameAt(frames, seconds, fps, phase = 0) {
  const step = Math.floor(seconds * fps + phase);
  return frames[((step % frames.length) + frames.length) % frames.length];
}

/** Vertical bobbing for boats (and idle breathing for walkers). */
export function bobY(seconds, amp, freq, phase) {
  return amp * Math.sin(2 * Math.PI * freq * seconds + phase);
}

/** Rotate a local vector CW by `angleDeg` (mirrors scripts/composites geometry). */
export function rotateVector(x, y, angleDeg) {
  const r = (angleDeg * Math.PI) / 180;
  return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)];
}

/** Blade-tip offset from an anchor: local tip vector rotated by the oar angle. */
export function tipPosition(anchor, tipLocal, angleDeg) {
  const [dx, dy] = rotateVector(tipLocal[0], tipLocal[1], angleDeg);
  return [anchor[0] + dx, anchor[1] + dy];
}
