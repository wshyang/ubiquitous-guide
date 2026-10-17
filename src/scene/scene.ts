/**
 * Scene composition. Each layer is a pure function of simulated time, so the
 * rendered frame at time t is fully determined by t and the layout constants.
 */
import {
  CLOUD_BAND,
  CLOUD_COUNT,
  DRAGON_BOAT_LANES,
  KAYAK_LANES,
  PROPS,
  WALKERS,
  WATER_TOP_FRACTION,
  type DragonBoatLane,
  type KayakLane,
  type WalkerPlacement,
} from "./layout";
import type { Sprite, SpriteLibrary } from "./sprites";
import { SPLASH_LIFETIME_MS, isCheering, millisSinceCatch, pingPongX, seededUnit, strokePhaseAt, walkFrameIndex, wrapX } from "./timing";

export const STAGE_WIDTH = 2752;
export const STAGE_HEIGHT = 1536;
const CLOUD_MARGIN = 400;
const BOAT_MARGIN = 200;
const SPLASH_SPRITE = "splash_00";

export interface Scene {
  draw(ctx: CanvasRenderingContext2D, timeMs: number): void;
}

export function createScene(library: SpriteLibrary): Scene {
  const clouds = pickCloudSprites(library);
  return {
    draw(ctx, timeMs) {
      ctx.clearRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
      ctx.drawImage(library.backdrop, 0, 0, STAGE_WIDTH, STAGE_HEIGHT);
      drawClouds(ctx, library, clouds, timeMs);
      drawProps(ctx, library);
      drawWalkers(ctx, library, timeMs);
      drawWater(ctx, library, timeMs);
    },
  };
}

/** Evenly spaced subset of the cloud pieces, so the sky shows a mix of sizes. */
function pickCloudSprites(library: SpriteLibrary): string[] {
  const all = library.namesWithPrefix("cloud_");
  const step = Math.max(1, Math.floor(all.length / CLOUD_COUNT));
  return all.filter((_, index) => index % step === 0).slice(0, CLOUD_COUNT);
}

function drawClouds(ctx: CanvasRenderingContext2D, library: SpriteLibrary, names: string[], timeMs: number): void {
  names.forEach((name, index) => {
    const sprite = library.get(name);
    const scale = 0.5 + seededUnit(index * 3 + 1) * 0.5;
    const speed = 0.006 + seededUnit(index * 3 + 3) * 0.01;
    const startX = seededUnit(index * 3 + 2) * STAGE_WIDTH;
    const x = wrapX(startX + speed * timeMs, STAGE_WIDTH, CLOUD_MARGIN);
    const yFraction = CLOUD_BAND.top + seededUnit(index + 99) * (CLOUD_BAND.bottom - CLOUD_BAND.top);
    drawAt(ctx, sprite, x, yFraction * STAGE_HEIGHT - (sprite.height * scale) / 2, scale);
  });
}

function drawProps(ctx: CanvasRenderingContext2D, library: SpriteLibrary): void {
  for (const prop of PROPS) {
    const sprite = library.get(prop.sprite);
    const x = prop.xFraction * STAGE_WIDTH - (sprite.width * prop.scale) / 2;
    drawAt(ctx, sprite, x, prop.feetFraction * STAGE_HEIGHT - sprite.height * prop.scale, prop.scale);
  }
}

function drawWalkers(ctx: CanvasRenderingContext2D, library: SpriteLibrary, timeMs: number): void {
  for (const walker of WALKERS) {
    drawWalker(ctx, library.get(walkerFrameName(walker, timeMs)), walker, timeMs);
  }
}

function drawWalker(ctx: CanvasRenderingContext2D, frame: Sprite, walker: WalkerPlacement, timeMs: number): void {
  const minX = walker.minFraction * STAGE_WIDTH;
  const { x, facing } = pingPongX(timeMs + walker.phaseOffsetMs, minX, minX, walker.maxFraction * STAGE_WIDTH, walker.speedPerMs);
  const width = frame.width * walker.scale;
  const height = frame.height * walker.scale;
  ctx.save();
  ctx.translate(x, walker.feetFraction * STAGE_HEIGHT - height);
  ctx.scale(facing, 1);
  ctx.drawImage(frame.image, -width / 2, 0, width, height);
  ctx.restore();
}

