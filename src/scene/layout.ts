/**
 * Scene layout in backdrop pixels (2752 x 1536). Values here are the calibration knobs:
 * change one, run the screenshot script, inspect, repeat. Edges that constrain movement
 * (jetty, dock) are in water.ts; this file only places things inside that space.
 */
import type { Point } from "./timing";

export interface BoatLane {
  readonly sprite: string;
  readonly laneY: number;
  readonly speedPerMs: number;
  readonly startDistance: number;
  readonly scale: number;
  readonly phaseOffsetMs: number;
  /** True when the sprite's bow points right at rest (kayaks); false for the dragon head on the left. */
  readonly bowRight: boolean;
}

export const DRAGON_BOAT_LANES: readonly BoatLane[] = [
  { sprite: "dragon_boat_red", laneY: 1400, speedPerMs: 0.05, startDistance: 900, scale: 0.42, phaseOffsetMs: 0, bowRight: false },
];

export const KAYAK_LANES: readonly BoatLane[] = [
  { sprite: "kayak_red_1seat", laneY: 1428, speedPerMs: 0.04, startDistance: 100, scale: 0.62, phaseOffsetMs: 0, bowRight: true },
  { sprite: "kayak_green_2seat", laneY: 1475, speedPerMs: 0.03, startDistance: 600, scale: 0.62, phaseOffsetMs: 400, bowRight: true },
];

export interface PropPlacement {
  readonly sprite: string;
  readonly xFraction: number;
  readonly feetFraction: number;
  readonly scale: number;
}

export const PROPS: readonly PropPlacement[] = [
  { sprite: "outpost_tent_00", xFraction: 0.58, feetFraction: 0.73, scale: 0.42 },
  { sprite: "outpost_tent_01", xFraction: 0.66, feetFraction: 0.73, scale: 0.42 },
];

export type KidColour = "red" | "blue" | "green" | "yellow";

/** Pedestrian passages as polylines in backdrop pixels; feet walk along each line. */
export interface Passage {
  readonly name: string;
  readonly points: readonly Point[];
  readonly walkers: number;
  readonly speedPerMs: number;
}

export const PASSAGES: readonly Passage[] = [
  { name: "waterfront_promenade", points: [{ x: 60, y: 1198 }, { x: 2540, y: 1198 }], walkers: 12, speedPerMs: 0.03 },
  { name: "stadium_forecourt", points: [{ x: 420, y: 1140 }, { x: 1180, y: 1140 }], walkers: 6, speedPerMs: 0.025 },
  { name: "track_surround", points: [{ x: 1620, y: 1186 }, { x: 2180, y: 1186 }], walkers: 5, speedPerMs: 0.028 },
];

/** A ball player on a court, moving along a feet line; `withBall` adds a bouncing basketball. */
export interface CourtPlayer {
  readonly court: string;
  readonly points: readonly Point[];
  readonly speedPerMs: number;
  readonly startDistance: number;
  readonly withBall: boolean;
}

export const COURT_PLAYERS: readonly CourtPlayer[] = [
  { court: "tennis_north", points: [{ x: 2215, y: 1030 }, { x: 2315, y: 1030 }], speedPerMs: 0.04, startDistance: 0, withBall: true },
  { court: "tennis_middle", points: [{ x: 2255, y: 1090 }, { x: 2370, y: 1090 }], speedPerMs: 0.035, startDistance: 60, withBall: false },
  { court: "tennis_south", points: [{ x: 2360, y: 1150 }, { x: 2620, y: 1150 }], speedPerMs: 0.045, startDistance: 40, withBall: true },
  { court: "tennis_south", points: [{ x: 2360, y: 1112 }, { x: 2620, y: 1112 }], speedPerMs: 0.032, startDistance: 150, withBall: false },
  { court: "pitch", points: [{ x: 1790, y: 1100 }, { x: 2030, y: 1100 }], speedPerMs: 0.04, startDistance: 0, withBall: true },
  { court: "pitch", points: [{ x: 1790, y: 1068 }, { x: 2030, y: 1068 }], speedPerMs: 0.036, startDistance: 90, withBall: false },
];

export const BALL_PERIOD_MS = 900;
export const BALL_PEAK = 46;
export const BALL_SCALE = 0.13;
export const CROWD_SCALE = 0.085;
export const PLAYER_SCALE = 0.095;
export const CLOUD_COUNT = 9;
export const CLOUD_BAND = { top: 0.04, bottom: 0.26 } as const;
