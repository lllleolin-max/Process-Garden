import { describe, expect, it } from "vitest";
import { LabelMotion, labelExitOpacity } from "./labelMotion";
import { placeSceneLabel } from "./sceneLayout";

const box = { x: 100, y: 100, width: 110, height: 34 };
describe("label motion", () => {
  it("fades in and reverses interrupted retirement without a brightness jump", () => {
    const motion = new LabelMotion();
    motion.update("1", box, 16, false);
    const first = motion.opacity("1", 1, 16, false, false);
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(.2);
    // Position updates must not reset the retained opacity.
    motion.update("1", box, 16, false);
    expect(motion.opacity("1", 1, 0, false, false)).toBe(first);
    expect(motion.opacity("1", 1, 16, false, true)).toBe(first);
    expect(motion.opacity("1", .05, 16, false, true)).toBe(.05);
    const resumed = motion.opacity("1", 1, 16, false, false);
    expect(resumed).toBeGreaterThan(.05);
    expect(resumed).toBeLessThan(.25);
    expect(motion.opacity("1", 1, 0, false, false)).toBe(resumed);
    expect(motion.opacity("1", 1, 0, true, false)).toBe(1);
    motion.retain(new Set());
    expect(motion.opacity("1", 1, 16, false, false)).toBe(0);
  });

  it("uses the same fade-in duration across refresh-rate settings", () => {
    const values = [30, 60, 120].map((fps) => {
      const motion = new LabelMotion();
      motion.update("1", box, 0, false);
      let alpha = 0;
      for (let index = 0; index < fps / 2; index++) alpha = motion.opacity("1", 1, 1000 / fps, false, false);
      return alpha;
    });
    expect(values[0]).toBeCloseTo(values[1], 10);
    expect(values[1]).toBeCloseTo(values[2], 10);
    expect(values[0]).toBeGreaterThan(.99);
  });

  it("fades exiting annotations on scene time and removes them before swallowing", () => {
    expect(labelExitOpacity(-1, false)).toBe(1);
    expect(labelExitOpacity(0, false)).toBe(1);
    expect(labelExitOpacity(110, false)).toBeCloseTo(0.5);
    expect(labelExitOpacity(220, false)).toBe(0);
    expect(labelExitOpacity(1000, false)).toBe(0);
    expect(labelExitOpacity(0, true)).toBe(0);
    for (const fps of [30, 60, 120]) {
      const values = Array.from({ length: Math.ceil(fps * .3) }, (_, index) => labelExitOpacity(index * 1000 / fps, false));
      expect(values.every((value, index) => index === 0 || value <= values[index - 1])).toBe(true);
      expect(values.at(-1)).toBe(0);
    }
  });

  it("keeps a widening label inside the viewport during its transition", () => {
    const motion = new LabelMotion();
    const bounds = { width: 740, height: 422 };
    motion.update("1", { ...box, x: 625, width: 105 }, 0, false, bounds);
    const visible = motion.update("1", { ...box, x: 572, width: 158 }, 16, false, bounds);
    expect(visible.x + visible.width).toBeLessThanOrEqual(730);
    expect(visible.width).toBe(158);
  });

  it("confines retained positions after shrink and keeps undersized views finite", () => {
    const motion = new LabelMotion();
    motion.update("1", { ...box, x: 600, y: 280 }, 0, false);
    const visible = motion.update("1", { ...box, x: 200, y: 90 }, 0, false, { width: 360, height: 230 });
    expect(visible.x + visible.width).toBeLessThanOrEqual(350);
    expect(visible.y + visible.height).toBeLessThanOrEqual(160);
    expect(motion.update("1", box, 16, false, { width: 40, height: 90 })).toEqual({ ...box, x: 10, y: 70 });
  });

  it("keeps an unobstructed side after another candidate becomes clear", () => {
    const node = { pid: 1, x: 300, y: 200, radius: 25 };
    const bounds = { width: 740, height: 422, coreRadius: 49 };
    const left = placeSceneLabel(node, 110, bounds, [{ x: 339, y: 180, width: 150, height: 70 }], true)!;
    expect(left.x).toBeLessThan(node.x);
    expect(placeSceneLabel(node, 110, bounds, [], true, left)).toEqual(left);
    const relocated = placeSceneLabel(node, 110, bounds, [left], true, left)!;
    expect(relocated).not.toEqual(left);
  });

  it("moves between sides without jumping to the new placement", () => {
    const motion = new LabelMotion();
    motion.update("1:100", box, 16, false);
    const target = { ...box, x: 400, y: 200 };
    const next = motion.update("1:100", target, 16, false);
    expect(next.x).toBeGreaterThan(100);
    expect(next.x).toBeLessThan(150);
    expect(motion.target("1:100")).toEqual(target);
    expect(motion.update("1:100", target, 0, false)).toEqual(next);
    expect(box.x).toBe(100);
  });

  it("converges equally at 30, 60 and 120 FPS using elapsed scene time", () => {
    const results = [30, 60, 120].map((fps) => {
      const motion = new LabelMotion();
      motion.update("1", box, 0, false);
      let visible = box;
      for (let frame = 0; frame < fps; frame++) visible = motion.update("1", { ...box, x: 400 }, 1000 / fps, false);
      return visible.x;
    });
    expect(results[0]).toBeCloseTo(results[1], 8);
    expect(results[1]).toBeCloseTo(results[2], 8);
    expect(results[0]).toBeGreaterThan(399.9);
  });

  it("settles immediately for static frames and does not reuse a recycled PID", () => {
    const motion = new LabelMotion();
    motion.update("1:100", box, 0, false);
    const target = { ...box, x: 400, width: 150 };
    expect(motion.update("1:100", target, 0, true)).toEqual(target);
    expect(motion.update("1:200", box, 0, false)).toEqual(box);
    motion.retain(new Set(["1:200"]));
    expect(motion.target("1:100")).toBeUndefined();
    motion.retain(new Set());
    expect(motion.target("1:200")).toBeUndefined();
  });
});
