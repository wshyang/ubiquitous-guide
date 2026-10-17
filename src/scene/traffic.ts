/** Boat traffic occupancy at time t, derived from the same pure centre-x
 *  helpers the boat modules draw with — ambient water effects use it to
 *  fade out before a hull (or its wake) reaches them, so effects never
 *  visually clash with passing boats. */
import { scaledSize } from "../lib/draw";
import type { SpriteStore } from "../lib/sprites";
import { dragonCentreXAt, type DragonBoatConfig } from "../objects/dragonBoat";
import { kayakCentreXAt, type KayakConfig } from "../objects/kayak";
import type { Rect } from "./waterMap";

export type BoatSpec =
  | { kind: "dragon"; cfg: DragonBoatConfig }
  | { kind: "kayak"; cfg: KayakConfig };

/** Occupied rect (hull ∪ wake) for one boat at time t. */
export function boatRectAt(store: SpriteStore, spec: BoatSpec, timeSec: number): Rect {
  const cfg = spec.cfg;
  const entry = store.get(cfg.spriteId).entry;
  const height = scaledSize(entry.width, entry.height, cfg.width).h;
  const centreX = spec.kind === "dragon" ? dragonCentreXAt(spec.cfg, timeSec) : kayakCentreXAt(spec.cfg, timeSec);
  const sternDir = cfg.speedPxPerSec > 0 ? -1 : 1; // wake trails behind travel
  const wakeHalf = (spec.kind === "dragon" ? 0.66 : 0.5) * cfg.width * 0.5;
  const wakeCentre = centreX + sternDir * cfg.width * (spec.kind === "dragon" ? 0.55 : 0.48);
  return {
    x1: Math.min(centreX - cfg.width / 2, wakeCentre - wakeHalf),
    x2: Math.max(centreX + cfg.width / 2, wakeCentre + wakeHalf),
    y1: cfg.waterlineY - height,
    y2: cfg.waterlineY + 12,
  };
}

export function boatRectsAt(store: SpriteStore, specs: readonly BoatSpec[], timeSec: number): Rect[] {
  return specs.map((spec) => boatRectAt(store, spec, timeSec));
}

function clearanceTo(x: number, y: number, rect: Rect): number {
  const dx = Math.max(rect.x1 - x, 0, x - rect.x2);
  const dy = Math.max(rect.y1 - y, 0, y - rect.y2);
  return Math.hypot(dx, dy);
}

/** 0 when a boat is on top of (x, y), 1 once it is `fadeDistance` clear. */
export function trafficFadeAt(x: number, y: number, rects: readonly Rect[], fadeDistance = 48): number {
  if (rects.length === 0) return 1;
  const nearest = Math.min(...rects.map((rect) => clearanceTo(x, y, rect)));
  return Math.min(1, nearest / fadeDistance);
}
