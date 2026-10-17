/**
 * Scene composition. Each layer is a pure function of simulated time, so the frame at
 * time t is fully determined by t and the layout constants.
 */
import {
  BALL_PEAK,
  BALL_PERIOD_MS,
  BALL_SCALE,
  CLOUD_BAND,
  CLOUD_COUNT,
  COURT_PLAYERS,
  CROWD_SCALE,
  DRAGON_BOAT_LANES,
  KAYAK_LANES,
  PASSAGES,
  PLAYER_SCALE,
  PROPS,
  type BoatLane,
  type KidColour,
  type Passage,
  type PropPlacement,
} from "./layout";
import type { Sprite, SpriteLibrary } from "./sprites";
import { STAGE_HEIGHT, STAGE_WIDTH } from "./stage";
import {
  SPLASH_LIFETIME_MS,

  bounceHeight,
  isCheering,
  millisSinceCatch,
  pathSampleAt,
  pingPongX,
  seededUnit,
  strokePhaseAt,
  walkFrameIndex,
  wrapX,
  type PathSample,
} from "./timing";
import { laneSpan } from "./water";

export { STAGE_HEIGHT, STAGE_WIDTH } from "./stage";

const CLOUD_MARGIN = 400;
const BASKETBALL = "event_prop_04";
const SPLASH_SPRITE = "splash_00";
const BOAT_EDGE_MARGIN = 40;
const WATER_CLIP_TOP = 1210;
const KIDS: readonly KidColour[] = ["red", "blue", "green", "yellow"];

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
      drawCrowd(ctx, library, timeMs);
      drawCourts(ctx, library, timeMs);
      drawWater(ctx, library, timeMs);
    },
  };
}

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
    drawProp(ctx, library.get(prop.sprite), prop);
  }
}

function drawProp(ctx: CanvasRenderingContext2D, sprite: Sprite, prop: PropPlacement): void {
  const x = prop.xFraction * STAGE_WIDTH - (sprite.width * prop.scale) / 2;
  drawAt(ctx, sprite, x, prop.feetFraction * STAGE_HEIGHT - sprite.height * prop.scale, prop.scale);
}

/** Everyone on the passages. Each walker gets a colour and phase derived from its index. */
function drawCrowd(ctx: CanvasRenderingContext2D, library: SpriteLibrary, timeMs: number): void {
  let index = 0;
  for (const passage of PASSAGES) {
    for (let slot = 0; slot < passage.walkers; slot += 1) {
      drawWalker(ctx, library, passage, index, timeMs);
      index += 1;
    }
  }
}

function drawWalker(ctx: CanvasRenderingContext2D, library: SpriteLibrary, passage: Passage, index: number, timeMs: number): void {
  const colour = KIDS[index % KIDS.length];
  const phaseOffsetMs = Math.round(seededUnit(index + 500) * 2000);
  const startDistance = seededUnit(index + 700) * 4000;
  const sample = pathSampleAt(passage.points, timeMs + phaseOffsetMs, passage.speedPerMs, startDistance);
  drawFigure(ctx, library.get(walkFrameName(colour, timeMs + phaseOffsetMs)), sample, CROWD_SCALE);
}

function drawCourts(ctx: CanvasRenderingContext2D, library: SpriteLibrary, timeMs: number): void {
  COURT_PLAYERS.forEach((player, index) => {
    const sample = pathSampleAt(player.points, timeMs, player.speedPerMs, player.startDistance);
    const colour = KIDS[index % KIDS.length];
    drawFigure(ctx, library.get(walkFrameName(colour, timeMs)), sample, PLAYER_SCALE);
    if (player.withBall) {
      drawBall(ctx, library.get(BASKETBALL), sample, timeMs);
    }
  });
}

/** The ball bounces beside the player's hip; the lift is a pure function of time. */
function drawBall(ctx: CanvasRenderingContext2D, ball: Sprite, sample: PathSample, timeMs: number): void {
  const lift = bounceHeight(timeMs, BALL_PERIOD_MS, BALL_PEAK);
  const size = ball.width * BALL_SCALE;
  drawAt(ctx, ball, sample.x + 6 - size / 2, sample.y - lift * 0.9 - size, BALL_SCALE);
}

/** Feet sit on (x, y); the figure is mirrored when walking left. */
function drawFigure(ctx: CanvasRenderingContext2D, frame: Sprite, sample: PathSample, scale: number): void {
  const width = frame.width * scale;
  const height = frame.height * scale;
  ctx.save();
  ctx.translate(sample.x, sample.y - height);
  ctx.scale(sample.facing, 1);
  ctx.drawImage(frame.image, -width / 2, 0, width, height);
  ctx.restore();
}

/** Walk cycle run/stand/run/stand; a cheer pose for the first part of each cheer period. */
function walkFrameName(colour: KidColour, timeMs: number): string {
  const prefix = `kid_${colour}`;
  if (isCheering(timeMs)) {
    return `${prefix}_cheer_front_a`;
  }
  const cycle = [`${prefix}_run_front_a`, `${prefix}_stand_front`, `${prefix}_run_side_b`, `${prefix}_stand_front`];
  return cycle[walkFrameIndex(timeMs, cycle.length)];
}

