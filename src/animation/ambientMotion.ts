import { damp } from "./smoothing";

/** Share the Canvas clock: no wall-clock reads, timers, or phase reset on pause. */
export function ambientVisibility(current: number, visible: boolean, deltaMs: number, staticFrame: boolean) {
  const target = visible ? 1 : 0;
  if (staticFrame) return target;
  const next = damp(current, target, deltaMs, 220);
  return Math.abs(next - target) < 0.002 ? target : next;
}

export function ambientFaunaPose(index: number, width: number, height: number, time: number, eldritch: boolean) {
  const cx = width * 0.5;
  const cy = height * 0.47;
  if (!eldritch) {
    const phase = time * (0.00011 + index * 0.000018) + index * 1.73;
    return {
      x: cx + Math.cos(phase * 1.31) * width * (0.24 + index * 0.018) + Math.sin(phase * 2.7) * 32,
      y: cy + Math.sin(phase * 1.77) * height * (0.2 + index * 0.012) + Math.cos(phase * 3.2) * 18,
      size: Math.max(19, Math.min(34, Math.min(width, height) * (0.038 + index * 0.002))),
      rotation: Math.atan2(Math.cos(phase * 1.77), -Math.sin(phase * 1.31)) + Math.PI * 0.5,
      stretch: 1,
      alpha: 0.44 + (index % 2) * 0.12
    };
  }

  // Slow peripheral currents leave the central brain clear; bank gently instead
  // of spinning the small, upright generated specimens through a full rotation.
  const phase = time * (0.000052 + index * 0.000009) + index * 1.73;
  const current = Math.sin(phase * 2 + index);
  return {
    x: cx + Math.cos(phase) * width * (0.29 + index * 0.018) + current * 5,
    y: cy + Math.sin(phase) * height * (0.29 + index * 0.012) + Math.cos(phase * 2.4) * 4,
    size: Math.max(24, Math.min(36, Math.min(width, height) * (0.058 + index * 0.002))),
    rotation: Math.sin(phase * 1.4 + index) * 0.22,
    stretch: 1 + Math.sin(time * 0.0009 + index * 2.1) * 0.045,
    alpha: 0.48 + (index % 2) * 0.08 + current * 0.035
  };
}
