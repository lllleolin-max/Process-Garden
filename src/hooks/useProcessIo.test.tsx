import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useProcessIo, type IoRates } from "./useProcessIo";
import { useAppStore } from "../stores/appStore";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
const initial = useAppStore.getState();
let hidden = false;
beforeEach(() => {
  vi.useFakeTimers(); invoke.mockReset(); hidden = false;
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  Object.defineProperty(window, "__TAURI_INTERNALS__", { configurable: true, value: {} });
  useAppStore.setState({ demoMode: false, collector: "native", paused: false, displayMode: "windowed" });
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); Reflect.deleteProperty(window, "__TAURI_INTERNALS__"); useAppStore.setState(initial, true); });
const settle = () => act(async () => { await vi.dynamicImportSettled(); });
const advance = (ms = 1000) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

it("serializes multiple waiters waking from the same native request", async () => {
  const releases: Array<() => void> = [];
  let active = 0, peak = 0;
  invoke.mockImplementation(() => {
    active++; peak = Math.max(peak, active);
    return new Promise<null>(resolve => releases.push(() => { active--; resolve(null); }));
  });
  const first = renderHook(() => useProcessIo(42, 1_800_000_000));
  await settle();
  const second = renderHook(() => useProcessIo(43, 1_800_000_000));
  const third = renderHook(() => useProcessIo(44, 1_800_000_000));
  await settle();
  expect(invoke).toHaveBeenCalledTimes(1);
  await act(async () => releases[0]());
  await settle();
  expect(invoke).toHaveBeenCalledTimes(2);
  expect(peak).toBe(1);
  await act(async () => releases[1]());
  await settle();
  expect(invoke).toHaveBeenCalledTimes(3);
  expect(peak).toBe(1);
  first.unmount(); second.unmount(); third.unmount();
  await act(async () => releases[2]());
  expect(active).toBe(0);
});

it.each(["unmount", "hide", "pause"])("does not start native I/O when %s happens while loading the bridge", async change => {
  invoke.mockResolvedValue(null);
  const view = renderHook(() => useProcessIo(42, 1_800_000_000));
  if (change === "unmount") view.unmount();
  else if (change === "hide") {
    hidden = true;
    act(() => document.dispatchEvent(new Event("visibilitychange")));
  } else act(() => useAppStore.setState({ paused: true }));
  await settle();
  await advance(10000);
  expect(invoke).not.toHaveBeenCalled();
  if (change !== "unmount") expect(view.result.current.status).toBe("paused");
});

it("retains explicitly stale rates through failure/baseline, then starts fresh history", async () => {
  invoke.mockResolvedValueOnce(null).mockResolvedValueOnce({ readBytesPerSecond: 0, writtenBytesPerSecond: 20 })
    .mockRejectedValueOnce(new Error("denied")).mockResolvedValueOnce(null).mockResolvedValue({ readBytesPerSecond: 4, writtenBytesPerSecond: 5 });
  const view = renderHook(() => useProcessIo(42, 1_800_000_000));
  await settle(); expect(view.result.current.status).toBe("baseline");
  await advance(); expect(view.result.current.rates?.readBytesPerSecond).toBe(0);
  expect(view.result.current.history).toHaveLength(1);
  const session = invoke.mock.calls[0][1].session;
  const previous = view.result.current;
  await advance(); expect(view.result.current).toMatchObject({ status: "error", stale: true, rates: previous.rates, history: previous.history });
  await advance(); expect(view.result.current.status).toBe("baseline");
  expect(view.result.current.stale).toBe(true);
  expect(view.result.current.history).toBe(previous.history);
  expect(invoke.mock.calls[3][1].session).toBe(session);
  await advance(); expect(view.result.current.history).toHaveLength(1);
  expect(view.result.current.stale).toBe(false);
});

it("retains on pause but clears across PID reuse and data source changes", async () => {
  const rates = { readBytesPerSecond: 8, writtenBytesPerSecond: 16 };
  invoke.mockResolvedValue(rates);
  const view = renderHook(({ startedAt }) => useProcessIo(42, startedAt), { initialProps: { startedAt: 1800000000 } });
  await settle();
  act(() => useAppStore.setState({ paused: true }));
  expect(view.result.current).toMatchObject({ status: "paused", stale: true, rates });
  view.rerender({ startedAt: 1800000001 });
  expect(view.result.current.rates).toBeNull();
  expect(view.result.current.history).toEqual([]);
  act(() => useAppStore.setState({ paused: false }));
  await settle();
  expect(view.result.current.rates).toEqual(rates);
  act(() => useAppStore.setState({ demoMode: true }));
  expect(view.result.current).toMatchObject({ status: "unavailable", rates: null, history: [], stale: false });
});

it("stops when hidden or paused and resumes with a new session", async () => {
  invoke.mockResolvedValue(null);
  renderHook(() => useProcessIo(42, 1_800_000_000));
  await settle(); const session = invoke.mock.calls[0][1].session;
  hidden = true; act(() => document.dispatchEvent(new Event("visibilitychange")));
  await advance(10000); expect(invoke).toHaveBeenCalledTimes(1);
  hidden = false; act(() => document.dispatchEvent(new Event("visibilitychange")));
  await settle(); expect(invoke.mock.calls[1][1].session).not.toBe(session);
  act(() => useAppStore.setState({ paused: true }));
  await advance(10000); expect(invoke).toHaveBeenCalledTimes(2);
});

it("discards late results and serializes requests through selection changes", async () => {
  let resolve!: (rates: IoRates) => void;
  invoke.mockReturnValueOnce(new Promise<IoRates>(done => { resolve = done; })).mockResolvedValue(null);
  const view = renderHook(({ pid }) => useProcessIo(pid, 1_800_000_000), { initialProps: { pid: 42 } });
  await settle(); view.rerender({ pid: 43 });
  await settle(); expect(invoke).toHaveBeenCalledTimes(1);
  await act(async () => resolve({ readBytesPerSecond: 999, writtenBytesPerSecond: 999 }));
  await settle(); expect(invoke).toHaveBeenCalledTimes(2);
  expect(invoke.mock.calls[1][1].pid).toBe(43);
  expect(view.result.current.rates).toBeNull();
});

it("does not query demo data and rejects invalid rates", async () => {
  useAppStore.setState({ demoMode: true });
  const view = renderHook(() => useProcessIo(42, 1_800_000_000));
  await settle(); expect(invoke).not.toHaveBeenCalled();
  expect(view.result.current.status).toBe("unavailable");
  invoke.mockResolvedValue({ readBytesPerSecond: NaN, writtenBytesPerSecond: -1 });
  act(() => useAppStore.setState({ demoMode: false }));
  await settle(); expect(view.result.current.status).toBe("error");
  expect(view.result.current.history).toEqual([]);
});

it("expires stalled data without overlapping the outstanding request", async () => {
  let resolve!: (rates: IoRates) => void;
  invoke.mockReturnValueOnce(new Promise<IoRates>(done => { resolve = done; })).mockResolvedValue(null);
  const view = renderHook(() => useProcessIo(42, 1_800_000_000));
  await settle(); const session = invoke.mock.calls[0][1].session;
  await advance(6000);
  expect(view.result.current.status).toBe("error");
  expect(invoke).toHaveBeenCalledTimes(1);
  await act(async () => resolve({ readBytesPerSecond: 1000, writtenBytesPerSecond: 1000 }));
  expect(view.result.current.rates).toBeNull();
  await advance();
  expect(invoke.mock.calls[1][1].session).not.toBe(session);
  expect(view.result.current.status).toBe("baseline");
});
