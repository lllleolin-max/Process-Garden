export function damp(current: number, target: number, deltaMs: number, responseMs: number) {
  if (!Number.isFinite(current) || !Number.isFinite(target)) return target;
  if (responseMs <= 0 || deltaMs <= 0) return deltaMs <= 0 ? current : target;
  const factor = 1 - Math.exp(-Math.min(deltaMs, 100) / responseMs);
  return current + (target - current) * factor;
}

export function stableProcessAngle(pid: number) {
  const hash = Math.imul(Math.abs(Math.trunc(pid)) ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  return hash / 0x1_0000_0000 * Math.PI * 2 - Math.PI / 2;
}
