import { describe, expect, it } from "vitest";
import { gazeTarget } from "./crimsonGaze";

describe("crimson gaze direction", () => {
  const center = { x: 300, y: 200 };
  it("centers without a pointer and follows all four directions", () => {
    expect(gazeTarget(null, center, 50)).toEqual({ x: 0, y: 0 });
    expect(gazeTarget(center, center, 50)).toEqual({ x: 0, y: 0 });
    expect(gazeTarget({ x: 400, y: 200 }, center, 50)).toEqual({ x: 0.5, y: 0 });
    expect(gazeTarget({ x: 200, y: 100 }, center, 50)).toEqual({ x: -0.5, y: -0.5 });
    expect(gazeTarget({ x: 300, y: 300 }, center, 50)).toEqual({ x: 0, y: 0.5 });
  });
  it("limits distant diagonal targets without changing their direction", () => {
    const gaze = gazeTarget({ x: 2300, y: 1200 }, center, 50);
    expect(Math.hypot(gaze.x, gaze.y)).toBeCloseTo(1);
    expect(gaze.x / gaze.y).toBeCloseTo(2);
    expect(Number.isFinite(gazeTarget(center, center, 0).x)).toBe(true);
  });
});
