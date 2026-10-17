/** Scene composition (spec §5): backdrop + layers of animated entities.
 *  All placements are world pixels in the 2752x1536 backdrop space; tuned
 *  against QA stills and the populated-reference backdrop. */
import { createRng } from "../lib/rng";
import type { SpriteStore } from "../lib/sprites";
import type { Anchors, Ctx, Entity, RenderEnv, SpriteImage } from "../lib/types";
import { KITS, createCheerer, createIdler, createWalker } from "../objects/character";
import { createCloud } from "../objects/cloud";
import { createDragonBoat } from "../objects/dragonBoat";
import { createKayak } from "../objects/kayak";
import { createHanging, createProp } from "../objects/prop";
import { createRipple } from "../objects/waterFx";

export const WORLD_WIDTH = 2752;
export const WORLD_HEIGHT = 1536;
export const BACKDROP_URL = "/backdrops/kallang-day-clean.jpeg";

const L = { cloud: 10, propBack: 20, peopleBack: 26, propFront: 30, peopleFront: 36,
            boatFar: 40, ripple: 45, boatMid: 50, boatNear: 60 } as const;

export function buildScene(store: SpriteStore, anchors: Anchors, seed: number): Entity[] {
  const rng = createRng(seed);
  const entities: Entity[] = [
    ...buildClouds(store, rng),
    ...buildProps(store),
    ...buildPeople(store, rng),
    ...buildBoats(store, anchors),
    ...buildRipples(store, rng),
  ];
  return entities.sort((a, b) => a.layer - b.layer);
}

