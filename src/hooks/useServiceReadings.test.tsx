import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useServiceReadings } from "./useServiceReadings";
import { useAppStore } from "../stores/appStore";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
const initial = useAppStore.getState();
afterEach(() => {
  cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); invoke.mockReset();
  Reflect.deleteProperty(window, "__TAURI_INTERNALS__"); useAppStore.setState(initial, true);
});

it("samples services at five seconds, retains only one table and recovers explicit stale state", async () => {
  vi.useFakeTimers();
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  Object.defineProperty(window, "__TAURI_INTERNALS__", { configurable: true, value: { invoke } });
  useAppStore.setState({ demoMode: false, collector: "native", paused: false, displayMode: "windowed" });
  const rows = [{ name: "Example", displayName: "Example", state: 4, processId: 42, serviceType: 32 }];
  invoke.mockResolvedValue(rows);
  const view = renderHook(useServiceReadings);
  await act(async () => { await vi.dynamicImportSettled(); });
  expect(invoke).toHaveBeenCalledWith("sample_services", { session: expect.any(String) });
  await act(async () => { await vi.advanceTimersByTimeAsync(4999); });
  expect(invoke).toHaveBeenCalledTimes(1);
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  expect(invoke).toHaveBeenCalledTimes(2);
  expect(view.result.current.history).toHaveLength(1);
  invoke.mockRejectedValueOnce(new Error("denied"));
  await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
  expect(view.result.current).toMatchObject({ status: "error", stale: true, rows });
  act(() => useAppStore.setState({ paused: true }));
  await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
  expect(invoke).toHaveBeenCalledTimes(3);
  expect(view.result.current.status).toBe("paused");
  invoke.mockResolvedValue([]);
  act(() => useAppStore.setState({ paused: false }));
  await act(async () => { await vi.dynamicImportSettled(); });
  expect(view.result.current).toMatchObject({ status: "empty", stale: false, rows: [], history: [[]] });
  act(() => useAppStore.setState({ demoMode: true }));
  expect(view.result.current).toMatchObject({ status: "unavailable", rows: [], history: [] });
});