/** Walk cycle run/stand/run/stand, with a cheer pose for the first part of each cheer period. */
function walkerFrameName(walker: WalkerPlacement, timeMs: number): string {
  const prefix = `kid_${walker.colour}`;
  if (isCheering(timeMs, walker.phaseOffsetMs)) {
    return `${prefix}_cheer_front_a`;
  }
  const cycle = [`${prefix}_run_front_a`, `${prefix}_stand_front`, `${prefix}_run_side_b`, `${prefix}_stand_front`];
  return cycle[walkFrameIndex(timeMs, cycle.length, walker.phaseOffsetMs)];
}


function drawWater(ctx: CanvasRenderingContext2D, library: SpriteLibrary, timeMs: number): void {
  const waterY = WATER_TOP_FRACTION * STAGE_HEIGHT;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, waterY, STAGE_WIDTH, STAGE_HEIGHT - waterY);
  ctx.clip();
  for (const lane of DRAGON_BOAT_LANES) drawDragonBoat(ctx, library, lane, timeMs);
  for (const lane of KAYAK_LANES) drawKayak(ctx, library, lane, timeMs);
  ctx.restore();
}

function drawDragonBoat(ctx: CanvasRenderingContext2D, library: SpriteLibrary, lane: DragonBoatLane, timeMs: number): void {
  const sprite = library.get(lane.sprite);
  const x = laneX(lane.startFraction, lane.speedPerMs, timeMs, BOAT_MARGIN);
  const bob = Math.sin((timeMs / 1800) * Math.PI * 2) * 3;
  drawOnWaterline(ctx, sprite, x, lane.laneFraction * STAGE_HEIGHT + bob, lane.scale, "waterline_stern");
}

function drawKayak(ctx: CanvasRenderingContext2D, library: SpriteLibrary, lane: KayakLane, timeMs: number): void {
  const x = laneX(lane.startFraction, lane.speedPerMs, timeMs, BOAT_MARGIN);
  const bob = Math.sin(((timeMs + lane.phaseOffsetMs) / 1400) * Math.PI * 2) * 2;
  const phase = strokePhaseAt(timeMs, lane.phaseOffsetMs);
  const sprite = library.get(`${lane.sprite}_${phase}`);
  drawOnWaterline(ctx, sprite, x, lane.laneFraction * STAGE_HEIGHT + bob, lane.scale, "waterline_stern");
  drawBladeSplash(ctx, library, lane, timeMs);
}

/** Splash at the blade entry (start of the most recent catch), fading over SPLASH_LIFETIME_MS. */
function drawBladeSplash(ctx: CanvasRenderingContext2D, library: SpriteLibrary, lane: KayakLane, timeMs: number): void {
  const age = millisSinceCatch(timeMs, lane.phaseOffsetMs);
  if (age > SPLASH_LIFETIME_MS) return;
  const catchTime = timeMs - age;
  const catchX = laneX(lane.startFraction, lane.speedPerMs, catchTime, BOAT_MARGIN);
  const splash = library.get(SPLASH_SPRITE);
  const progress = age / SPLASH_LIFETIME_MS;
  const size = 0.3 + progress * 0.4;
  ctx.save();
  ctx.globalAlpha = 1 - progress;
  drawAt(ctx, splash, catchX + 40 * lane.scale - (splash.width * size) / 2, lane.laneFraction * STAGE_HEIGHT - (splash.height * size) / 2, size);
  ctx.restore();
}

function laneX(startFraction: number, speedPerMs: number, timeMs: number, margin: number): number {
  return wrapX(startFraction * STAGE_WIDTH + speedPerMs * timeMs, STAGE_WIDTH, margin);
}

function drawOnWaterline(ctx: CanvasRenderingContext2D, sprite: Sprite, x: number, laneY: number, scale: number, anchor: string): void {
  const point = sprite.anchors[anchor];
  if (!point) throw new Error(`missing anchor ${anchor} on ${sprite.name}`);
  drawAt(ctx, sprite, x - point[0] * scale, laneY - point[1] * scale, scale);
}

function drawAt(ctx: CanvasRenderingContext2D, sprite: Sprite, x: number, y: number, scale: number): void {
  ctx.drawImage(sprite.image, x, y, sprite.width * scale, sprite.height * scale);
}
