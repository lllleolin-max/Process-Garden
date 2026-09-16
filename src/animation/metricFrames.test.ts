import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { requestMetricFrame } from "./metricFrames";

let frames: Map<number, FrameRequestCallback>;
let cancellations: Array<() => void>;
beforeEach(() => {
  frames = new Map(); cancellations = [];
  let id = 0;
  vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => { frames.set(++id, callback); return id; }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn((key: number) => frames.delete(key)));
});
afterEach(() => { cancellations.forEach(cancel => cancel()); vi.unstubAllGlobals(); });
function request(callback: FrameRequestCallback) {
  const cancel = requestMetricFrame(callback);
  cancellations.push(cancel);
  return cancel;
}
function tick(now: number) {
  const batch = [...frames.values()]; frames.clear();
  batch.forEach(callback => callback(now));
}

it("coalesces 100 independent consumers with the same timestamp and no idle work", () => {
  const callbacks = Array.from({ length: 100 }, () => vi.fn());
  callbacks.forEach(callback => request(callback));
  expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
  expect(frames.size).toBe(1);
  tick(1234);
  callbacks.forEach(callback => expect(callback).toHaveBeenCalledExactlyOnceWith(1234));
  expect(frames.size).toBe(0);
});

it("cancels one consumer independently and releases the browser frame after the last", () => {
  const a = vi.fn(), b = vi.fn();
  const cancelA = request(a), cancelB = request(b);
  cancelA(); cancelA();
  expect(frames.size).toBe(1);
  tick(100);
  expect(a).not.toHaveBeenCalled(); expect(b).toHaveBeenCalledOnce();
  cancelB();
  const cancelLast = request(a);
  expect(frames.size).toBe(1);
  cancelLast();
  expect(frames.size).toBe(0);
  request(b); tick(200);
  expect(b).toHaveBeenCalledTimes(2);
});

it("defers rescheduled work to the next browser frame and still coalesces it", () => {
  const next = vi.fn();
  request(() => request(next));
  request(() => request(next));
  tick(100);
  expect(next).not.toHaveBeenCalled();
  expect(frames.size).toBe(1);
  expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
  tick(116);
  expect(next).toHaveBeenCalledTimes(2);
  expect(frames.size).toBe(0);
});

it("allows a sibling to cancel work already in the current batch", () => {
  const skipped = vi.fn();
  let cancelSibling = () => {};
  request(() => cancelSibling());
  cancelSibling = request(skipped);
  tick(100);
  expect(skipped).not.toHaveBeenCalled();
  expect(frames.size).toBe(0);
});

it("reports a callback error without starving the other consumers", () => {
  const errors: VoidFunction[] = [];
  vi.stubGlobal("queueMicrotask", (callback: VoidFunction) => errors.push(callback));
  const error = new Error("formatter failed");
  const good = vi.fn();
  request(() => { throw error; }); request(good);
  tick(100);
  expect(good).toHaveBeenCalledExactlyOnceWith(100);
  expect(errors).toHaveLength(1);
  expect(errors[0]).toThrow(error);
  expect(frames.size).toBe(0);
});
