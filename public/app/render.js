/**
 * Canvas renderer — draws one scene frame at time `t`.
 * Layer order (SPEC §5): backdrop -> clouds -> props -> actors -> water FX -> boats.
 */
import {
  bobY, frameAt, oarAngle, shouldSplash, strokeDepth, wrap,
} from "./animation.js";

const pad2 = (n) => String(n).padStart(2, "0");

export function spriteUrl(assets, cls, index) {
  const piece = assets.spriteIndex.get(`${cls}-${pad2(index)}`);
  if (!piece) throw new Error(`missing sprite ${cls}-${index}`);
  return piece.url;
}

export function computeView(canvas, world) {
  const scale = Math.min(canvas.width / world.width, canvas.height / world.height);
  return {
    scale,
    ox: (canvas.width - world.width * scale) / 2,
    oy: (canvas.height - world.height * scale) / 2,
  };
}

function withTransform(ctx, view, fn) {
  ctx.save();
  ctx.translate(view.ox, view.oy);
  ctx.scale(view.scale, view.scale);
  fn();
  ctx.restore();
}

function drawBackdrop(ctx, image, world) {
  if (!image) {
    ctx.fillStyle = "#7ec8e3";
    ctx.fillRect(0, 0, world.width, world.height);
    return;
  }
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(image, 0, 0, world.width, world.height);
  ctx.imageSmoothingEnabled = false;
}

function drawBottomAnchored(ctx, image, x, y, scale) {
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.drawImage(image, x - w / 2, y - h, w, h);
}

function drawClouds(ctx, assets, scene, t) {
  for (const cloud of scene.clouds) {
    const img = assets.images.get(spriteUrl(assets, cloud.cls, cloud.index));
    if (!img) continue;
    const span = cloud.x + 400;
    const x = wrap(cloud.x + cloud.dir * cloud.speed * t, -400, span);
    const y = cloud.y + Math.sin(t * 0.1 + cloud.phase) * 6;
    ctx.globalAlpha = cloud.alpha;
    const w = img.width * cloud.scale;
    const h = img.height * cloud.scale;
    ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
  }
  ctx.globalAlpha = 1;
}

function drawProps(ctx, assets, scene) {
  for (const prop of scene.props) {
    const img = assets.images.get(spriteUrl(assets, prop.class, prop.index));
    if (!img) continue;
    drawBottomAnchored(ctx, img, prop.x, prop.y, prop.scale);
  }
}

function poseFrames(config, actor, group) {
  return config.poses[actor.poseKey][group];
}

function drawWalkers(ctx, assets, scene, config, t) {
  for (const w of scene.walkers) {
    const path = config.walkers.paths[w.pathIndex];
    const x = wrap(w.x0 + w.dir * w.speed * t, path.x0, path.x1);
    const frames = poseFrames(config, w, "walk");
    const frame = frameAt(frames, t, w.fps, w.framePhase);
    const img = assets.images.get(spriteUrl(assets, w.color, frame));
    if (!img) continue;
    const s = config.walkers.scale;
    ctx.save();
    ctx.translate(x, path.y);
    ctx.scale(w.dir > 0 ? s : -s, s);
    ctx.drawImage(img, -img.width / 2, -img.height);
    ctx.restore();
  }
}

function drawCheerers(ctx, assets, scene, config, t) {
  for (const c of scene.cheerers) {
    const frames = poseFrames(config, c, c.group);
    const frame = frameAt(frames, t, c.fps, c.phase);
    const img = assets.images.get(spriteUrl(assets, c.color, frame));
    if (!img) continue;
    drawBottomAnchored(ctx, img, c.x, c.y, config.cheerers.scale);
  }
}

function rippleState(slot, t) {
  const age = t - slot.born;
  if (age < 0) return null;
  const inCycle = age % slot.period;
  if (inCycle >= slot.hold) return null;
  const fadeIn = Math.min(1, inCycle * 3);
  const fadeOut = Math.min(1, (slot.hold - inCycle) * 2);
  return { frameStep: Math.floor(inCycle * 3), fade: Math.min(fadeIn, fadeOut) };
}

function drawRipples(ctx, assets, scene, config, t) {
  const [a0, a1] = config.animation.rippleAlpha;
  for (const slot of scene.ripples) {
    const state = rippleState(slot, t);
    if (!state) continue;
    const frames = config.ripples.frames;
    const idx = frames[(state.frameStep + slot.frameOffset) % frames.length];
    const img = assets.images.get(spriteUrl(assets, "ripple", idx));
    if (!img) continue;
    ctx.globalAlpha = (a0 + a1) / 2 * state.fade;
    const w = img.width * slot.scale;
    const h = img.height * slot.scale;
    ctx.drawImage(img, slot.x - w / 2, slot.y - h / 2, w, h);
  }
  ctx.globalAlpha = 1;
}

