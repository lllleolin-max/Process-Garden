import { act, cleanup, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../stores/appStore";
import type { SystemSnapshot } from "../types/system";
import { useSystemFeed } from "./useSystemFeed";
import { useFeedHealth } from "../stores/feedHealth";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

function deferred() {
  let resolve!: (snapshot: SystemSnapshot) => void;
  const promise = new Promise<SystemSnapshot>((done) => { resolve = done; });
  return { promise, resolve };
}

let hidden = false;
beforeEach(() => {
  vi.useFakeTimers();
  invoke.mockReset();
  useFeedHealth.setState({ failed: false, stalled: false, lastSuccess: null });
  hidden = false;
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  Object.defineProperty(window, "__TAURI_INTERNALS__", { configurable: true, value: {} });
  const initial = useAppStore.getInitialState();
  useAppStore.setState({ ...initial, demoMode: false, collector: "native", snapshot: { ...initial.snapshot, timestamp: Date.now() - 1_000 } }, true);
});
afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
});

describe("system sampling lifecycle", () => {
  it("marks a pending request as stalled without starting another request", async () => {
    const request = deferred();
    invoke.mockReturnValue(request.promise);
    renderHook(() => useSystemFeed());
    await act(() => vi.dynamicImportSettled());
    const before = useAppStore.getState().snapshot;
    await act(() => vi.advanceTimersByTimeAsync(4_999));
    expect(useFeedHealth.getState().failed).toBe(false);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(useFeedHealth.getState().stalled).toBe(true);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().snapshot).toBe(before);
    await act(async () => request.resolve({ ...before, timestamp: Date.now() }));
    expect(useFeedHealth.getState().stalled).toBe(false);
    expect(useFeedHealth.getState().failed).toBe(false);
  });

  it("watches an existing request after preferences change and clears timers on unmount", async () => {
    const request = deferred();
    invoke.mockReturnValue(request.promise);
    const hook = renderHook(() => useSystemFeed());
    await act(() => vi.dynamicImportSettled());
    act(() => useAppStore.getState().setPreference("samplingMs", 500));
    await act(() => vi.advanceTimersByTimeAsync(5_000));
    expect(useFeedHealth.getState().stalled).toBe(true);
    expect(invoke).toHaveBeenCalledTimes(1);
    hook.unmount();
    expect(vi.getTimerCount()).toBe(0);
    await act(async () => request.resolve(useAppStore.getState().snapshot));
  });

  it("does not raise a timeout while hidden but re-arms when visible", async () => {
    const request = deferred();
    invoke.mockReturnValue(request.promise);
    const hook = renderHook(() => useSystemFeed());
    await act(() => vi.dynamicImportSettled());
    hidden = true;
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(useFeedHealth.getState().failed).toBe(false);
    hidden = false;
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await act(() => vi.advanceTimersByTimeAsync(5_000));
    expect(useFeedHealth.getState().stalled).toBe(true);
    expect(invoke).toHaveBeenCalledTimes(1);
    hook.unmount();
    await act(async () => request.resolve(useAppStore.getState().snapshot));
  });

  it("preserves native data through collection failures and recovers without demo telemetry", async () => {
    invoke.mockRejectedValueOnce(new Error("collector unavailable"));
    const next = deferred();
    invoke.mockReturnValue(next.promise);
    const before = useAppStore.getState();
    renderHook(() => useSystemFeed());
    await act(() => vi.dynamicImportSettled());
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().snapshot).toBe(before.snapshot);
    expect(useAppStore.getState().history).toBe(before.history);
    expect(useAppStore.getState().events).toBe(before.events);
    expect(useAppStore.getState().collector).toBe("native");
    expect(useFeedHealth.getState().failed).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(before.samplingMs));
    expect(invoke).toHaveBeenCalledTimes(2);
    const recovered = { ...before.snapshot, timestamp: Date.now(), cpuPercent: 23 };
    await act(async () => { next.resolve(recovered); });
    expect(useAppStore.getState().snapshot).toBe(recovered);
    expect(useFeedHealth.getState()).toEqual({ failed: false, stalled: false, lastSuccess: recovered.timestamp });
    expect(useAppStore.getState().collector).toBe("native");
  });

  it("keeps at most one native request in flight even when the sample is slow", async () => {
    const request = deferred();
    invoke.mockReturnValue(request.promise);
    renderHook(() => useSystemFeed(), { wrapper: StrictMode });
    await act(() => vi.dynamicImportSettled());
    expect(invoke).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(3_000));
    expect(invoke).toHaveBeenCalledTimes(1);
    const snapshot = { ...useAppStore.getState().snapshot, timestamp: Date.now() };
    await act(async () => { request.resolve(snapshot); });
    expect(useAppStore.getState().snapshot).toBe(snapshot);
  });

  it("waits for an old request after a sampling preference changes and discards its result", async () => {
    const request = deferred();
    const next = deferred();
    invoke.mockReturnValueOnce(request.promise).mockReturnValue(next.promise);
    renderHook(() => useSystemFeed());
    await act(() => vi.dynamicImportSettled());
    const before = useAppStore.getState().snapshot;
    act(() => useAppStore.getState().setPreference("samplingMs", 500));
    expect(invoke).toHaveBeenCalledTimes(1);
    await act(async () => { request.resolve({ ...before, timestamp: before.timestamp + 1_000, cpuPercent: 99 }); });
    await act(() => vi.dynamicImportSettled());
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(useAppStore.getState().snapshot).toBe(before);
    const snapshot = { ...before, timestamp: before.timestamp + 2_000, cpuPercent: 42 };
    await act(async () => { next.resolve(snapshot); });
    expect(useAppStore.getState().snapshot).toBe(snapshot);
  });

  it("discards paused requests and resumes with a fresh sample", async () => {
    const request = deferred();
    const next = deferred();
    invoke.mockReturnValueOnce(request.promise).mockReturnValue(next.promise);
    renderHook(() => useSystemFeed());
    await act(() => vi.dynamicImportSettled());
    const before = useAppStore.getState().snapshot;
    act(() => useAppStore.getState().setPaused(true));
    await act(async () => { request.resolve({ ...before, timestamp: before.timestamp + 1_000 }); });
    await act(() => vi.advanceTimersByTimeAsync(5_000));
    expect(useAppStore.getState().snapshot).toBe(before);
    expect(invoke).toHaveBeenCalledTimes(1);
    act(() => useAppStore.getState().setPaused(false));
    await act(() => vi.dynamicImportSettled());
    expect(invoke).toHaveBeenCalledTimes(2);
    await act(async () => { next.resolve({ ...before, timestamp: Date.now() }); });
  });

  it("stops polling while hidden and discards results from before the visibility change", async () => {
    const request = deferred();
    const next = deferred();
    invoke.mockReturnValueOnce(request.promise).mockReturnValue(next.promise);
    renderHook(() => useSystemFeed());
    await act(() => vi.dynamicImportSettled());
    const before = useAppStore.getState().snapshot;
    hidden = true;
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await act(async () => { request.resolve({ ...before, timestamp: Date.now() }); });
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().snapshot).toBe(before);
    hidden = false;
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await act(() => vi.dynamicImportSettled());
    expect(invoke).toHaveBeenCalledTimes(2);
    await act(async () => { next.resolve({ ...before, timestamp: Date.now() }); });
  });

  it("does not publish or restart polling after unmount", async () => {
    const request = deferred();
    invoke.mockReturnValue(request.promise);
    const hook = renderHook(() => useSystemFeed());
    await act(() => vi.dynamicImportSettled());
    const before = useAppStore.getState().snapshot;
    hook.unmount();
    await act(async () => { request.resolve({ ...before, timestamp: Date.now() }); });
    await act(() => vi.advanceTimersByTimeAsync(5_000));
    expect(useAppStore.getState().snapshot).toBe(before);
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});
