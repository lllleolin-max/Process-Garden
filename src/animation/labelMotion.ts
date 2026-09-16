import type { LabelBox } from "./sceneLayout";
import { damp } from "./smoothing";

/** Label actors use the scene clock, not independent timers or React updates. */
export class LabelMotion {
  private labels = new Map<string, { target: LabelBox; visible: LabelBox }>();

  target(key: string) { return this.labels.get(key)?.target; }

  update(key: string, target: LabelBox, deltaMs: number, instant: boolean): LabelBox {
    const previous = this.labels.get(key);
    const visible = !previous || instant ? { ...target } : {
      x: damp(previous.visible.x, target.x, deltaMs, 95),
      y: damp(previous.visible.y, target.y, deltaMs, 95),
      // Text metrics must match the label's current language/font immediately.
      width: target.width,
      height: target.height
    };
    this.labels.set(key, { target: { ...target }, visible });
    return visible;
  }

  retain(keys: Set<string>) {
    for (const key of this.labels.keys()) if (!keys.has(key)) this.labels.delete(key);
  }
}
