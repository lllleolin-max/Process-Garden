import { describe, expect, it } from "vitest";
import { damp, stableProcessAngle } from "./smoothing";

describe("sample-to-frame smoothing", () => {
  it("moves toward a new sample without jumping to it", () => {
    const next = damp(10, 90, 16.67, 420);
    expect(next).toBeGreaterThan(10);
    expect(next).toBeLessThan(90);
  });

  it("converges consistently across different refresh rates", () => {
    const run = (frames: number, delta: number) => Array.from({ length: frames }).reduce<number>((value) => damp(value, 100, delta, 420), 0);
    expect(run(30, 1000 / 30)).toBeCloseTo(run(120, 1000 / 120), 1);
  });

  it("keeps a process in a deterministic part of the garden", () => {
    expect(stableProcessAngle(5521)).toBe(stableProcessAngle(5521));
    expect(stableProcessAngle(5521)).not.toBe(stableProcessAngle(2458));
  });
});
