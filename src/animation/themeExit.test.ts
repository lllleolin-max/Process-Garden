import { describe, expect, it } from "vitest";
import { themeExitPose, gardenAbsorption } from "./themeExit";
import { CAPTURE_DURATION_MS, getCaptureMotion } from "./captureLifecycle";

const origin = { x: 250, y: 150 }, core = { x: 500, y: 300 };
describe("theme-specific process endings", () => {
  it("extends the branch before draining and withering the organism", () => {
    const reaching = gardenAbsorption(400);
    expect(reaching.reach).toBeGreaterThan(0);
    expect(reaching.reach).toBeLessThan(1);
    expect(reaching.absorption).toBe(0);
    const held = themeExitPose("vine", 400, origin, core, 30, 12);
    expect(held.x).toBe(origin.x); expect(held.y).toBe(origin.y);
    expect(held.scale).toBe(1); expect(held.opacity).toBe(1);
    expect(gardenAbsorption(1200).reach).toBe(1);
    expect(gardenAbsorption(1200).absorption).toBeGreaterThan(0);
    expect(gardenAbsorption(CAPTURE_DURATION_MS).branchOpacity).toBe(0);
  });
  it("withers downwards at its original location instead of returning to the core", () => {
    const pose = themeExitPose("vine", 1400, origin, core, 30, 12);
    expect(Math.abs(pose.x - origin.x)).toBeLessThan(6);
    expect(pose.y).toBeGreaterThan(origin.y);
    expect(pose.scale).toBeLessThan(0.7);
    expect(pose.opacity).toBeGreaterThan(0);
    expect(themeExitPose("vine", 1400, origin, { x: -500, y: -300 }, 30, 12)).toEqual(pose);
  });
  it("locks before travel and docks before disappearing", () => {
    const start = themeExitPose("beam", 400, origin, core, 30, 12);
    expect(start.x).toBe(origin.x);
    expect(start.opacity).toBe(1);
    const travel = themeExitPose("beam", 1200, origin, core, 30, 12);
    expect(travel.x).toBeGreaterThan(origin.x);
    expect(travel.x).toBeLessThan(core.x);
    expect(travel.scale).toBe(1);
    const dock = themeExitPose("beam", 2000, origin, core, 30, 12);
    expect(dock.x).toBe(core.x); expect(dock.y).toBeCloseTo(core.y);
  });
  it("crowns and lifts Olympus targets before the angel begins returning", () => {
    const elapsed = CAPTURE_DURATION_MS * 0.4;
    const crowned = themeExitPose("laurel", elapsed, origin, core, 30, 12);
    const angel = themeExitPose("wing", elapsed, origin, core, 30, 12);
    expect(crowned.x).toBe(origin.x);
    expect(crowned.y).toBeLessThan(origin.y);
    expect(angel.x).toBeGreaterThan(origin.x);
    for (const style of ["wing", "laurel"] as const) {
      const final = themeExitPose(style, CAPTURE_DURATION_MS, origin, core, 30, 12);
      expect(final.x).toBe(core.x); expect(final.y).toBeCloseTo(core.y);
    }
  });
  it("preserves the eldritch bite timing and completes every ending", () => {
    for (const style of ["vine", "tentacle", "beam", "cable", "wing", "laurel", "spear"] as const) {
      const initial = themeExitPose(style, 0, origin, core, 30, 12);
      expect(initial.x).toBe(origin.x); expect(initial.y).toBe(origin.y);
      expect(initial.opacity).toBe(1);
      expect(themeExitPose(style, CAPTURE_DURATION_MS, origin, core, 30, 12).opacity).toBe(0);
    }
    expect(themeExitPose("tentacle", 1600, origin, core, 30, 12).opacity).toBe(getCaptureMotion(1600).nodeOpacity);
  });
});
