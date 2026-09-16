import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "./appStore";
import { toObservation } from "../data/observation";

beforeEach(() => useAppStore.setState(useAppStore.getInitialState(), true));
afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("snapshot continuity", () => {
  it.each([NaN, Infinity, -Infinity, -1])("rejects invalid sample time %s without changing data or notifying subscribers", timestamp => {
    const before = useAppStore.getState();
    const listener = vi.fn();
    const unsubscribe = useAppStore.subscribe(listener);
    try {
      // Invalid time must also be rejected when changing collectors.
      before.ingestSnapshot({ ...before.snapshot, timestamp }, "native");
      expect(useAppStore.getState()).toBe(before);
      expect(listener).not.toHaveBeenCalled();
    } finally { unsubscribe(); }
  });

  it("starts with a chronological demo history ending at the displayed snapshot", () => {
    const { history, snapshot, samplingMs } = useAppStore.getState();
    expect(history.at(-1)).toEqual(toObservation(snapshot));
    expect(history.slice(1).every((item, index) => item.timestamp - history[index].timestamp === samplingMs)).toBe(true);
  });

  it("starts a clean history and event log when switching collectors", () => {
    const demo = useAppStore.getState().snapshot;
    const native = { ...demo, timestamp: demo.timestamp + 1_000, cpuPercent: 80 };
    useAppStore.getState().ingestSnapshot(native, "native");
    expect(useAppStore.getState().history).toEqual([toObservation(native)]);
    expect(useAppStore.getState().events).toEqual([]);
    const nextDemo = { ...demo, timestamp: native.timestamp + 4_000 };
    useAppStore.getState().ingestSnapshot(nextDemo, "demo");
    expect(useAppStore.getState().history).toEqual([toObservation(nextDemo)]);
    expect(useAppStore.getState().events).toEqual([]);
  });

  it("ignores late, duplicate, and paused samples without notifying subscribers", () => {
    const before = useAppStore.getState();
    const listener = vi.fn();
    const unsubscribe = useAppStore.subscribe(listener);
    before.ingestSnapshot({ ...before.snapshot, timestamp: before.snapshot.timestamp - 1 }, "demo");
    before.ingestSnapshot({ ...before.snapshot }, "demo");
    expect(useAppStore.getState()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    before.setPaused(true);
    const paused = useAppStore.getState();
    paused.ingestSnapshot({ ...paused.snapshot, timestamp: paused.snapshot.timestamp + 1_000 }, "demo");
    expect(useAppStore.getState()).toBe(paused);
    unsubscribe();
  });

  it("preserves explicit deselection and the event array when no event occurred", () => {
    const timestamp = 8_001;
    const snapshot = { ...useAppStore.getState().snapshot, timestamp };
    useAppStore.setState({ snapshot, collector: "demo", selectedPid: null });
    const events = useAppStore.getState().events;
    useAppStore.getState().ingestSnapshot({ ...snapshot, timestamp: timestamp + 500 }, "demo");
    expect(useAppStore.getState().selectedPid).toBeNull();
    expect(useAppStore.getState().events).toBe(events);
  });

  it("keeps at most 120 samples", () => {
    const snapshot = useAppStore.getState().snapshot;
    for (let index = 1; index <= 150; index++) {
      useAppStore.getState().ingestSnapshot({ ...snapshot, timestamp: snapshot.timestamp + index * 1_000 }, "demo");
    }
    expect(useAppStore.getState().history).toHaveLength(120);
    expect(useAppStore.getState().history.at(-1)).toEqual(toObservation(useAppStore.getState().snapshot));
  });

  it.each(["exit", "reuse", "collector"])("clears selection on %s rather than silently selecting another application", change => {
    const snapshot = useAppStore.getState().snapshot;
    const selected = snapshot.processes[0];
    useAppStore.setState({ selectedPid: selected.pid, collector: "native" });
    const processes = change === "exit" ? snapshot.processes.slice(1)
      : snapshot.processes.map(process => process.pid === selected.pid && change === "reuse"
        ? { ...process, startedAt: process.startedAt + 1 } : process);
    useAppStore.getState().ingestSnapshot({ ...snapshot, timestamp: snapshot.timestamp + 1000, processes }, change === "collector" ? "demo" : "native");
    expect(useAppStore.getState().selectedPid).toBeNull();
  });

  it("retains the selected lifetime through reordering and equivalent start-time units", () => {
    const snapshot = useAppStore.getState().snapshot;
    const selected = snapshot.processes[0];
    useAppStore.setState({ selectedPid: selected.pid, collector: "native" });
    const processes = [...snapshot.processes].reverse().map(process => ({ ...process, startedAt: process.startedAt * 1000 }));
    useAppStore.getState().ingestSnapshot({ ...snapshot, timestamp: snapshot.timestamp + 1000, processes }, "native");
    expect(useAppStore.getState().selectedPid).toBe(selected.pid);
  });
});

describe("saved preferences", () => {
  it("validates stored values before they can affect rendering or polling", async () => {
    localStorage.setItem("process-garden-preferences", JSON.stringify({
      locale: "invalid", nodeDensity: 20, samplingMs: -1, reducedMotion: "false", animationFps: 500,
      setPaused: "not-an-action"
    }));
    vi.resetModules();
    const { useAppStore: restored } = await import("./appStore");
    expect(restored.getState().locale).toMatch(/^(zh-CN|en-US)$/);
    expect(restored.getState().nodeDensity).toBe(1);
    expect(restored.getState().samplingMs).toBe(500);
    expect(typeof restored.getState().reducedMotion).toBe("boolean");
    expect(restored.getState().animationFps).toBe(60);
    expect(typeof restored.getState().setPaused).toBe("function");
  });

  it("keeps changed preferences usable when browser storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Quota exceeded", "QuotaExceededError"); });
    useAppStore.getState().setPreference("particlesEnabled", false);
    await Promise.resolve();
    expect(useAppStore.getState().particlesEnabled).toBe(false);
  });
});
