import { stableProcessAngle } from "./smoothing";

export interface SceneNode { pid: number; x: number; y: number; radius: number }
export interface SceneBounds { width: number; height: number; coreRadius: number }
export interface LabelBox { x: number; y: number; width: number; height: number }

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(Math.max(min, max), value));

/** Resolve targets only when the population or viewport changes, never in the animation loop. */
export function separateSceneNodes(input: SceneNode[], bounds: SceneBounds) {
  const nodes = input.map((node) => ({ ...node })).sort((a, b) => a.pid - b.pid);
  const center = { x: bounds.width * 0.5, y: bounds.height * 0.47 };
  const confine = (node: SceneNode) => {
    const inset = node.radius * 1.35 + 10;
    node.x = clamp(node.x, inset, bounds.width - inset);
    node.y = clamp(node.y, 66 + inset, bounds.height - 58 - inset);
  };
  for (let pass = 0; pass < 12; pass += 1) {
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      for (let otherIndex = index + 1; otherIndex < nodes.length; otherIndex += 1) {
        const other = nodes[otherIndex];
        const dx = other.x - node.x;
        const dy = other.y - node.y;
        const distance = Math.hypot(dx, dy);
        const minimum = (node.radius + other.radius) * 1.48 + 12;
        if (distance >= minimum) continue;
        const angle = distance > 0.01 ? Math.atan2(dy, dx) : stableProcessAngle(node.pid);
        const push = (minimum - distance) * 0.5;
        node.x -= Math.cos(angle) * push;
        node.y -= Math.sin(angle) * push;
        other.x += Math.cos(angle) * push;
        other.y += Math.sin(angle) * push;
      }
      const dx = node.x - center.x;
      const dy = node.y - center.y;
      const distance = Math.hypot(dx, dy);
      const minimum = bounds.coreRadius * 1.35 + node.radius * 1.4;
      if (distance < minimum) {
        const angle = distance > 0.01 ? Math.atan2(dy, dx) : stableProcessAngle(node.pid);
        node.x = center.x + Math.cos(angle) * minimum;
        node.y = center.y + Math.sin(angle) * minimum;
      }
      confine(node);
    }
  }
  return nodes;
}

function overlapArea(a: LabelBox, b: LabelBox) {
  return Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
    * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
}

/** The caller places focused labels first; secondary labels yield when space is scarce. */
export function placeSceneLabel(node: SceneNode, width: number, bounds: SceneBounds, occupied: LabelBox[], required: boolean): LabelBox | null {
  const height = 34;
  const gap = node.radius * 1.08 + 12;
  const candidates = [
    { x: node.x + gap, y: node.y - 17 },
    { x: node.x - gap - width, y: node.y - 17 },
    { x: node.x - width / 2, y: node.y + gap },
    { x: node.x - width / 2, y: node.y - gap - height },
    { x: node.x + gap, y: node.y - gap - height },
    { x: node.x - gap - width, y: node.y + gap }
  ].map((box) => ({ x: clamp(box.x, 10, bounds.width - width - 10), y: clamp(box.y, 70, bounds.height - 70 - height), width, height }));
  const ranked = candidates.map((box, index) => ({ box, score: occupied.reduce((score, obstacle) => score + overlapArea(box, obstacle), 0), index }))
    .sort((a, b) => a.score - b.score || a.index - b.index);
  return !required && ranked[0].score > 0 ? null : ranked[0].box;
}

/** Choose the nearest visible organism when generated artwork or hit areas overlap. */
export function hitTestScene(nodes: SceneNode[], x: number, y: number) {
  let closest: number | null = null;
  let distance = Infinity;
  for (const node of nodes) {
    const normalized = Math.hypot(node.x - x, node.y - y) / Math.max(1, node.radius + 9);
    if (normalized <= 1 && normalized < distance) { closest = node.pid; distance = normalized; }
  }
  return closest;
}
