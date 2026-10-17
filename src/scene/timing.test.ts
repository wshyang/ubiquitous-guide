import { describe, expect, it } from "vitest";
import {
  STROKE_PERIOD_MS,
  isCheering,
  millisSinceCatch,
  pingPongX,
  seededUnit,
  strokePhaseAt,
  walkFrameIndex,
  wrapX,
} from "./timing";

describe("strokePhaseAt", () => {
  it("catches in the first half of each period and pulls in the second", () => {
    expect(strokePhaseAt(0)).toBe("catch");
    expect(strokePhaseAt(STROKE_PERIOD_MS / 2 - 1)).toBe("catch");
    expect(strokePhaseAt(STROKE_PERIOD_MS / 2)).toBe("pull");
    expect(strokePhaseAt(STROKE_PERIOD_MS)).toBe("catch");
  });

  it("applies a per-boat offset so neighbouring boats are not in lockstep", () => {
    expect(strokePhaseAt(0, STROKE_PERIOD_MS / 2)).toBe("pull");
  });
});

describe("millisSinceCatch", () => {
  it("counts from the most recent catch instant", () => {
    expect(millisSinceCatch(STROKE_PERIOD_MS + 50)).toBe(50);
  });
});

describe("wrapX", () => {
  it("re-enters from the far side once a sprite leaves the stage", () => {
    expect(wrapX(1100, 1000, 100)).toBe(-100);
    expect(wrapX(-150, 1000, 100)).toBe(1050);
    expect(wrapX(500, 1000, 100)).toBe(500);
  });
});

describe("pingPongX", () => {
  it("walks right then turns and walks left between the bounds", () => {
    expect(pingPongX(0, 0, 0, 100, 0.1)).toEqual({ x: 0, facing: 1 });
    expect(pingPongX(500, 0, 0, 100, 0.1)).toEqual({ x: 50, facing: 1 });
    expect(pingPongX(1500, 0, 0, 100, 0.1)).toEqual({ x: 50, facing: -1 });
  });
});

describe("walkFrameIndex", () => {
  it("cycles through every frame once per walk cycle", () => {
    const frames = [0, 1, 2, 3].map((t) => walkFrameIndex(t * 140, 4));
    expect(frames).toEqual([0, 1, 2, 3]);
  });
});

describe("isCheering", () => {
  it("is true only for the first part of the cheer period", () => {
    expect(isCheering(0)).toBe(true);
    expect(isCheering(3000)).toBe(false);
  });
});

describe("seededUnit", () => {
  it("is deterministic and stays in [0, 1)", () => {
    expect(seededUnit(7)).toBe(seededUnit(7));
    for (let seed = 0; seed < 200; seed += 1) {
      const value = seededUnit(seed);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

import { bounceHeight, pathSampleAt, pointAtDistance, polylineLength } from "./timing";

describe("polyline paths", () => {
  const path = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 50 },
  ];

  it("measures total length and samples by arc length", () => {
    expect(polylineLength(path)).toBe(150);
    expect(pointAtDistance(path, 125)).toEqual({ x: 100, y: 25 });
    expect(pointAtDistance(path, 999)).toEqual({ x: 100, y: 50 });
  });

  it("ping-pongs along the path and reports facing", () => {
    const flat = [{ x: 0, y: 10 }, { x: 100, y: 10 }];
    expect(pathSampleAt(flat, 0, 0.1, 0)).toEqual({ x: 0, y: 10, facing: 1 });
    expect(pathSampleAt(flat, 1500, 0.1, 0)).toEqual({ x: 50, y: 10, facing: -1 });
  });
});

describe("bounceHeight", () => {
  it("touches the ground at the start of each period and peaks mid-period", () => {
    expect(bounceHeight(0, 1000, 40)).toBeCloseTo(0);
    expect(bounceHeight(500, 1000, 40)).toBeCloseTo(40);
    expect(bounceHeight(1000, 1000, 40)).toBeCloseTo(0);
  });
});
