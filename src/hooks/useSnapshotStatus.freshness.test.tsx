import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useSnapshotStatus } from "./useSnapshotStatus";
import { useAppStore } from "../stores/appStore";
import { useFeedHealth } from "../stores/feedHealth";

const initial = useAppStore.getState();
const health = useFeedHealth.getState();
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); useAppStore.setState(initial, true); useFeedHealth.setState(health, true); });

it("expires silent observations and recovers only when a new success arrives", () => {
  vi.useFakeTimers(); vi.setSystemTime(1800000000000);
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  useAppStore.setState({ collector: "native", paused: false, samplingMs: 1000, locale: "en-US" });
  useFeedHealth.setState({ failed: false, lastSuccess: Date.now() });
  const view = renderHook(useSnapshotStatus);
  expect(view.result.current).toBe("Live");
  act(() => vi.advanceTimersByTime(5000));
  expect(view.result.current).toBe("Stale data");
  act(() => useFeedHealth.setState({ lastSuccess: Date.now() }));
  expect(view.result.current).toBe("Live");
  act(() => useAppStore.setState({ paused: true }));
  act(() => vi.advanceTimersByTime(10000));
  expect(view.result.current).toBe("Paused");
  act(() => useAppStore.setState({ paused: false }));
  expect(view.result.current).toBe("Stale data");
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
});

it("rechecks elapsed wall time when a hidden document returns", () => {
  vi.useFakeTimers(); vi.setSystemTime(1800000000000);
  const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  useAppStore.setState({ collector: "native", paused: false, samplingMs: 1000, locale: "zh-CN" });
  useFeedHealth.setState({ failed: false, lastSuccess: Date.now() });
  const view = renderHook(useSnapshotStatus);
  expect(vi.getTimerCount()).toBe(0);
  vi.setSystemTime(Date.now() + 60000);
  hidden.mockReturnValue(false);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(view.result.current).toBe("数据已过期");
});

it.each([NaN, Infinity, 1800000001000])("rejects ambiguous sample timestamps %s without a retry timer loop", lastSuccess => {
  vi.useFakeTimers(); vi.setSystemTime(1800000000000);
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  useAppStore.setState({ collector: "native", paused: false, samplingMs: 1000, locale: "en-US" });
  useFeedHealth.setState({ failed: false, lastSuccess });
  const view = renderHook(useSnapshotStatus);
  expect(view.result.current).toBe("Stale data");
  expect(vi.getTimerCount()).toBe(0);
  act(() => useFeedHealth.setState({ lastSuccess: Date.now() }));
  expect(view.result.current).toBe("Live");
  expect(vi.getTimerCount()).toBe(1);
});
