import { describe, expect, it } from "vitest";
import { thunderMotion } from "./divineCapture";
import { themeExitPose } from "./themeExit";
import { CAPTURE_DURATION_MS as duration } from "./captureLifecycle";

describe("thunder spear timing", () => {
  it("charges, flies, then strikes before the stationary target dissolves", () => {
    const origin = { x: 300, y: 80 }, core = { x: 150, y: 220 };
    expect(thunderMotion(duration * 0.15).flight).toBe(0);
    expect(thunderMotion(duration * 0.35).flight).toBeGreaterThan(0);
    expect(thunderMotion(duration * 0.45).flight).toBe(1);
    expect(thunderMotion(duration * 0.5).impact).toBe(1);
    for (const p of [0, 0.35, 0.45, 0.7, 1]) {
      const pose = themeExitPose("spear", duration * p, origin, core, 30, 1);
      expect(pose.x).toBe(origin.x); expect(pose.y).toBe(origin.y);
      if (p <= 0.45) expect(pose.opacity).toBe(1);
      if (p === 1) expect(pose.opacity).toBe(0);
    }
  });
});
