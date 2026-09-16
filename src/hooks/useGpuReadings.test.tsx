import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useGpuReadings } from "./useGpuReadings";
import { useDiskReadings } from "./useDiskReadings";
import { useAppStore } from "../stores/appStore";
import { gpuFixture } from "../tests/gpuFixture";
const invoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
const initial = useAppStore.getState();
let hidden = false;
beforeEach(() => {
  vi.useFakeTimers(); invoke.mockReset(); hidden = false;
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  // Concurrent dynamic imports can reach the actual Tauri wrapper in Vitest;
  // provide the same controlled bridge there as in the module mock.
  Object.defineProperty(window, "__TAURI_INTERNALS__", { configurable: true, value: { invoke: (command: string, args: unknown) => invoke(command, args) } });
  useAppStore.setState({ demoMode: false, collector: "native", paused: false, displayMode: "windowed" });
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); Reflect.deleteProperty(window, "__TAURI_INTERNALS__"); useAppStore.setState(initial, true); });
const settle = () => act(async () => { await vi.dynamicImportSettled(); });
const advance = (ms = 1000) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

it("keeps a warmup session after provider errors and bounds live history", async () => {
  const baseline = gpuFixture(); baseline.rateBaseline = true; baseline.adapters[0].engines.forEach(engine => engine.observedPercentSum = null);
  invoke.mockRejectedValueOnce("warmup").mockResolvedValueOnce(baseline).mockResolvedValue(gpuFixture());
  const view = renderHook(() => useGpuReadings());
  await settle(); expect(view.result.current.status).toBe("error");
  const session = invoke.mock.calls[0][1].session;
  await advance(); expect(view.result.current.status).toBe("baseline");
  expect(invoke.mock.calls[1]).toEqual(["sample_gpu", { session }]);
  await advance(); expect(view.result.current.status).toBe("live");
  await advance(40000); expect(view.result.current.history).toHaveLength(36);
});

it.each(["unmount", "hide", "pause", "wallpaper"])("does not query after %s interrupts loading", async change => {
  invoke.mockResolvedValue(gpuFixture()); const view = renderHook(() => useGpuReadings());
  if (change === "unmount") view.unmount();
  else if (change === "hide") { hidden = true; act(() => document.dispatchEvent(new Event("visibilitychange"))); }
  else act(() => useAppStore.setState(change === "pause" ? { paused: true } : { displayMode: "wallpaper" }));
  await settle(); await advance(10000); expect(invoke).not.toHaveBeenCalled();
});

it("does not overlap a stalled GPU bridge or block disk requests; ignores late results", async () => {
  let release!: (value: unknown) => void;
  const pending = new Promise(resolve => { release = resolve; });
  invoke.mockImplementation(command => command === "sample_gpu" ? pending : []);
  const gpu = renderHook(() => useGpuReadings()); const disk = renderHook(() => useDiskReadings());
  await settle(); expect(disk.result.current.status).toBe("empty");
  const session = gpu.result.current.session;
  await advance(6000); expect(gpu.result.current.status).toBe("error");
  expect(gpu.result.current.session).not.toBe(session);
  expect(invoke.mock.calls.filter(([command]) => command === "sample_gpu")).toHaveLength(1);
  expect(invoke.mock.calls.filter(([command]) => command === "sample_disks").length).toBeGreaterThan(1);
  await act(async () => release(gpuFixture())); expect(gpu.result.current.reading).toBeNull();
  invoke.mockResolvedValue(gpuFixture()); disk.unmount();
  await advance(); expect(gpu.result.current.status).toBe("live");
});

it("shares in-flight work across remount and renews sessions after visibility interruption", async () => {
  let release!: (value: unknown) => void;
  invoke.mockReturnValueOnce(new Promise(resolve => { release = resolve; })).mockResolvedValue(gpuFixture());
  const old = renderHook(() => useGpuReadings()); await settle(); old.unmount();
  const next = renderHook(() => useGpuReadings()); await settle(); expect(invoke).toHaveBeenCalledTimes(1);
  await act(async () => release(gpuFixture())); await settle(); expect(invoke).toHaveBeenCalledTimes(2);
  const session = next.result.current.session;
  hidden = true; act(() => document.dispatchEvent(new Event("visibilitychange"))); await advance(10000);
  expect(invoke).toHaveBeenCalledTimes(2); expect(next.result.current.status).toBe("paused");
  hidden = false; act(() => document.dispatchEvent(new Event("visibilitychange"))); await settle();
  expect(next.result.current.session).not.toBe(session); expect(next.result.current.history).toHaveLength(1);
});

it("rejects malformed payloads, distinguishes empty and does not fabricate demo GPU data", async () => {
  useAppStore.setState({ demoMode: true });
  const view = renderHook(() => useGpuReadings()); await settle(); expect(invoke).not.toHaveBeenCalled();
  expect(view.result.current.status).toBe("unavailable");
  invoke.mockResolvedValueOnce({}).mockResolvedValue({ ...gpuFixture(), adapters: [] });
  act(() => useAppStore.setState({ demoMode: false })); await settle(); expect(view.result.current.status).toBe("error");
  await advance(); expect(view.result.current.status).toBe("empty");
});
