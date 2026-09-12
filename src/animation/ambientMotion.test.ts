import { describe, expect, it } from "vitest";
import { ambientFaunaPose, ambientVisibility } from "./ambientMotion";

describe("ambient motion", () => {
  it("fades at the same rate at 30, 60 and 120 Hz and reverses without a reset", () => {
    const atOneSecond = [30, 60, 120].map((fps) => {
      let opacity = 0;
      for (let frame = 0; frame < fps; frame++) opacity = ambientVisibility(opacity, true, 1000 / fps, false);
      return opacity;
    });
    expect(atOneSecond[0]).toBeCloseTo(atOneSecond[1], 8);
    expect(atOneSecond[1]).toBeCloseTo(atOneSecond[2], 8);
    const hiding = ambientVisibility(atOneSecond[0], false, 16, false);
    const returning = ambientVisibility(hiding, true, 16, false);
    expect(hiding).toBeGreaterThan(0);
    expect(returning).toBeGreaterThan(hiding);
    expect(returning).toBeLessThan(1);
  });

  it("settles static settings immediately and fully stops drawing after a fade", () => {
    expect(ambientVisibility(0.4, false, 0, true)).toBe(0);
    expect(ambientVisibility(0.4, true, 0, true)).toBe(1);
    let opacity = 1;
    for (let frame = 0; frame < 60; frame++) opacity = ambientVisibility(opacity, false, 1000 / 30, false);
    expect(opacity).toBe(0);
  });

  it.each([[320, 280], [740, 422], [1920, 1080]])("keeps abyssal fauna small, on screen and away from the central brain at %i×%i", (width, height) => {
    for (let time = 0; time <= 300_000; time += 1_000) {
      for (let index = 0; index < 4; index++) {
        const pose = ambientFaunaPose(index, width, height, time, true);
        const padding = pose.size * 0.7;
        expect(pose.x).toBeGreaterThan(padding);
        expect(pose.x).toBeLessThan(width - padding);
        expect(pose.y).toBeGreaterThan(padding);
        expect(pose.y).toBeLessThan(height - padding);
        expect(Math.hypot(pose.x - width / 2, pose.y - height * 0.47)).toBeGreaterThan(Math.min(width, height) * 0.24);
        expect(pose.size).toBeGreaterThanOrEqual(24);
        expect(pose.size).toBeLessThanOrEqual(36);
        expect(Math.abs(pose.rotation)).toBeLessThanOrEqual(0.22);
      }
    }
  });
});