function drawWater(ctx: CanvasRenderingContext2D, library: SpriteLibrary, timeMs: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, WATER_CLIP_TOP, STAGE_WIDTH, STAGE_HEIGHT - WATER_CLIP_TOP);
  ctx.clip();
  for (const lane of DRAGON_BOAT_LANES) drawDragonBoat(ctx, library, lane, timeMs);
  for (const lane of KAYAK_LANES) drawKayak(ctx, library, lane, timeMs);
  ctx.restore();
}

/** Horizontal position of a lane's boat at time t, plus whether it is mirrored. */
function boatPlacement(lane: BoatLane, sprite: Sprite, timeMs: number): { x: number; mirrored: boolean } {
  const footprint = sprite.width * lane.scale;
  const span = laneSpan(lane.laneY, footprint, BOAT_EDGE_MARGIN);
  const range = span.max - span.min;
  const start = span.min + (lane.startDistance % range);
  const { x, facing } = pingPongX(timeMs + lane.phaseOffsetMs, start, span.min, span.max, lane.speedPerMs);
  const mirrored = lane.bowRight ? facing < 0 : facing > 0;
  return { x, mirrored };
}

/** Dragon boat: head on the left at rest, so it is mirrored when moving right. */
function drawDragonBoat(ctx: CanvasRenderingContext2D, library: SpriteLibrary, lane: BoatLane, timeMs: number): void {
  const sprite = library.get(lane.sprite);
  const { x, mirrored } = boatPlacement(lane, sprite, timeMs);
  const bob = Math.sin((timeMs / 1800) * Math.PI * 2) * 3;
  drawBoatSprite(ctx, sprite, lane, x, mirrored, bob);
}

/** Kayak: bow on the right at rest; the stroke alternates catch and pull composites. */
function drawKayak(ctx: CanvasRenderingContext2D, library: SpriteLibrary, lane: BoatLane, timeMs: number): void {
  const phase = strokePhaseAt(timeMs, lane.phaseOffsetMs);
  const sprite = library.get(`${lane.sprite}_${phase}`);
  const { x, mirrored } = boatPlacement(lane, sprite, timeMs);
  const bob = Math.sin(((timeMs + lane.phaseOffsetMs) / 1400) * Math.PI * 2) * 2;
  drawBoatSprite(ctx, sprite, lane, x, mirrored, bob);
  drawBladeSplash(ctx, library, lane, timeMs);
}

function drawBoatSprite(ctx: CanvasRenderingContext2D, sprite: Sprite, lane: BoatLane, x: number, mirrored: boolean, bob: number): void {
  const stern = sprite.anchors.waterline_stern;
  if (!stern) throw new Error(`missing waterline_stern anchor on ${sprite.name}`);
  const top = lane.laneY + bob - stern[1] * lane.scale;
  drawSpriteAt(ctx, sprite, x, top, lane.scale, mirrored);
}

/**
 * Splash at the blade entry (the start of the most recent catch). The boat's position is
 * evaluated at catch time, so the splash stays on the water where the blade went in.
 */
function drawBladeSplash(ctx: CanvasRenderingContext2D, library: SpriteLibrary, lane: BoatLane, timeMs: number): void {
  const age = millisSinceCatch(timeMs, lane.phaseOffsetMs);
  if (age > SPLASH_LIFETIME_MS) return;
  const catchPose = library.get(`${lane.sprite}_catch`);
  const tip = catchPose.anchors.blade_tip_seat_1;
  const stern = catchPose.anchors.waterline_stern;
  if (!tip || !stern) throw new Error(`missing blade or waterline anchor on ${catchPose.name}`);
  const { x, mirrored } = boatPlacement(lane, catchPose, timeMs - age);
  const footprint = catchPose.width * lane.scale;
  const tipX = mirrored ? x + footprint - tip[0] * lane.scale : x + tip[0] * lane.scale;
  const tipY = lane.laneY + (tip[1] - stern[1]) * lane.scale;
  drawSplash(ctx, library.get(SPLASH_SPRITE), tipX, tipY, age / SPLASH_LIFETIME_MS);
}

function drawSplash(ctx: CanvasRenderingContext2D, splash: Sprite, x: number, y: number, progress: number): void {
  const size = 0.12 + progress * 0.12;
  ctx.save();
  ctx.globalAlpha = 1 - progress;
  drawAt(ctx, splash, x - (splash.width * size) / 2, y - (splash.height * size) / 2, size);
  ctx.restore();
}

function drawSpriteAt(ctx: CanvasRenderingContext2D, sprite: Sprite, x: number, y: number, scale: number, mirrored: boolean): void {
  if (!mirrored) {
    drawAt(ctx, sprite, x, y, scale);
    return;
  }
  ctx.save();
  ctx.translate(x + sprite.width * scale, y);
  ctx.scale(-1, 1);
  ctx.drawImage(sprite.image, 0, 0, sprite.width * scale, sprite.height * scale);
  ctx.restore();
}

function drawAt(ctx: CanvasRenderingContext2D, sprite: Sprite, x: number, y: number, scale: number): void {
  ctx.drawImage(sprite.image, x, y, sprite.width * scale, sprite.height * scale);
}

