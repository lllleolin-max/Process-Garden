import { describe, expect, it } from "vitest";
import { getCaptureMotion, CAPTURE_DURATION_MS } from "./captureLifecycle";
import { captureStyleFor } from "../themes/lifecycle";

describe("theme capture choreography", () => {
  it("reaches before wrapping and holds a visible organism before retrieval", () => {
    const reach = getCaptureMotion(300);
    expect(reach.reach).toBeGreaterThan(0.8);
    expect(reach.wrap).toBe(0);
    const held = getCaptureMotion(675);
    expect(held.reach).toBe(1);
    expect(held.wrap).toBe(1);
    expect(held.suction).toBe(0);
    expect(held.nodeOpacity).toBe(1);
    expect(getCaptureMotion(1200).suction).toBeGreaterThan(0.5);
    expect(getCaptureMotion(CAPTURE_DURATION_MS).tentacleOpacity).toBe(0);
  });
  it("inherits each theme's appendage and accepts an explicit override", () => {
    expect(captureStyleFor({ id: "garden" })).toBe("vine");
    expect(captureStyleFor({ id: "eldritch" })).toBe("tentacle");
    expect(captureStyleFor({ id: "custom", basedOn: "cyberpunk" })).toBe("beam");
    expect(captureStyleFor({ id: "custom", basedOn: "garden", captureStyle: "tentacle" })).toBe("tentacle");
  });
});
