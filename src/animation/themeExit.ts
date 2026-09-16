import type { CaptureStyle } from "../types/theme";
import { CAPTURE_DURATION_MS, getCaptureMotion } from "./captureLifecycle";

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
type Point = { x: number; y: number };

export function gardenAbsorption(elapsed: number) {
  const progress = clamp(elapsed / CAPTURE_DURATION_MS);
  return {
    progress,
    reach: smooth(progress / 0.24),
    absorption: smooth((progress - 0.24) / 0.58),
    branchOpacity: smooth(progress / 0.05) * (1 - smooth((progress - 0.86) / 0.14))
  };
}

/** One clock, distinct poses. Filtering is deliberately handled by the caller. */
export function themeExitPose(style: CaptureStyle, elapsed: number, origin: Point, core: Point, radius: number, pid: number) {
  const p = clamp(elapsed / CAPTURE_DURATION_MS);
  if (style === "vine") {
    const wilt = gardenAbsorption(elapsed).absorption;
    return { x: origin.x + Math.sin(pid) * radius * 0.18 * wilt,
      y: origin.y + radius * 1.15 * wilt, scale: 1 - wilt * 0.58,
      opacity: 1 - smooth((p - 0.5) / 0.5), progress: p };
  }
  const dx = core.x - origin.x, dy = core.y - origin.y;
  if (style === "spear") {
    const dissolve = smooth((p - 0.48) / 0.45);
    return { x: origin.x, y: origin.y, scale: 1 + dissolve * 0.18, opacity: 1 - dissolve, progress: p };
  }
  if (style === "laurel") {
    const travel = smooth((p - 0.42) / 0.46);
    const lift = Math.sin(Math.PI * smooth(p / 0.88)) * radius * 1.4;
    return { x: origin.x + dx * travel, y: origin.y + dy * travel - lift,
      scale: 1 - smooth((p - 0.72) / 0.25) * 0.9,
      opacity: 1 - smooth((p - 0.84) / 0.16), progress: p };
  }
  if (style === "wing") {
    const travel = smooth((p - 0.3) / 0.58);
    return { x: origin.x + dx * travel,
      y: origin.y + dy * travel - Math.sin(travel * Math.PI) * Math.min(70, Math.hypot(dx, dy) * 0.22),
      scale: 1 - smooth((p - 0.65) / 0.3) * 0.85,
      opacity: 1 - smooth((p - 0.82) / 0.18), progress: p };
  }
  if (style === "beam") {
    const travel = smooth((p - 0.22) / 0.64);
    return { x: origin.x + dx * travel,
      y: origin.y + dy * travel - Math.sin(travel * Math.PI) * Math.min(48, Math.hypot(dx, dy) * 0.12),
      scale: 1 - smooth((p - 0.7) / 0.22) * 0.94,
      opacity: 1 - smooth((p - 0.78) / 0.18), progress: p };
  }
  const motion = getCaptureMotion(elapsed);
  const distance = Math.max(1, Math.hypot(dx, dy));
  const spiral = (1 - motion.suction) * Math.min(78, radius * 2.8) * Math.sin(motion.spiralTurns * Math.PI * 2);
  return { x: origin.x + dx * motion.suction - dy / distance * spiral,
    y: origin.y + dy * motion.suction + dx / distance * spiral - Math.sin(motion.suction * Math.PI) * Math.min(86, distance * 0.22),
    scale: motion.nodeScale, opacity: motion.nodeOpacity, progress: p };
}

/** Animate fragments of the actual generated organism, never substitute artwork. */
export function drawWithering(context: CanvasRenderingContext2D, sprite: HTMLCanvasElement, node: Point & { radius: number; pid: number }, elapsed: number) {
  const p = gardenAbsorption(elapsed).absorption;
  context.save();
  context.translate(node.x, node.y);
  context.rotate(Math.sin(node.pid) * p * 0.75);
  context.scale(1, 1 - p * 0.62);
  context.filter = `sepia(${p}) saturate(${1 - p * 0.85}) brightness(${1 - p * 0.48})`;
  const size = node.radius * 3.1;
  context.drawImage(sprite, -size / 2, -size / 2, size, size);
  context.restore();
  const scatter = smooth((p - 0.2) / 0.8);
  if (!scatter) return;
  context.save();
  context.filter = "sepia(1) saturate(.45) brightness(.65)";
  for (let i = 0; i < 12; i++) {
    const cell = sprite.width / 4;
    const size = node.radius * (0.14 + (i % 3) * 0.05) * (1 - scatter * 0.7);
    const x = node.x + Math.sin(i * 2.4 + node.pid) * node.radius * (0.4 + scatter * 2);
    const y = node.y + scatter * node.radius * (0.6 + (i % 4) * 0.5);
    context.drawImage(sprite, (i % 4) * cell, Math.floor(i / 4) * cell, cell, cell, x - size / 2, y, size, size);
  }
  context.restore();
}
