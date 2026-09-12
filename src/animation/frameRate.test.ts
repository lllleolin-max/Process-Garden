import { describe, expect, it } from "vitest";
import { decideAnimationFrame } from "./frameRate";

describe("animation frame pacing", () => {
  it("renders the first frame immediately", () => {
    expect(decideAnimationFrame(0, 4, 60).render).toBe(true);
  });

  it("paces 30 Hz on a faster display", () => {
    expect(decideAnimationFrame(100, 116.7, 30).render).toBe(false);
    expect(decideAnimationFrame(100, 133.4, 30).render).toBe(true);
  });

  it("paces 60 Hz without accumulating drift", () => {
    const decision = decideAnimationFrame(100, 116.8, 60);
    expect(decision.render).toBe(true);
    expect(decision.alignedTime).toBeCloseTo(116.667, 2);
  });

  it("allows a 120 Hz frame at the next display tick", () => {
    expect(decideAnimationFrame(100, 108.4, 120).render).toBe(true);
  });
});
