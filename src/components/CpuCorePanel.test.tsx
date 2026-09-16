import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CpuCorePanel } from "./CpuCorePanel";
import { useAppStore } from "../stores/appStore";
import { useFeedHealth } from "../stores/feedHealth";
import { toObservation } from "../data/observation";

const initial = useAppStore.getState();
const health = useFeedHealth.getState();
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); useAppStore.setState(initial, true); useFeedHealth.setState(health, true); });
function setup(values?: (number | null)[]) {
  const snapshot = { ...initial.snapshot, logicalCpuCount: values?.length ?? 8, cpuCorePercents: values };
  useAppStore.setState({ locale: "en-US", collector: "native", reducedMotion: true, snapshot, history: [toObservation(snapshot)] });
  const view = render(<CpuCorePanel />);
  const details = view.container.querySelector("details")!;
  const toggle = (open: boolean) => { details.open = open; fireEvent(details, new Event("toggle")); };
  return { ...view, toggle };
}
it("mounts charts only while expanded and reaches every logical processor through bounded pages", () => {
  const view = setup(Array.from({ length: 20 }, (_, i) => i));
  expect(view.container.querySelectorAll("svg")).toHaveLength(0);
  view.toggle(true);
  expect(view.container.querySelectorAll("svg")).toHaveLength(8);
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText("CPU 8")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText("CPU 19")).toBeInTheDocument();
  expect(view.container.querySelectorAll("svg")).toHaveLength(4);
  expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  view.toggle(false);
  expect(view.container.querySelectorAll("svg")).toHaveLength(0);
});
it("distinguishes zero from unavailable values and exposes stale status", () => {
  const view = setup([0, null, NaN, 101]);
  view.toggle(true);
  expect(screen.getByRole("region", { name: "CPU 0" }).querySelector(".animated-metric-observation")).toHaveTextContent("0%");
  expect(view.container.querySelectorAll(".animated-metric-observation")).toHaveLength(4);
  for (const index of [1, 2, 3]) expect(screen.getByRole("region", { name: `CPU ${index}` }).querySelector(".animated-metric-observation")).toHaveTextContent("—");
  act(() => useFeedHealth.setState({ failed: true }));
  expect(screen.getByText(/Stale data/)).toBeInTheDocument();
  act(() => useAppStore.setState({ locale: "zh-CN" }));
  expect(screen.getByText("逻辑处理器")).toBeInTheDocument();
  expect(screen.getByText(/数据已过期/)).toBeInTheDocument();
});

it("animates core readings and cancels all frame work when collapsed", () => {
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  let id = 0;
  const frames = new Map<number, FrameRequestCallback>();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; });
  vi.stubGlobal("cancelAnimationFrame", (key: number) => frames.delete(key));
  const tick = (now: number) => act(() => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(now)); });
  const view = setup([0]);
  act(() => useAppStore.setState({ reducedMotion: false, paused: false, displayMode: "windowed" }));
  view.toggle(true);
  const region = screen.getByRole("region", { name: "CPU 0" });
  const visible = region.querySelector('strong [aria-hidden="true"]')!;
  act(() => useAppStore.setState({ snapshot: { ...useAppStore.getState().snapshot, cpuCorePercents: [100] } }));
  expect(visible).toHaveTextContent("0%");
  expect(region.querySelector(".animated-metric-observation")).toHaveTextContent("100%");
  tick(1000); tick(1160);
  expect(parseFloat(visible.textContent!)).toBeGreaterThan(0);
  expect(parseFloat(visible.textContent!)).toBeLessThan(100);
  view.toggle(false);
  expect(frames.size).toBe(0);
  view.toggle(true);
  expect(screen.getByRole("region", { name: "CPU 0" }).querySelector('strong [aria-hidden="true"]')).toHaveTextContent("100%");
});
it("shows unsupported data honestly instead of manufacturing idle processors", () => {
  const view = setup();
  view.toggle(true);
  expect(screen.getByText(/readings are unavailable/)).toBeInTheDocument();
  expect(view.container.querySelectorAll("svg")).toHaveLength(0);
});

it.each(["fullscreen", "wallpaper"] as const)("unmounts invisible charts in %s and restores expansion on return", displayMode => {
  useAppStore.setState({ displayMode: "windowed" });
  const view = setup([10, 20]);
  view.toggle(true);
  expect(view.container.querySelectorAll("svg")).toHaveLength(2);
  act(() => useAppStore.setState({ displayMode }));
  expect(view.container.querySelectorAll("svg")).toHaveLength(0);
  act(() => useAppStore.setState({ displayMode: "windowed" }));
  expect(view.container.querySelectorAll("svg")).toHaveLength(2);
});

it("preserves chart identity for telemetry but resets it across source or topology changes", () => {
  const view = setup([10, 20]);
  view.toggle(true);
  const original = screen.getByRole("region", { name: "CPU 0" });
  const before = useAppStore.getState().snapshot;
  act(() => useAppStore.setState({ snapshot: { ...before, cpuCorePercents: [30, 40] } }));
  expect(screen.getByRole("region", { name: "CPU 0" })).toBe(original);
  act(() => useAppStore.setState({ collector: "demo" }));
  const newSource = screen.getByRole("region", { name: "CPU 0" });
  expect(newSource).not.toBe(original);
  act(() => useAppStore.setState({ snapshot: { ...before, logicalCpuCount: 1, cpuCorePercents: [50] } }));
  expect(screen.getByRole("region", { name: "CPU 0" })).not.toBe(newSource);
});

it("keeps the current page on samples and commits a clamp after topology shrink", () => {
  const view = setup(Array.from({ length: 20 }, (_, i) => i));
  view.toggle(true);
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  const full = useAppStore.getState().snapshot;
  act(() => useAppStore.setState({ snapshot: { ...full, timestamp: full.timestamp + 1000 } }));
  expect(screen.getByText("CPU 19")).toBeInTheDocument();
  act(() => useAppStore.setState({ snapshot: { ...full, logicalCpuCount: 2, cpuCorePercents: [0, 1] } }));
  expect(screen.getByText("CPU 0")).toBeInTheDocument();
  act(() => useAppStore.setState({ snapshot: full }));
  expect(screen.getByText("CPU 0")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
});