export function renderScene(ctx: Ctx, backdrop: SpriteImage, entities: readonly Entity[], env: RenderEnv): void {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(backdrop as CanvasImageSource, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  for (const entity of entities) entity.draw(ctx, env);
}

function buildClouds(store: SpriteStore, rng: ReturnType<typeof createRng>): Entity[] {
  const picks: Array<[string, number, number]> = [
    ["cloud-16", 150, 340], ["cloud-05", 78, 230], ["cloud-10", 205, 250],
    ["cloud-02", 52, 190], ["cloud-22", 235, 420], ["cloud-13", 120, 280],
    ["cloud-07", 40, 220], ["cloud-24", 262, 350],
  ];
  return picks.map(([spriteId, centreY, width]) => createCloud(store, {
    spriteId, centreY, width, alpha: 0.85,
    speedPxPerSec: rng.range(6, 16), startX: rng.range(0, WORLD_WIDTH),
    worldWidth: WORLD_WIDTH, layer: L.cloud,
  }));
}

function buildProps(store: SpriteStore): Entity[] {
  const props: Entity[] = [
    createProp(store, { spriteId: "tent-red-v2", x: 430, baselineY: 1172, width: 175, layer: L.propBack }),
    createProp(store, { spriteId: "tent-blue-v2", x: 625, baselineY: 1178, width: 175, layer: L.propBack }),
    createProp(store, { spriteId: "tent-yellow-v2", x: 820, baselineY: 1184, width: 175, layer: L.propBack }),
    createProp(store, { spriteId: "canopy-orange-v2", x: 235, baselineY: 1166, width: 150, layer: L.propBack }),
    createProp(store, { spriteId: "feather-psd-v2-a", x: 322, baselineY: 1176, width: 44, layer: L.propFront, swayDeg: 2.2, swayPeriodSec: 2.2 }),
    createProp(store, { spriteId: "feather-fds-v2", x: 932, baselineY: 1188, width: 44, layer: L.propFront, swayDeg: 2.2, swayPeriodSec: 2.6, phaseOffset: 1.2 }),
    createProp(store, { spriteId: "banner-psd-active-day-red-v1", x: 452, baselineY: 1118, width: 272, layer: L.propBack, swayDeg: 0.8, swayPeriodSec: 3.4 }),
    createProp(store, { spriteId: "arch-start-finish-v1", x: 1990, baselineY: 1256, width: 330, layer: L.propFront }),
    createProp(store, { spriteId: "balloon-arch-v2", x: 1490, baselineY: 1246, width: 225, layer: L.propFront }),
    createProp(store, { spriteId: "podium-v2", x: 2385, baselineY: 1244, width: 200, layer: L.propFront }),
    createProp(store, { spriteId: "trophy-table-v2", x: 2245, baselineY: 1248, width: 135, layer: L.propFront }),
    createProp(store, { spriteId: "flag-rainbow-v2", x: 2165, baselineY: 1250, width: 52, layer: L.propFront, swayDeg: 3.2, swayPeriodSec: 1.9 }),
    createHanging(store, { spriteId: "bunting-v2-a", x: 1110, baselineY: 1178, width: 360, layer: L.propFront, swayDeg: 1.4 }),
    createHanging(store, { spriteId: "bunting-v2-b", x: 1700, baselineY: 1186, width: 360, layer: L.propFront, swayDeg: 1.4, phaseOffset: 1.7 }),
  ];
  return props;
}

function buildPeople(store: SpriteStore, rng: ReturnType<typeof createRng>): Entity[] {
  const people: Entity[] = [];
  const promenadeFront: Array<readonly [number, number]> = [[-60, 1204], [300, 1236], [800, 1262], [2820, 1274]];
  const promenadeBack: Array<readonly [number, number]> = promenadeFront.map(([x, y]) => [x, y - 30] as const);
  const walkLanes = [
    { path: promenadeBack, height: 56, layer: L.peopleBack },
    { path: promenadeFront, height: 66, layer: L.peopleFront },
  ];
  for (const lane of walkLanes) {
    for (let i = 0; i < 5; i += 1) {
      people.push(createWalker(store, {
        kit: rng.pick(KITS), feetY: lane.path[1]?.[1] ?? 1230, path: lane.path, height: lane.height,
        startX: rng.range(0, WORLD_WIDTH), speedPxPerSec: rng.range(34, 62) * (i % 2 ? -1 : 1),
        stridePeriodSec: rng.range(0.42, 0.55), worldWidth: WORLD_WIDTH,
        layer: lane.layer, phaseOffset: rng.next(),
      }));
    }
  }
  for (let i = 0; i < 3; i += 1) { // joggers, front lane, faster stride
    people.push(createWalker(store, {
      kit: rng.pick(KITS), feetY: 1280, path: promenadeFront.map(([x, y]) => [x, y + 8] as const), height: 68,
      startX: rng.range(0, WORLD_WIDTH), speedPxPerSec: rng.range(105, 135) * (i % 2 ? 1 : -1),
      stridePeriodSec: 0.3, worldWidth: WORLD_WIDTH, layer: L.peopleFront, phaseOffset: rng.next(),
    }));
  }
  const cheerSpots: Array<[number, number, number]> = [
    [1870, 1266, 64], [2110, 1266, 64], [2310, 1262, 62], [2480, 1262, 62],
    [1375, 1252, 60], [1605, 1252, 60], [760, 1112, 44], [905, 1112, 44], [520, 1196, 54],
  ];
  for (const [x, feetY, height] of cheerSpots) {
    people.push(createCheerer(store, {
      kit: rng.pick(KITS), x, feetY, height, layer: L.peopleFront, phaseOffset: rng.next(),
    }));
  }
  const idleSpots: Array<[number, number, number]> = [
    [300, 1206, 54], [700, 1202, 54], [1010, 1212, 56], [1260, 1224, 58], [2190, 1218, 56],
  ];
  for (const [x, feetY, height] of idleSpots) {
    people.push(createIdler(store, {
      kit: rng.pick(KITS), x, feetY, height, layer: L.peopleBack,
      periodSec: rng.range(4, 7.5), phaseOffset: rng.next(),
    }));
  }
  return people;
}

function buildBoats(store: SpriteStore, anchors: Anchors): Entity[] {
  const common = { worldWidth: WORLD_WIDTH };
  return [
    createDragonBoat(store, anchors.dragonBoat, {
      ...common, spriteId: "dragon-boat-purple", waterlineY: 1388, width: 470,
      speedPxPerSec: -58, startX: 1950, phaseOffset: 0.35, periodScale: 1.04, layer: L.boatFar,
    }),
    createKayak(store, anchors.kayak, {
      ...common, spriteId: "kayak-blue-k2-a", kind: "k2", waterlineY: 1402, width: 295,
      speedPxPerSec: -82, startX: 750, phaseOffset: 0.1, periodScale: 1, layer: L.boatFar,
    }),
    createDragonBoat(store, anchors.dragonBoat, {
      ...common, spriteId: "dragon-boat-green", waterlineY: 1430, width: 560,
      speedPxPerSec: -66, startX: 320, phaseOffset: 0.72, periodScale: 0.96, layer: L.boatMid,
    }),
    createKayak(store, anchors.kayak, {
      ...common, spriteId: "kayak-red-k1-a", kind: "k1", waterlineY: 1444, width: 300,
      speedPxPerSec: 92, startX: 1500, phaseOffset: 0.55, periodScale: 0.94, layer: L.boatMid,
    }),
    createKayak(store, anchors.kayak, {
      ...common, spriteId: "kayak-coral-k3", kind: "k3", waterlineY: 1438, width: 325,
      speedPxPerSec: -78, startX: 2450, phaseOffset: 0.28, periodScale: 1.02, layer: L.boatMid,
    }),
    createDragonBoat(store, anchors.dragonBoat, {
      ...common, spriteId: "dragon-boat-red", waterlineY: 1470, width: 705,
      speedPxPerSec: -74, startX: 1250, phaseOffset: 0.05, periodScale: 1, layer: L.boatNear,
    }),
    createKayak(store, anchors.kayak, {
      ...common, spriteId: "kayak-green-k2-b", kind: "k2", waterlineY: 1494, width: 345,
      speedPxPerSec: -98, startX: 2650, phaseOffset: 0.8, periodScale: 0.9, layer: L.boatNear,
    }),
    createKayak(store, anchors.kayak, {
      ...common, spriteId: "kayak-yellow-k1-b", kind: "k1", waterlineY: 1514, width: 310,
      speedPxPerSec: 88, startX: 120, phaseOffset: 0.42, periodScale: 1.05, layer: L.boatNear,
    }),
  ];
}

function buildRipples(store: SpriteStore, rng: ReturnType<typeof createRng>): Entity[] {
  const spots: Array<[number, number]> = [[300, 1360], [1050, 1315], [1750, 1375], [2450, 1330], [650, 1460], [2100, 1470]];
  return spots.map(([x, y], i) => createRipple(store, {
    spriteId: i % 2 ? "ripple-v2-03" : "ripple-v1-01", x, y,
    width: rng.range(90, 150), periodSec: rng.range(2.6, 4.2),
    phaseOffset: rng.next(), layer: L.ripple,
  }));
}
