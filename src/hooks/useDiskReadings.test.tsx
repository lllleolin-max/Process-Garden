import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useDiskReadings } from "./useDiskReadings";
import { useAppStore } from "../stores/appStore";
const invoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
const initial = useAppStore.getState();
const row = { id: "0 C:", readBytesPerSecond: 0, writeBytesPerSecond: 1024, activePercent: 0 };
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

it("keeps rate warmup alive across errors, distinguishes empty/zero and bounds history", async () => {
  invoke.mockRejectedValueOnce("initial rate unavailable").mockResolvedValueOnce([{ ...row, readBytesPerSecond: null, writeBytesPerSecond: null, activePercent: null }]).mockResolvedValueOnce([]).mockResolvedValue([row]);
  const view = renderHook(() => useDiskReadings());
  await settle(); expect(view.result.current.status).toBe("error");
  const session = invoke.mock.calls[0][1].session;
  await advance(); expect(view.result.current.status).toBe("baseline");
  expect(invoke.mock.calls[1]).toEqual(["sample_disks", { session }]);
  await advance(); expect(view.result.current.status).toBe("empty");
  await advance(); expect(view.result.current.status).toBe("live");
  expect(view.result.current.rows[0].readBytesPerSecond).toBe(0);
  await advance(40000); expect(view.result.current.history).toHaveLength(36);
});

it.each(["unmount", "hide", "pause", "wallpaper"])("prevents bridge invocation when %s interrupts loading", async change => {
  invoke.mockResolvedValue([row]);
  const view = renderHook(() => useDiskReadings());
  if (change === "unmount") view.unmount();
  else if (change === "hide") { hidden = true; act(() => document.dispatchEvent(new Event("visibilitychange"))); }
  else act(() => useAppStore.setState(change === "pause" ? { paused: true } : { displayMode: "wallpaper" }));
  await settle(); await advance(10000);
  expect(invoke).not.toHaveBeenCalled();
});

it("stops on visibility changes and resumes with a fresh session", async () => {
  invoke.mockResolvedValue([row]);
  const view = renderHook(() => useDiskReadings());
  await settle(); const session = view.result.current.session;
  hidden = true; act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(view.result.current.status).toBe("paused");
  await advance(10000); expect(invoke).toHaveBeenCalledTimes(1);
  hidden = false; act(() => document.dispatchEvent(new Event("visibilitychange")));
  await settle(); expect(view.result.current.session).not.toBe(session);
  expect(view.result.current.history).toHaveLength(1);
});

it("expires stalled work without overlapping it or showing its late result", async () => {
  let release!: (value: unknown) => void;
  invoke.mockReturnValueOnce(new Promise(resolve => { release = resolve; })).mockResolvedValue([row]);
  const view = renderHook(() => useDiskReadings());
  await settle(); const session = view.result.current.session;
  await advance(5000); expect(view.result.current.status).toBe("error");
  expect(view.result.current.session).not.toBe(session);
  await advance(5000); expect(invoke).toHaveBeenCalledTimes(1);
  await act(async () => release([{ ...row, readBytesPerSecond: 999 }]));
  expect(view.result.current.rows).toEqual([]);
  await advance(); expect(invoke).toHaveBeenCalledTimes(2);
  expect(view.result.current.rows[0].readBytesPerSecond).toBe(0);
});

it("shares one outstanding bridge request across unmount/remount and ignores obsolete results", async () => {
  let release!: (value: unknown) => void;
  invoke.mockReturnValueOnce(new Promise(resolve => { release = resolve; })).mockResolvedValue([]);
  const first = renderHook(() => useDiskReadings());
  await settle(); first.unmount();
  const next = renderHook(() => useDiskReadings());
  await settle(); expect(invoke).toHaveBeenCalledTimes(1);
  await act(async () => release([row])); await settle();
  expect(invoke).toHaveBeenCalledTimes(2);
  expect(next.result.current.status).toBe("empty");
});

it("does not query demo mode and rejects malformed native data", async () => {
  useAppStore.setState({ demoMode: true });
  const view = renderHook(() => useDiskReadings());
  await settle(); expect(invoke).not.toHaveBeenCalled();
  expect(view.result.current.status).toBe("unavailable");
  invoke.mockResolvedValue([{ ...row, activePercent: 101 }]);
  act(() => useAppStore.setState({ demoMode: false }));
  await settle(); expect(view.result.current.status).toBe("error");
  expect(view.result.current.history).toEqual([]);
});

it("keeps stale disk layout during errors without bridging the recovered history", async () => {
  invoke.mockResolvedValue([row]); const view = renderHook(() => useDiskReadings()); await settle(); await advance();
  const previous = view.result.current;
  invoke.mockRejectedValueOnce("temporary"); await advance();
  expect(view.result.current.rows).toBe(previous.rows); expect(view.result.current.history).toBe(previous.history);
  expect(view.result.current).toMatchObject({ status: "error", stale: true, session: previous.session });
  await advance(); expect(view.result.current.stale).toBe(false); expect(view.result.current.history).toHaveLength(1);
  act(() => useAppStore.setState({ paused: true }));
  expect(view.result.current.rows).toEqual([row]); expect(view.result.current.stale).toBe(true);
  act(() => useAppStore.setState({ demoMode: true }));
  expect(view.result.current.rows).toEqual([]); expect(view.result.current.stale).toBe(false);
});
