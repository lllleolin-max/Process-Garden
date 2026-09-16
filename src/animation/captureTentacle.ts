import { drawDivineCapture } from "./divineCapture";
import { getCaptureMotion } from "./captureLifecycle";
import type { CaptureStyle } from "../types/theme";
import { captureProfiles } from "../themes/lifecycle";
import { gardenAbsorption } from "./themeExit";

type Point = { x: number; y: number };

/** Deform generated artwork; rear/front passes place the organism inside the coil. */
export function drawCaptureTentacle(context: CanvasRenderingContext2D, core: Point, node: Point & { radius: number; pid: number }, elapsed: number, sprites: HTMLCanvasElement[] | undefined, front: boolean, style: CaptureStyle = "tentacle", opacity = 1, preview = false) {
  if (!sprites || sprites.length !== 4) return;
  if (style === "wing" || style === "spear") {
    drawDivineCapture(context, core, node, elapsed, sprites, front, style, opacity, preview);
    return;
  }
  const [shaft, tipSprite, socket, coil] = sprites;
  const motion = getCaptureMotion(elapsed);
  const garden = style === "vine" ? gardenAbsorption(elapsed) : null;
  if (garden) {
    motion.reach = garden.reach;
    motion.wrap = garden.absorption;
    motion.suction = 0;
    motion.tentacleOpacity = garden.branchOpacity;
  }
  if (style === "beam") motion.tentacleOpacity = Math.min(1, elapsed / 120) * Math.max(0, Math.min(1, (2250 - elapsed) / 180));
  if (motion.tentacleOpacity <= 0 || opacity <= 0) return;
  if (style === "beam") {
    const dx = node.x - core.x, dy = node.y - core.y;
    const length = Math.max(1, Math.hypot(dx, dy)) * motion.reach;
    const radius = Math.max(9, node.radius * 1.4);
    context.save();
    context.globalAlpha *= motion.tentacleOpacity * opacity;
    context.globalCompositeOperation = "screen";
    context.translate(core.x, core.y);
    context.rotate(Math.atan2(dy, dx));
    if (!front) {
      const width = Math.max(16, radius * 1.3);
      context.drawImage(shaft, 0, -width / 2, length, width);
      context.drawImage(socket, -18, -18, 36, 36);
      context.save();
      context.globalAlpha *= 0.55 * motion.wrap;
      context.drawImage(tipSprite, length - radius, -radius, radius * 2, radius * 2);
      context.restore();
    }
    // A complete lock halo fades in, with two depth passes around the target.
    context.translate(length, 0);
    context.rotate(-Math.atan2(dy, dx));
    context.globalAlpha *= motion.wrap;
    context.beginPath();
    context.rect(-radius * 1.5, front ? 0 : -radius, radius * 3, radius);
    context.clip();
    context.drawImage(coil, -radius, -radius * 0.6, radius * 2, radius * 1.2);
    context.restore();
    return;
  }
  const profile = captureProfiles[style];
  const dx = node.x - core.x, dy = node.y - core.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / distance, ny = dx / distance;
  const radius = Math.max(5, node.radius * 1.24);
  const thickness = Math.max(6, Math.min(19, radius * 0.4)) * profile.width;
  const bend = Math.sin(node.pid * 1.7) * Math.min(44, distance * 0.22) * (1 - motion.suction * 0.8) * profile.wave;
  const point = (t: number) => {
    const wave = Math.sin(t * Math.PI) * bend + Math.sin(t * Math.PI * 2 + elapsed * 0.003) * 3 * Math.sin(t * Math.PI) * profile.wave;
    return { x: core.x + dx * motion.reach * t + nx * wave, y: core.y + dy * motion.reach * t + ny * wave };
  };
  const tip = point(1);
  context.save();
  context.globalAlpha *= motion.tentacleOpacity * opacity;
  if (!front) {
    // Overlapping short texture strips follow a continuous curve, with a tapered end.
    const steps = Math.max(12, Math.min(90, Math.ceil(distance * motion.reach / 5)));
    for (let i = 0; i < steps; i++) {
      const a = point(i / steps), b = point((i + 1) / steps);
      const size = thickness * (1 - i / steps * 0.25);
      context.save(); context.translate(a.x, a.y); context.rotate(Math.atan2(b.y - a.y, b.x - a.x));
      context.drawImage(shaft, i / steps * shaft.width, 0, shaft.width / steps, shaft.height, -0.6, -size / 2, Math.hypot(b.x - a.x, b.y - a.y) + 1.2, size);
      context.restore();
    }
    context.drawImage(socket, core.x - thickness * 1.3, core.y - thickness * 1.3, thickness * 2.6, thickness * 2.6);
    context.save(); context.translate(tip.x, tip.y); context.rotate(Math.atan2(dy, dx));
    context.globalAlpha *= 1 - motion.wrap;
    context.drawImage(tipSprite, -thickness * 0.5, -thickness, thickness * 2.6, thickness * 2);
    context.restore();
  }
  if (motion.wrap > 0) {
    context.save(); context.translate(tip.x, tip.y);
    // Two depth halves, revealed by an angular mask rather than redrawn geometry.
    context.beginPath(); context.rect(-radius * 1.5, front ? 0 : -radius * 1.5, radius * 3, radius * 1.5); context.clip();
    if (style === "laurel") context.globalAlpha *= motion.wrap;
    else {
      context.beginPath(); context.moveTo(0, 0);
      context.arc(0, 0, radius * 2, Math.PI, Math.PI + Math.PI * 2 * motion.wrap); context.closePath(); context.clip();
    }
    context.drawImage(coil, -radius, -radius * 0.72, radius * 2, radius * 1.44);
    context.restore();
  }
  if (garden && front) {
    // Reuse generated leafy tips as branching contacts; sap travels back to the root.
    context.save(); context.translate(tip.x, tip.y);
    for (const angle of [-0.7, 0.7]) {
      context.save(); context.rotate(Math.atan2(dy, dx) + angle);
      context.drawImage(tipSprite, -thickness * 2.4, -thickness * 0.65, thickness * 3.4, thickness * 1.3);
      context.restore();
    }
    context.restore();
    if (garden.absorption > 0 && garden.progress < 0.9) {
      context.save(); context.globalCompositeOperation = "screen";
      context.globalAlpha *= Math.min(1, garden.absorption * 5);
      for (let i = 0; i < 5; i++) {
        const t = 1 - ((elapsed / 700 + i / 5) % 1);
        const sap = point(t);
        const size = thickness * (0.65 + 0.35 * Math.sin(t * Math.PI));
        context.drawImage(socket, sap.x - size / 2, sap.y - size / 2, size, size);
      }
      context.restore();
    }
  }
  context.restore();
}
