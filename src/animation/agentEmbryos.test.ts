import { describe, expect, it } from "vitest";
import type { ProcessSnapshot } from "../types/system";
import { AgentEmbryoScene } from "./agentEmbryos";
import { getEldritchSwallowMotion } from "./eldritchLifecycle";

const now = 1_800_000_000_000;
const child = (pid = 2, startedAt = now - 10_000): ProcessSnapshot => ({ pid, parentPid: 1, name: `task-${pid}`, startedAt, cpuPercent: 3, memoryBytes: 10_000_000, status: "active" });
function fixture(processes = [child()]) {
  const scene = new AgentEmbryoScene();
  const frame = { processes, snapshotAt: now, parents: new Map([[1, { pid: 1, x: 400, y: 210, radius: 28, exiting: false }]]), time: 1_000, deltaMs: 0, width: 740, height: 422, core: { x: 370, y: 198 }, eldritch: true, frozen: false, limit: 3, preferredPid: null as number | null };
  const update = (ms = 0) => { frame.time += ms; frame.deltaMs = ms; return scene.update(frame); };
  const run = (ms: number) => { for (let elapsed = 0; elapsed < ms; elapsed += 20) update(Math.min(20, ms - elapsed)); };
  return { scene, frame, update, run };
}

describe("persistent agent embryos", () => {
  it("emerges from the central mouth, grows and stays attached to a moving parent", () => {
    const f = fixture();
    const [node] = f.update();
    expect(node.opacity).toBe(0);
    expect([node.x, node.y]).toEqual([f.frame.core.x, f.frame.core.y]);
    f.run(300);
    expect(node.opacity).toBeGreaterThan(0);
    expect(node.opacity).toBeLessThan(1);
    f.run(1_700);
    expect(node.opacity).toBe(1);
    const before = node.x;
    f.frame.parents.get(1)!.x += 60;
    f.run(200);
    expect(node.x).toBeGreaterThan(before);
    expect(node.x).toBeLessThan(f.frame.width);
  });

  it("keeps identity and sibling slots through reordered samples and blends stage artwork", () => {
    const f = fixture([child(2), child(3)]);
    const [a, b] = f.update();
    f.run(2_000);
    const before = [a.x, a.y, a.slot, b.slot];
    f.frame.processes = [{ ...child(3) }, { ...child(2) }];
    f.frame.snapshotAt = now + 50_000;
    f.update();
    expect([...f.scene.nodes.values()][0]).toBe(a);
    expect([a.x, a.y, a.slot, b.slot]).toEqual(before);
    expect(a.weights).toEqual([1, 0, 0]);
    f.run(100);
    expect(a.weights[0]).toBeGreaterThan(0);
    expect(a.weights[1]).toBeGreaterThan(0);
    expect(a.weights.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1);
    f.frame.snapshotAt = now + 250_000;
    const weights = [...a.weights];
    f.update();
    expect(a.weights).toEqual(weights);
    f.run(2_000);
    expect(a.weights[2]).toBeGreaterThan(0.99);
  });

  it("retains a disappeared embryo through suction, bite and the central recoil", () => {
    const f = fixture();
    const [node] = f.update();
    f.run(2_000);
    const before = [node.x, node.y, node.opacity];
    f.frame.processes = [];
    f.update();
    expect(node.exiting).toBe(true);
    expect([node.x, node.y, node.opacity]).toEqual(before);
    f.run(1_940);
    expect(node.opacity).toBe(0);
    expect(f.scene.nodes.has(node.key)).toBe(true);
    expect(getEldritchSwallowMotion(f.frame.time - node.transitionStartedAt).shockwave).toBeGreaterThan(0);
    f.run(400);
    expect(f.scene.nodes.size).toBe(0);
  });

  it("reverses an interrupted disappearance from its current visible state", () => {
    const f = fixture();
    const [node] = f.update();
    f.run(2_000);
    f.frame.processes = [];
    f.update(); f.run(1_000);
    const before = [node.x, node.y, node.radius, node.opacity];
    f.frame.processes = [child()];
    f.update();
    expect(f.scene.nodes.get(node.key)).toBe(node);
    expect(node.exiting).toBe(false);
    expect([node.x, node.y, node.radius, node.opacity]).toEqual(before);
  });

  it("preserves a partial growth pose while frozen, then resumes without restarting", () => {
    const f = fixture();
    const [node] = f.update();
    f.run(300);
    const before = structuredClone(node);
    f.frame.frozen = true;
    f.frame.preferredPid = node.pid;
    f.update();
    expect(node).toEqual(before);
    f.frame.frozen = false;
    f.update();
    expect(node).toEqual(before);
    f.run(100);
    expect(node.opacity).toBeGreaterThan(before.opacity);
  });

  it("admits a selected fourth child after the displaced sibling's complete exit", () => {
    const f = fixture([child(2), child(3), child(4), child(5)]);
    f.update(); f.run(2_000);
    f.frame.preferredPid = 5;
    f.update();
    expect([...f.scene.nodes.values()].map((node) => node.pid)).toEqual([2, 3, 4]);
    expect([...f.scene.nodes.values()].find((node) => node.pid === 4)?.exiting).toBe(true);
    f.run(2_400);
    expect([...f.scene.nodes.values()].map((node) => node.pid)).toEqual([2, 3, 5]);
    expect([...f.scene.nodes.values()].find((node) => node.pid === 5)?.slot).toBe(2);
  });

  it("keeps the last live tether origin when a parent moves during withdrawal", () => {
    const f = fixture();
    const [node] = f.update(); f.run(2_000);
    const anchor = { ...node.tetherOrigin };
    f.frame.processes = [];
    f.update();
    f.frame.parents.get(1)!.x += 100;
    f.run(400);
    expect(node.tetherOrigin).toEqual(anchor);
  });

  it("settles frozen data changes and respects the wallpaper cap without shifting surviving slots", () => {
    const f = fixture([child(2), child(3), child(4)]);
    f.frame.frozen = true;
    const [a, b] = f.update();
    const before = [a.x, a.y, b.x, b.y];
    f.frame.limit = 2;
    f.update();
    expect(f.scene.nodes.size).toBe(2);
    expect([a.x, a.y, b.x, b.y]).toEqual(before);
    f.frame.processes = [];
    f.update();
    expect(f.scene.nodes.size).toBe(0);
  });

  it("bounds rapid churn while allowing each retiring actor to complete its exit", () => {
    const f = fixture([child(2), child(3), child(4)]);
    f.update(); f.run(2_000);
    const initial = [...f.scene.nodes.keys()];
    for (let turn = 0; turn < 15; turn++) {
      f.frame.processes = [child(100 + turn * 3), child(101 + turn * 3), child(102 + turn * 3)];
      f.update(); f.run(100);
      expect(f.scene.nodes.size).toBeLessThanOrEqual(3);
    }
    expect([...f.scene.nodes.keys()]).toEqual(initial);
    f.run(1_000);
    expect([...f.scene.nodes.values()].map((node) => node.pid)).toEqual([142, 143, 144]);
  });

  it("does not overwrite a retiring lifetime when Windows reuses its PID", () => {
    const f = fixture();
    const [old] = f.update(); f.run(2_000);
    f.frame.processes = [child(2, now + 1_000)];
    f.update();
    expect(f.scene.nodes.size).toBe(2);
    expect(old.exiting).toBe(true);
    expect([...f.scene.nodes.values()].filter((node) => !node.exiting)).toHaveLength(1);
  });

  it("uses the same identity for equivalent second and millisecond timestamps", () => {
    const f = fixture();
    const [node] = f.update();
    f.frame.processes = [child(2, (now - 10_000) / 1_000)];
    f.update();
    expect([...f.scene.nodes.values()]).toEqual([node]);
    expect(node.exiting).toBe(false);
  });

  it("exits independently if its parent leaves and dissolves softly in Garden", () => {
    const f = fixture();
    f.frame.eldritch = false;
    const [node] = f.update(); f.run(2_000);
    f.frame.parents.get(1)!.exiting = true;
    f.update(); f.run(600);
    expect(node.exiting).toBe(true);
    expect(node.opacity).toBeGreaterThan(0);
    expect(node.captured).toBe(false);
    expect(node.opacity).toBeLessThan(1);
    f.run(800);
    expect(f.scene.nodes.size).toBe(0);
  });
});
