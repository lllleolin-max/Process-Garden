export interface CelestialBodyState {
  orbitX: number;
  altitude: number;
  visibility: number;
}

export interface CelestialCycleState {
  dayFraction: number;
  sun: CelestialBodyState;
  moon: CelestialBodyState;
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const normalized = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return normalized * normalized * (3 - 2 * normalized);
}

function localDayFraction(date: Date) {
  const seconds = date.getHours() * 3_600 + date.getMinutes() * 60 + date.getSeconds() + date.getMilliseconds() / 1_000;
  return seconds / 86_400;
}

function cycleAtFraction(dayFraction: number): CelestialCycleState {
  const solarAngle = (dayFraction - 0.25) * Math.PI * 2;
  const sunAltitude = Math.sin(solarAngle);
  const moonAltitude = -sunAltitude;

  return {
    dayFraction,
    sun: {
      orbitX: -Math.cos(solarAngle),
      altitude: sunAltitude,
      visibility: smoothstep(-0.08, 0.08, sunAltitude)
    },
    moon: {
      orbitX: Math.cos(solarAngle),
      altitude: moonAltitude,
      visibility: smoothstep(-0.08, 0.08, moonAltitude)
    }
  };
}

export function getCelestialCycle(date: Date): CelestialCycleState {
  return cycleAtFraction(localDayFraction(date));
}

/** System-time orbit with a held pose and bounded, shortest-path catch-up. */
export class CelestialClock {
  private dayFraction: number | null = null;

  sample(date: Date, deltaMs: number, mode: "animate" | "freeze" | "settle") {
    const target = localDayFraction(date);
    if (!Number.isFinite(target)) return cycleAtFraction(this.dayFraction ?? 0);
    if (this.dayFraction === null || mode === "settle") this.dayFraction = target;
    else if (mode === "animate") {
      const elapsed = Number.isFinite(deltaMs) ? Math.max(0, Math.min(100, deltaMs)) : 0;
      let distance = target - this.dayFraction;
      distance -= Math.round(distance); // Midnight is adjacent to 23:59, not a full turn away.
      if (elapsed > 0 && distance !== 0) {
        const step = distance * (1 - Math.exp(-elapsed / 1_400));
        const maxStep = elapsed / 60_000; // At most six degrees per second after a clock jump.
        this.dayFraction = (this.dayFraction + Math.max(-maxStep, Math.min(maxStep, step)) + 1) % 1;
      }
    }
    return cycleAtFraction(this.dayFraction);
  }
}
