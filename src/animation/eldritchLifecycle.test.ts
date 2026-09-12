import { describe, expect, it } from "vitest";
import { ELDRITCH_SWALLOW_DURATION_MS, getEldritchSwallowMotion } from "./eldritchLifecycle";

describe("eldritch swallow lifecycle", () => {
  it("opens the maw before moving the organism", () => {
    const anticipation = getEldritchSwallowMotion(250);
    expect(anticipation.mouthOpen).toBeGreaterThan(0.6);
    expect(anticipation.suction).toBeLessThan(0.1);
  });

  it("keeps the organism visible through most of the suction", () => {
    const suction = getEldritchSwallowMotion(1_350);
    expect(suction.suction).toBeGreaterThan(0.8);
    expect(suction.nodeOpacity).toBe(1);
  });

  it("snaps the mouth shut and kicks the core after consumption", () => {
    const bite = getEldritchSwallowMotion(1_820);
    expect(bite.mouthOpen).toBeLessThan(0.2);
    expect(bite.coreKick).toBeGreaterThan(0);
    expect(bite.nodeScale).toBeLessThan(0.2);
  });

  it("fully settles at the end", () => {
    const settled = getEldritchSwallowMotion(ELDRITCH_SWALLOW_DURATION_MS);
    expect(settled.mouthOpen).toBe(0);
    expect(settled.nodeOpacity).toBe(0);
    expect(settled.shockwave).toBe(0);
  });
});
