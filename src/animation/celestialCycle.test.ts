import { describe, expect, it } from "vitest";
import { getCelestialCycle } from "./celestialCycle";

function localTime(hour: number, minute = 0) {
  return new Date(2026, 7, 11, hour, minute, 0, 0);
}

describe("wallpaper celestial cycle", () => {
  it("places the sun overhead at noon and the moon below the horizon", () => {
    const cycle = getCelestialCycle(localTime(12));
    expect(cycle.sun.altitude).toBeCloseTo(1, 6);
    expect(cycle.sun.visibility).toBe(1);
    expect(cycle.moon.visibility).toBe(0);
  });

  it("places the moon overhead at midnight", () => {
    const cycle = getCelestialCycle(localTime(0));
    expect(cycle.moon.altitude).toBeCloseTo(1, 6);
    expect(cycle.moon.visibility).toBe(1);
    expect(cycle.sun.visibility).toBe(0);
  });

  it("moves the sun from the left horizon at sunrise to the right at sunset", () => {
    expect(getCelestialCycle(localTime(6)).sun.orbitX).toBeCloseTo(-1, 6);
    expect(getCelestialCycle(localTime(18)).sun.orbitX).toBeCloseTo(1, 6);
  });

  it("changes continuously between adjacent minutes", () => {
    const before = getCelestialCycle(localTime(9, 30)).sun;
    const after = getCelestialCycle(localTime(9, 31)).sun;
    expect(Math.hypot(after.orbitX - before.orbitX, after.altitude - before.altitude)).toBeLessThan(0.01);
  });
});
