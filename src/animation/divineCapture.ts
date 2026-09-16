import { CAPTURE_DURATION_MS } from "./captureLifecycle";

const smooth = (n: number) => { const t = Math.max(0, Math.min(1, n)); return t * t * (3 - 2 * t); };
export function thunderMotion(elapsed: number) {
  const p = elapsed / CAPTURE_DURATION_MS;
  return { charge: smooth(p / 0.2) * (1 - smooth((p - 0.3) / 0.15)),
    flight: smooth((p - 0.2) / 0.25),
    impact: smooth((p - 0.45) / 0.05) * (1 - smooth((p - 0.5) / 0.22)),
    dissolve: smooth((p - 0.48) / 0.45) };
}

/** Generated sprites supply every visible light, spear and impact shape. */
export function drawDivineCapture(ctx: CanvasRenderingContext2D, core: { x: number; y: number },
  node: { x: number; y: number; radius: number; exitRadius?: number }, elapsed: number,
  sprites: HTMLCanvasElement[], front: boolean, style: "spear" | "wing", opacity: number, preview: boolean) {
  const p = elapsed / CAPTURE_DURATION_MS;
  const r = Math.max(12, node.exitRadius ?? node.radius);
  const [shaft, flare, embrace, halo] = sprites;
  const stamp = (sprite: HTMLCanvasElement, x: number, y: number, size: number, alpha: number) => {
    ctx.save(); ctx.globalAlpha *= Math.max(0, alpha);
    ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size); ctx.restore();
  };
  ctx.save(); ctx.globalAlpha *= opacity; ctx.globalCompositeOperation = "screen";
  const dx = node.x - core.x, dy = node.y - core.y, distance = Math.hypot(dx, dy);
  if (style === "spear") {
    const motion = thunderMotion(elapsed);
    if (front) stamp(embrace, core.x, core.y, r * 2.2, preview ? 0.55 : motion.charge);
    if (!preview && front && p >= 0.2 && p < 0.5) {
      const length = Math.max(42, Math.min(115, distance * 0.5));
      ctx.save(); ctx.translate(core.x + dx * motion.flight, core.y + dy * motion.flight);
      ctx.rotate(Math.atan2(dy, dx)); ctx.globalAlpha *= 1 - smooth((p - 0.45) / 0.05);
      ctx.drawImage(shaft, -length, -length * shaft.height / shaft.width / 2, length, length * shaft.height / shaft.width);
      ctx.restore();
    }
    if (!preview && front) {
      stamp(flare, node.x, node.y, r * (3 + motion.dissolve * 2), motion.impact);
      stamp(halo, node.x, node.y, r * (2 + motion.dissolve * 4), Math.sin(motion.dissolve * Math.PI) * 0.9);
    }
  } else {
    const light = smooth(p / 0.12) * (preview ? 1 : 1 - smooth((p - 0.88) / 0.12));
    if (!front) {
      ctx.save(); ctx.translate(core.x, core.y); ctx.rotate(Math.atan2(dy, dx));
      ctx.globalAlpha *= light * 0.6;
      ctx.drawImage(shaft, 0, -r * 0.8, Math.max(1, distance), r * 1.6); ctx.restore();
      stamp(embrace, core.x, core.y, r * 3.3, light * (preview ? 0.3 : 0.3 + smooth((p - 0.55) / 0.3) * 0.65));
    } else {
      stamp(flare, node.x, node.y, r * 2.7, light * 0.45);
      stamp(halo, node.x, node.y + r * 0.35, r * 2.8, light * 0.8);
    }
  }
  ctx.restore();
}
