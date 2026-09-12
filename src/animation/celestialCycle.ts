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

export function getCelestialCycle(date: Date): CelestialCycleState {
  const seconds = date.getHours() * 3_600 + date.getMinutes() * 60 + date.getSeconds() + date.getMilliseconds() / 1_000;
  const dayFraction = seconds / 86_400;
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
