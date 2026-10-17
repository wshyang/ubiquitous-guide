import { describe, expect, it } from "vitest";
import { laneSpan, shoreLeft, shoreRight } from "./water";

describe("water edges", () => {
  it("the jetty edge moves left as the lane goes down the diagonal", () => {
    expect(shoreLeft(1220)).toBeCloseTo(460);
    expect(shoreLeft(1400)).toBeGreaterThan(shoreLeft(1450));
    expect(shoreLeft(1600)).toBe(0);
  });

  it("the dock edge moves right and is clamped to the stage", () => {
    expect(shoreRight(1230)).toBeCloseTo(2400);
    expect(shoreRight(1600)).toBe(2752);
  });
});

describe("laneSpan", () => {
  it("keeps a sprite footprint inside the open water", () => {
    const span = laneSpan(1400, 500, 60);
    expect(span.min).toBeGreaterThanOrEqual(shoreLeft(1400) + 60);
    expect(span.max + 500).toBeLessThanOrEqual(shoreRight(1400) - 60);
  });

  it("refuses a lane too narrow for the footprint", () => {
    expect(() => laneSpan(1400, 5000, 60)).toThrow();
  });
});
