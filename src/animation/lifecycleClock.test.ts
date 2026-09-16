import { expect, it } from "vitest";
import { AgentEmbryoScene } from "./agentEmbryos";
import { SceneClock } from "./sceneClock";
import { decideAnimationFrame } from "./frameRate";
import { ELDRITCH_SWALLOW_DURATION_MS, getEldritchSwallowMotion } from "./eldritchLifecycle";
import type { ProcessSnapshot } from "../types/system";

it.each([30, 60, 120])("preserves a complete interrupted swallow at %i Hz", (fps) => {
  const child: ProcessSnapshot = { pid: 2, parentPid: 1, name: "task", startedAt: 1, cpuPercent: 3, memoryBytes: 1000, status: "active" };
  const scene = new AgentEmbryoScene();
  const clock = new SceneClock();
  const frame = {
    processes: [child], snapshotAt: 10_000,
    parents: new Map([[1, { pid: 1, x: 400, y: 210, radius: 28, exiting: false }]]),
    time: clock.time, deltaMs: 0, width: 740, height: 422,
    core: { x: 370, y: 198 }, eldritch: true, frozen: false, limit: 3
  };
  let wallTime = 1000, lastRenderedAt = 0, lastSceneTime = clock.time;
  const paint = () => {
    const { time } = clock.tick(wallTime, false);
    const decision = decideAnimationFrame(lastRenderedAt, wallTime, fps);
    if (!decision.render) return false;
    lastRenderedAt = decision.alignedTime;
    frame.time = time;
    frame.deltaMs = time - lastSceneTime;
    lastSceneTime = time;
    scene.update(frame);
    return true;
  };
  const advance = (milliseconds: number) => {
    // A 120 Hz display drives every requested canvas rate.
    for (let index = 0; index < Math.round(milliseconds / (1000 / 120)); index++) {
      wallTime += 1000 / 120;
      paint();
    }
  };
  paint(); advance(2400);
  const node = [...scene.nodes.values()][0];
  expect(node.opacity).toBe(1);
  frame.processes = [];
  advance(800);
  expect(node.exiting).toBe(true);
  const pose = structuredClone(node);
  const motion = getEldritchSwallowMotion(frame.time - node.transitionStartedAt);
  expect(motion.mouthOpen).toBeGreaterThan(0.9);
  // Match the visibility handler: freeze on both hide and show, with no RAFs
  // in between. One hour of background time must not consume the actor.
  clock.tick(wallTime, true);
  wallTime += 3_600_000;
  clock.tick(wallTime, true);
  expect(paint()).toBe(true);
  expect(node).toEqual(pose);
  expect(getEldritchSwallowMotion(frame.time - node.transitionStartedAt)).toEqual(motion);
  let sawBite = false, sawRecoil = false;
  let retirementAt = 0;
  for (let index = 0; index < 300 && scene.nodes.size; index++) {
    wallTime += 1000 / 120;
    if (!paint()) continue;
    const elapsed = frame.time - node.transitionStartedAt;
    const current = getEldritchSwallowMotion(elapsed);
    sawBite ||= current.nodeOpacity === 0;
    sawRecoil ||= current.shockwave > 0;
    if (!scene.nodes.size) retirementAt = elapsed;
  }
  expect(sawBite).toBe(true);
  expect(sawRecoil).toBe(true);
  expect(scene.nodes.size).toBe(0);
  expect(retirementAt).toBeGreaterThanOrEqual(ELDRITCH_SWALLOW_DURATION_MS + 80);
  expect(retirementAt).toBeLessThan(ELDRITCH_SWALLOW_DURATION_MS + 80 + 1000 / fps + 1);
});
