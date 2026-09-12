import { describe, expect, it } from "vitest";
import { CelestialClock, getCelestialCycle } from "./celestialCycle";

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

describe("system-time celestial pose clock", () => {
  it("holds during pause and the first resumed frame, even across a system-clock change", () => {
    const clock = new CelestialClock();
    const before = clock.sample(localTime(9, 13), 0, "animate");
    expect(clock.sample(localTime(15), 50, "freeze")).toEqual(before);
    expect(clock.sample(localTime(15), 0, "animate")).toEqual(before);
    const after = clock.sample(localTime(15), 16, "animate");
    expect(after.dayFraction - before.dayFraction).toBeGreaterThan(0);
    expect((after.dayFraction - before.dayFraction) * 360).toBeLessThanOrEqual(6 * 0.016 + 1e-10);
  });

  it("takes the short forward path through midnight and converges on system time", () => {
    const clock = new CelestialClock();
    const before = clock.sample(localTime(23, 59), 0, "animate");
    const target = localTime(0, 1);
    const first = clock.sample(target, 20, "animate");
    expect(first.dayFraction).toBeGreaterThan(before.dayFraction);
    let after = first;
    for (let step = 0; step < 500; step++) after = clock.sample(target, 20, "animate");
    expect(after.dayFraction).toBeCloseTo(getCelestialCycle(target).dayFraction, 5);
  });

  it("settles reduced-motion data updates and preserves a safe pose on invalid dates", () => {
    const clock = new CelestialClock();
    clock.sample(localTime(8), 0, "animate");
    const settled = clock.sample(localTime(18), 0, "settle");
    expect(settled).toEqual(getCelestialCycle(localTime(18)));
    expect(clock.sample(new Date(NaN), 16, "animate")).toEqual(settled);
    expect(clock.sample(localTime(20), NaN, "animate")).toEqual(settled);
  });
});
