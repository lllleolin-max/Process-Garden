import { describe, expect, it } from "vitest";
import { hitTestScene, placeSceneLabel, separateSceneNodes } from "./sceneLayout";

const bounds = { width: 740, height: 422, coreRadius: 49 };

describe("scene layout", () => {
  it("separates colliding organisms without depending on collection order or mutating input", () => {
    const nodes = [{ pid: 10, x: 190, y: 150, radius: 28 }, { pid: 20, x: 190, y: 150, radius: 28 }, { pid: 30, x: 190, y: 150, radius: 28 }];
    const result = separateSceneNodes(nodes, bounds);
    expect(result).toEqual(separateSceneNodes([...nodes].reverse(), bounds));
    expect(nodes.every((node) => node.x === 190 && node.y === 150)).toBe(true);
    for (let index = 0; index < result.length; index += 1) {
      for (const other of result.slice(index + 1)) {
        expect(Math.hypot(result[index].x - other.x, result[index].y - other.y)).toBeGreaterThan(75);
      }
    }
  });

  it("keeps targets below the heading and above the dock", () => {
    const nodes = [{ pid: 1, x: -20, y: -20, radius: 30 }, { pid: 2, x: 900, y: 800, radius: 30 }];
    for (const node of separateSceneNodes(nodes, bounds)) {
      expect(node.x).toBeGreaterThan(40);
      expect(node.x).toBeLessThan(700);
      expect(node.y).toBeGreaterThan(100);
      expect(node.y).toBeLessThan(320);
    }
  });

  it("puts labels on the opposite side when their default side is occupied", () => {
    const node = { pid: 1, x: 300, y: 200, radius: 25 };
    const label = placeSceneLabel(node, 110, bounds, [{ x: 339, y: 180, width: 150, height: 70 }], false);
    expect(label).not.toBeNull();
    expect(label!.x + label!.width).toBeLessThan(node.x);
  });

  it("suppresses secondary labels when space is scarce but preserves the focused label", () => {
    const node = { pid: 1, x: 300, y: 200, radius: 25 };
    const occupied = [{ x: 0, y: 0, width: bounds.width, height: bounds.height }];
    expect(placeSceneLabel(node, 110, bounds, occupied, false)).toBeNull();
    expect(placeSceneLabel(node, 110, bounds, occupied, true)).not.toBeNull();
  });

  it("picks the closest hit rather than whichever process arrived first", () => {
    const nodes = [{ pid: 1, x: 200, y: 200, radius: 35 }, { pid: 2, x: 228, y: 200, radius: 25 }];
    expect(hitTestScene(nodes, 225, 202)).toBe(2);
    expect(hitTestScene(nodes, 500, 500)).toBeNull();
  });
});
