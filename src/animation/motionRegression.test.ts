import { describe, expect, it } from "vitest";
import { SceneClock } from "./sceneClock";
import { decideAnimationFrame } from "./frameRate";
import { getEldritchSwallowMotion } from "./eldritchLifecycle";

describe("motion continuity regressions", () => {
  it("resumes without charging paused time to the scene", () => {
    const clock = new SceneClock();
    clock.tick(100, false);
    clock.tick(116, false);
    const paused = clock.tick(132, true).time;
    expect(clock.tick(10_000, true).time).toBe(paused);
    expect(clock.tick(10_016, false).time).toBe(paused);
    expect(clock.tick(10_032, false).time).toBe(paused + 16);
  });
  it("consumes an early tolerated vsync deadline", () => {
    const early = decideAnimationFrame(100, 116.4, 60);
    expect(early.render).toBe(true);
    expect(decideAnimationFrame(early.alignedTime, 120, 60).render).toBe(false);
  });
  it("retains recoil after consumption while the shockwave expands", () => {
    const consumed = getEldritchSwallowMotion(1900);
    const later = getEldritchSwallowMotion(2110);
    expect(consumed.nodeOpacity).toBe(0);
    expect(consumed.shockwave).toBeGreaterThan(0);
    expect(later.shockwaveRadius).toBeGreaterThan(consumed.shockwaveRadius);
  });
});
