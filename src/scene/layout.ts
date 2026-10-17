/**
 * Scene layout in backdrop pixels (the backdrop is 2752 x 1536). Positions are
 * fractions of the stage so the same layout works at any zoom. Changing a value
 * here is the calibration loop: adjust, run the screenshot script, inspect, repeat.
 */

export const WATER_TOP_FRACTION = 0.8;

export interface DragonBoatLane {
  readonly sprite: string;
  readonly laneFraction: number;
  readonly speedPerMs: number;
  readonly startFraction: number;
  readonly scale: number;
}

export interface KayakLane {
  readonly sprite: string;
  readonly laneFraction: number;
  readonly speedPerMs: number;
  readonly startFraction: number;
  readonly scale: number;
  readonly phaseOffsetMs: number;
}

export interface PropPlacement {
  readonly sprite: string;
  readonly xFraction: number;
  readonly feetFraction: number;
  readonly scale: number;
}

export interface WalkerPlacement {
  readonly colour: "red" | "blue" | "green" | "yellow" | "orange" | "purple";
  readonly minFraction: number;
  readonly maxFraction: number;
  readonly feetFraction: number;
  readonly speedPerMs: number;
  readonly scale: number;
  readonly phaseOffsetMs: number;
}

export const DRAGON_BOAT_LANES: readonly DragonBoatLane[] = [
  { sprite: "dragon_boat_red", laneFraction: 0.86, speedPerMs: -0.055, startFraction: 0.9, scale: 0.42 },
];

export const KAYAK_LANES: readonly KayakLane[] = [
  { sprite: "kayak_red_1seat", laneFraction: 0.915, speedPerMs: 0.04, startFraction: 0.1, scale: 0.62, phaseOffsetMs: 0 },
  { sprite: "kayak_green_2seat", laneFraction: 0.955, speedPerMs: 0.03, startFraction: 0.45, scale: 0.62, phaseOffsetMs: 400 },
];

export const PROPS: readonly PropPlacement[] = [
  { sprite: "outpost_tent_00", xFraction: 0.58, feetFraction: 0.73, scale: 0.42 },
  { sprite: "outpost_tent_01", xFraction: 0.66, feetFraction: 0.73, scale: 0.42 },
];

export const WALKERS: readonly WalkerPlacement[] = [
  { colour: "red", minFraction: 0.55, maxFraction: 0.7, feetFraction: 0.775, speedPerMs: 0.02, scale: 0.3, phaseOffsetMs: 0 },
  { colour: "blue", minFraction: 0.72, maxFraction: 0.9, feetFraction: 0.79, speedPerMs: 0.018, scale: 0.3, phaseOffsetMs: 700 },
  { colour: "yellow", minFraction: 0.6, maxFraction: 0.92, feetFraction: 0.77, speedPerMs: 0.015, scale: 0.3, phaseOffsetMs: 1500 },
];

export const CLOUD_COUNT = 9;
export const CLOUD_BAND = { top: 0.04, bottom: 0.26 } as const;