function boatX(config, boat, t) {
  const m = config.boats.margin;
  return wrap(boat.x0 + boat.dir * boat.speed * t, -m, config.world.width + m);
}

function drawWake(ctx, assets, boat, config) {
  const img = assets.images.get(spriteUrl(assets, "wake", boat.wakeIndex));
  if (!img) return;
  const stretch = Math.min(0.9, 0.35 + boat.speed / 120);
  const w = img.width * stretch;
  const h = img.height * 0.45;
  const sternX = boat.entry.hull_size[0];
  const y = boat.entry.hull_size[1] * 0.95;
  ctx.globalAlpha = config.animation.wakeAlpha ?? 0.7;
  ctx.drawImage(img, sternX + w * 0.08, y - h / 2, w, h);
  ctx.globalAlpha = 1;
}

function drawOar(ctx, assets, boat, config, t, anchor, i) {
  const entry = boat.entry;
  const isDragon = boat.kind === "dragon";
  const anim = isDragon ? config.animation.dragonOar : config.animation.kayakPaddle;
  const [w, h] = entry.hull_size;
  const ax = anchor.x * w;
  const ay = anchor.y * h;
  const phase = boat.phase + i * anim.phaseStep;
  const angle = oarAngle(entry.rest_angle_deg, anim.swingDeg, entry.stroke.fps, t, phase);
  const spriteUrl_ = isDragon ? entry.oar_sprite : entry.paddle_sprite;
  const pivot = isDragon ? entry.oar_pivot : entry.paddle_pivot;
  const img = assets.images.get(spriteUrl_);
  if (!img) return;
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.drawImage(img, -pivot[0], -pivot[1]);
  drawBladeSplash(ctx, assets, boat, config, t, phase, img, pivot, entry.stroke.fps, isDragon);
  ctx.restore();
}

function drawBladeSplash(ctx, assets, boat, config, t, phase, oarImg, pivot, fps, isDragon) {
  const depth = strokeDepth(fps, t, phase);
  // Dragon blades dig deepest near angle 0 (depth > 0); kayak paddles dig at
  // most-negative rake (depth < 0) — flip the sign so both pulse on the deep beat.
  const sign = isDragon ? -1 : 1;
  const threshold = config.animation.splashThreshold;
  if (!shouldSplash(depth * sign, threshold)) return;
  const floor = Math.abs(threshold);
  const strength = Math.min(1, (Math.abs(depth) - floor) / (1 - floor));
  const alphaFloor = 0.35;
  // Drawn inside the oar's rotated frame, so use the raw local tip offset:
  // rotation + flip carry it to the physical blade position.
  const tipLocal = isDragon ? [0, oarImg.height - pivot[1]] : [-pivot[0], 0];
  const img = assets.images.get(spriteUrl(assets, config.splashClass, boat.splashIndex));
  if (!img) return;
  const scale = (isDragon ? 0.85 : 0.6) * (0.7 + 0.3 * strength);
  ctx.globalAlpha = (config.animation.splashAlpha ?? 0.9)
    * (alphaFloor + (1 - alphaFloor) * strength);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, tipLocal[0] - w / 2, tipLocal[1] - h / 2, w, h);
  ctx.globalAlpha = 1;
}

function drawBoat(ctx, assets, scene, config, t) {
  for (const boat of scene.boats) {
    const lane = config.lanes[boat.laneIndex];
    const x = boatX(config, boat, t);
    const y = lane.y + bobY(t, config.animation.bob.amp, config.animation.bob.freq, boat.bobPhase);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale((boat.dir === -1 ? 1 : -1) * lane.scale, lane.scale);
    ctx.translate(-boat.entry.hull_size[0] / 2, 0);
    drawWake(ctx, assets, boat, config);
    const hull = assets.images.get(boat.entry.hull);
    if (hull) ctx.drawImage(hull, 0, 0);
    boat.entry.anchors.forEach((anchor, i) => drawOar(ctx, assets, boat, config, t, anchor, i));
    ctx.restore();
  }
}

/** Draw a full frame for the given canvas. */
export function drawFrame(ctx, assets, scene, config, t, canvas) {
  const view = computeView(canvas, config.world);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0b1d2a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  withTransform(ctx, view, () => {
    drawBackdrop(ctx, assets.images.get(config.currentBackdropUrl), config.world);
    drawClouds(ctx, assets, scene, t);
    drawProps(ctx, assets, scene);
    drawCheerers(ctx, assets, scene, config, t);
    drawWalkers(ctx, assets, scene, config, t);
    drawRipples(ctx, assets, scene, config, t);
    drawBoat(ctx, assets, scene, config, t);
  });
}
