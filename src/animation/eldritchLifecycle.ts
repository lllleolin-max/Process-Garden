export const ELDRITCH_SWALLOW_DURATION_MS = 2_250;

export interface EldritchSwallowMotion {
  progress: number;
  mouthOpen: number;
  suction: number;
  nodeScale: number;
  nodeOpacity: number;
  spiralTurns: number;
  coreKick: number;
  shockwave: number;
  shockwaveRadius: number;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const normalized = clamp01((value - edge0) / (edge1 - edge0));
  return normalized * normalized * (3 - 2 * normalized);
}

export function getEldritchSwallowMotion(elapsedMs: number): EldritchSwallowMotion {
  const progress = clamp01(elapsedMs / ELDRITCH_SWALLOW_DURATION_MS);
  const anticipation = smoothstep(0, 0.16, progress);
  const biteClose = smoothstep(0.72, 0.82, progress);
  const mouthOpen = clamp01(anticipation * (1 - biteClose) * 1.32);
  const suction = smoothstep(0.14, 0.75, progress);
  const consumed = smoothstep(0.62, 0.79, progress);
  const coreKick = Math.sin(clamp01((progress - 0.73) / 0.17) * Math.PI) * (progress >= 0.73 && progress <= 0.9 ? 1 : 0);
  const shockwave = smoothstep(0.79, 0.86, progress) * (1 - smoothstep(0.86, 1, progress));

  return {
    progress,
    mouthOpen,
    suction,
    nodeScale: Math.max(0.035, 1 - consumed * 0.965),
    nodeOpacity: 1 - smoothstep(0.7, 0.82, progress),
    spiralTurns: suction * 2.25,
    coreKick,
    shockwave,
    shockwaveRadius: smoothstep(0.79, 1, progress)
  };
}
