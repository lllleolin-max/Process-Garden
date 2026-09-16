import type { LabelBox } from "./sceneLayout";
import { damp } from "./smoothing";

/** Retire the annotation before the organism reaches the central mouth. */
export function labelExitOpacity(elapsedMs: number, reducedMotion: boolean) {
  if (reducedMotion) return 0;
  const progress = Math.max(0, Math.min(1, elapsedMs / 220));
  return 1 - progress * progress * (3 - 2 * progress);
}

/** Label actors use the scene clock, not independent timers or React updates. */
export class LabelMotion {
  private labels = new Map<string, { target: LabelBox; visible: LabelBox }>();

  target(key: string) { return this.labels.get(key)?.target; }

  update(key: string, target: LabelBox, deltaMs: number, instant: boolean, bounds?: { width: number; height: number }): LabelBox {
    const previous = this.labels.get(key);
    const visible = !previous || instant ? { ...target } : {
      x: damp(previous.visible.x, target.x, deltaMs, 95),
      y: damp(previous.visible.y, target.y, deltaMs, 95),
      // Text metrics must match the label's current language/font immediately.
      width: target.width,
      height: target.height
    };
    // A new text width can make the previous position invalid before damping
    // reaches the new target. Match the placement solver's viewport margins.
    if (bounds) {
      visible.x = Math.max(10, Math.min(Math.max(10, bounds.width - visible.width - 10), visible.x));
      visible.y = Math.max(70, Math.min(Math.max(70, bounds.height - visible.height - 70), visible.y));
    }
    this.labels.set(key, { target: { ...target }, visible });
    return visible;
  }

  retain(keys: Set<string>) {
    for (const key of this.labels.keys()) if (!keys.has(key)) this.labels.delete(key);
  }
}
