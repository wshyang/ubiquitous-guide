/**
 * Pure timing helpers for the scene. Every animation loop is a function of
 * simulated time in milliseconds, so frames are deterministic and testable.
 */

export const STROKE_PERIOD_MS = 1600;
export const WALK_CYCLE_MS = 560;
export const CHEER_PERIOD_MS = 6400;
export const CHEER_DURATION_MS = 1000;
export const SPLASH_LIFETIME_MS = 420;
export const RIPPLE_PERIOD_MS = 1300;

export type StrokePhase = "catch" | "pull";

/** Paddle stroke: catch for the first half of each period, pull for the second. */
export function strokePhaseAt(timeMs: number, offsetMs = 0): StrokePhase {
  const within = positiveModulo(timeMs + offsetMs, STROKE_PERIOD_MS);
  return within < STROKE_PERIOD_MS / 2 ? "catch" : "pull";
}

/** Milliseconds since the most recent catch started (0 at the catch instant). */
export function millisSinceCatch(timeMs: number, offsetMs = 0): number {
  return positiveModulo(timeMs + offsetMs, STROKE_PERIOD_MS);
}

/** Wrap a horizontal position into [-margin, span + margin) so sprites re-enter after leaving. */
export function wrapX(x: number, span: number, margin: number): number {
  const width = span + 2 * margin;
  return positiveModulo(x + margin, width) - margin;
}

/** Ping-pong position between two bounds at a constant speed (units per ms). */
export function pingPongX(timeMs: number, startX: number, minX: number, maxX: number, speedPerMs: number): { x: number; facing: 1 | -1 } {
  const span = maxX - minX;
  const travelled = positiveModulo(startX - minX + timeMs * speedPerMs, 2 * span);
  if (travelled <= span) {
    return { x: minX + travelled, facing: 1 };
  }
  return { x: maxX - (travelled - span), facing: -1 };
}

/** Index into a walk cycle of frames, advancing every WALK_CYCLE_MS / frameCount. */
export function walkFrameIndex(timeMs: number, frameCount: number, offsetMs = 0): number {
  const within = positiveModulo(timeMs + offsetMs, WALK_CYCLE_MS);
  return Math.floor((within / WALK_CYCLE_MS) * frameCount) % frameCount;
}

/** True while a cheering pose should be shown. */
export function isCheering(timeMs: number, offsetMs = 0): boolean {
  return positiveModulo(timeMs + offsetMs, CHEER_PERIOD_MS) < CHEER_DURATION_MS;
}

/** Deterministic pseudo-random number in [0, 1) from an integer seed (mulberry32). */
export function seededUnit(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface PathSample extends Point {
  readonly facing: 1 | -1;
}

/** Total length of a polyline in backdrop pixels. */
export function polylineLength(points: readonly Point[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
  }
  return total;
}

/** Walk a polyline by arc length; distances past the end clamp to the last point. */
export function pointAtDistance(points: readonly Point[], distance: number): Point {
  let remaining = Math.max(0, distance);
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    if (remaining <= length && length > 0) {
      const t = remaining / length;
      return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
    }
    remaining -= length;
  }
  return points[points.length - 1];
}

/**
 * A walker or rider moving back and forth along a polyline at a constant speed.
 * `facing` is +1 when moving toward the last point along a left-to-right segment.
 */
export function pathSampleAt(points: readonly Point[], timeMs: number, speedPerMs: number, startDistance: number): PathSample {
  const { x: distance, facing } = pingPongX(timeMs, startDistance, 0, polylineLength(points), speedPerMs);
  const point = pointAtDistance(points, distance);
  return { ...point, facing };
}

/** Height above the ground of a ball that bounces every period; always >= 0, peaks at `peak`. */
export function bounceHeight(timeMs: number, periodMs: number, peak: number): number {
  const within = positiveModulo(timeMs, periodMs);
  return Math.abs(Math.sin((Math.PI * within) / periodMs)) * peak;
}
