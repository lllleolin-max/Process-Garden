import { describe, expect, it } from "vitest";
import { hitTestScene, placeSceneLabel, separateSceneNodes, type LabelBox } from "./sceneLayout";

const bounds = { width: 740, height: 422, coreRadius: 49 };

describe("scene layout", () => {
  it("stops after the first clear candidate instead of checking all six", () => {
    let reads = 0;
    const obstacle = { get x() { reads += 1; return 0; }, y: 0, width: 10, height: 10 };
    expect(placeSceneLabel({ pid: 1, x: 300, y: 200, radius: 25 }, 110, bounds, [obstacle], true)).not.toBeNull();
    expect(reads).toBe(2);
  });

  it("matches exhaustive placement across dense scenes, ties and narrow viewports", () => {
    let seed = 173;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let sample = 0; sample < 400; sample += 1) {
      const viewport = { width: 80 + random() * 1500, height: 100 + random() * 1000, coreRadius: 49 };
      const node = { pid: 1, x: random() * viewport.width, y: random() * viewport.height, radius: 8 + random() * 50 };
      const width = 105 + random() * 53, gap = node.radius * 1.08 + 12;
      const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(Math.max(min, max), v));
      const candidates = [
        [node.x + gap, node.y - 17], [node.x - gap - width, node.y - 17],
        [node.x - width / 2, node.y + gap], [node.x - width / 2, node.y - gap - 34],
        [node.x + gap, node.y - gap - 34], [node.x - gap - width, node.y + gap]
      ].map(([x, y]) => ({ x: clamp(x, 10, viewport.width - width - 10), y: clamp(y, 70, viewport.height - 104), width, height: 34 }));
      const occupied: LabelBox[] = Array.from({ length: sample % 65 }, () => ({ x: random() * viewport.width, y: random() * viewport.height, width: random() * 200, height: random() * 100 }));
      const ranked = candidates.map((box, index) => ({ box, index, score: occupied.reduce((score, obstacle) => score
        + Math.max(0, Math.min(box.x + box.width, obstacle.x + obstacle.width) - Math.max(box.x, obstacle.x))
        * Math.max(0, Math.min(box.y + box.height, obstacle.y + obstacle.height) - Math.max(box.y, obstacle.y)), 0) }))
        .sort((a, b) => a.score - b.score || a.index - b.index);
      for (const required of [false, true]) {
        expect(placeSceneLabel(node, width, viewport, occupied, required)).toEqual(!required && ranked[0].score > 0 ? null : ranked[0].box);
      }
    }
  });

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
