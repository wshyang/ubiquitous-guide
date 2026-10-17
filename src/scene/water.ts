/**
 * Navigable water. The left jetty and the right dock are straight diagonal edges in
 * backdrop pixels, so a boat stays between them by clamping its footprint to the
 * span that is clear of both edges at the boat's lane height.
 */
import { STAGE_WIDTH } from "./stage";

const LEFT_EDGE = { yAnchor: 1220, xAnchor: 460, slope: -1.77 } as const;
const RIGHT_EDGE = { yAnchor: 1230, xAnchor: 2400, slope: 1.35 } as const;

export interface LaneSpan {
  readonly min: number;
  readonly max: number;
}

/** Leftmost water x at height y (the jetty edge, or 0 on land). */
export function shoreLeft(y: number): number {
  const edge = LEFT_EDGE.xAnchor + (y - LEFT_EDGE.yAnchor) * LEFT_EDGE.slope;
  return Math.max(0, edge);
}

/** Rightmost water x at height y (the dock edge, or the stage edge). */
export function shoreRight(y: number): number {
  const edge = RIGHT_EDGE.xAnchor + (y - RIGHT_EDGE.yAnchor) * RIGHT_EDGE.slope;
  return Math.min(STAGE_WIDTH, edge);
}

/** Range for the left edge of a sprite of `footprint` width that keeps it clear of both edges. */
export function laneSpan(laneY: number, footprint: number, margin: number): LaneSpan {
  const min = shoreLeft(laneY) + margin;
  const max = shoreRight(laneY) - margin - footprint;
  if (max < min) {
    throw new Error(`lane at y=${laneY} is too narrow for a ${footprint}px sprite`);
  }
  return { min, max };
}
