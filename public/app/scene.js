/**
 * Scene builder — pure function of (config, spriteManifest, compositeManifest).
 * Owns ALL sprite-variation decisions (which colours, lanes, speeds, phases),
 * so the animation loop itself never rolls dice.
 */
import { makeRandom } from "./rng.js";

function piecesOfClass(manifest, cls) {
  return manifest.pieces.filter((p) => p.class === cls);
}

function countByClass(manifest) {
  const counts = {};
  for (const p of manifest.pieces) counts[p.class] = (counts[p.class] || 0) + 1;
  return counts;
}

function buildClouds(config, manifest, rng) {
  const { count, classes, yBands, classScale, speed, alpha } = config.clouds;
  const counts = countByClass(manifest);
  const clouds = [];
  for (let i = 0; i < count; i += 1) {
    const cls = classes[i % classes.length];
    const band = yBands[i % yBands.length];
    const [s0, s1] = classScale[classes.indexOf(cls)];
    clouds.push({
      cls,
      index: rng.int(0, counts[cls] - 1),
      x: rng.range(-200, config.world.width + 200),
      y: rng.range(band[0], band[1]),
      scale: rng.range(s0, s1),
      speed: rng.range(speed[0], speed[1]),
      dir: i % 2 === 0 ? -1 : 1,
      alpha: rng.range(alpha[0], alpha[1]),
      phase: rng.range(0, Math.PI * 2),
    });
  }
  return clouds;
}

function laneBoatCounts(config) {
  const dragonLanes = config.lanes.filter((l) => l.traffic === "dragon").length;
  const smallLanes = config.lanes.filter((l) => l.traffic === "small").length;
  return {
    dragon: fillLanes(config.boats.dragonCount, dragonLanes),
    small: fillLanes(config.boats.smallCount, smallLanes),
  };
}

function fillLanes(total, laneCount) {
  const per = Array(laneCount).fill(Math.floor(total / laneCount));
  for (let i = 0; i < total - per.reduce((a, b) => a + b, 0); i += 1) per[i] += 1;
  return per;
}

function buildBoats(config, compositeManifest, rng) {
  const dragonKeys = rng.shuffle(Object.keys(compositeManifest.detail["dragon-boat"]));
  const smallKeys = rng.shuffle(Object.keys(compositeManifest.detail["small-boat"]));
  const perLane = laneBoatCounts(config);
  const rank = { dragon: 0, small: 0 };
  const cursor = { dragon: 0, small: 0 };
  const boats = [];
  config.lanes.forEach((lane, laneIndex) => {
    const kind = lane.traffic;
    const laneRank = rank[kind];
    rank[kind] += 1;
    const nInLane = perLane[kind][laneRank];
    for (let i = 0; i < nInLane; i += 1) {
      const variantKey = kind === "dragon" ? dragonKeys[cursor.dragon] : smallKeys[cursor.small];
      cursor[kind] += 1;
      const detailClass = kind === "dragon" ? "dragon-boat" : "small-boat";
      const [sp0, sp1] = config.boats.speed[kind];
      boats.push({
        kind,
        variantKey,
        entry: compositeManifest.detail[detailClass][variantKey],
        laneIndex,
        x0: ((i + 0.5) / nInLane) * config.world.width + rng.range(-90, 90),
        speed: rng.range(sp0, sp1),
        dir: lane.dir,
        phase: rng.range(0, Math.PI * 2),
        bobPhase: rng.range(0, Math.PI * 2),
        wakeIndex: rng.pick(config.wakeSprites),
        splashIndex: rng.pick(config.splashSprites),
      });
    }
  });
  return boats;
}

function buildWalkers(config, spriteManifest, rng) {
  const counts = countByClass(spriteManifest);
  const colors = rng.shuffle(config.colors);
  const walkers = [];
  for (let i = 0; i < config.walkers.count; i += 1) {
    const path = config.walkers.paths[i % config.walkers.paths.length];
    const color = colors[i % colors.length];
    walkers.push({
      color,
      poseKey: config.colorPoseKey[color],
      index: rng.int(0, counts[color] - 1),
      pathIndex: i % config.walkers.paths.length,
      x0: path.x0 + ((path.x1 - path.x0) * (i + 0.5)) / config.walkers.count,
      dir: i % 2 === 0 ? -1 : 1,
      speed: rng.range(config.walkers.speed[0], config.walkers.speed[1]),
      fps: rng.range(config.walkers.fps[0], config.walkers.fps[1]),
      phase: rng.range(0, Math.PI * 2),
      framePhase: rng.int(0, 2),
    });
  }
  return walkers;
}

function buildCheerers(config, spriteManifest, rng) {
  const counts = countByClass(spriteManifest);
  const colors = rng.shuffle(config.colors);
  const [f0, f1] = config.animation.cheerFps;
  return config.cheerers.spots.map(([x, y], i) => ({
    color: colors[i % colors.length],
    poseKey: config.colorPoseKey[colors[i % colors.length]],
    index: rng.int(0, counts[colors[i % colors.length]] - 1),
    x,
    y,
    group: i % 2 === 0 ? "cheer" : "cheer2",
    fps: rng.range(f0, f1),
    phase: rng.range(0, 4),
  }));
}

function buildRipples(config, rng) {
  const { band, holdSec, slots } = config.ripples;
  const cells = (band.x1 - band.x0) / slots;
  return Array.from({ length: slots }, (_, i) => {
    const x = band.x0 + cells * (i + 0.5) + rng.range(-cells / 3, cells / 3);
    // Rings keep clear of structures: left of the quay they stay in the open
    // water strip; right of it they drop below the pier face (rings are wide).
    const yLo = x > 1780 ? 1445 : band.y0;
    const yHi = x > 1780 ? band.y1 : 1330;
    return {
      x,
      y: rng.range(yLo, yHi),
      born: i * 0.85,
      hold: rng.range(holdSec[0], holdSec[1]),
      period: rng.range(3.2, 5.6),
      scale: rng.range(config.ripples.scale[0], config.ripples.scale[1]),
      frameOffset: rng.int(0, config.ripples.frames.length - 1),
    };
  });
}

function validateProps(config, spriteManifest) {
  const counts = countByClass(spriteManifest);
  for (const prop of config.props) {
    if (!(prop.class in counts)) throw new Error(`prop class missing: ${prop.class}`);
    if (prop.index >= counts[prop.class]) {
      throw new Error(`prop index out of range: ${prop.class}-${prop.index}`);
    }
  }
  return config.props.map((p) => ({ ...p }));
}

/** Build the full deterministic scene state. Throws on config/manifest mismatch. */
export function buildScene(config, spriteManifest, compositeManifest) {
  const rng = makeRandom(config.seed);
  return {
    seed: config.seed,
    clouds: buildClouds(config, spriteManifest, rng),
    boats: buildBoats(config, compositeManifest, rng),
    walkers: buildWalkers(config, spriteManifest, rng),
    cheerers: buildCheerers(config, spriteManifest, rng),
    ripples: buildRipples(config, rng),
    props: validateProps(config, spriteManifest),
  };
}
