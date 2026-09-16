import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useAppStore } from "../stores/appStore";
import type { useGpuReadings } from "../hooks/useGpuReadings";
import { gpuFixture } from "../tests/gpuFixture";
import { GpuPanel } from "./GpuPanel";
const mock = vi.hoisted(() => ({ state: null as unknown as ReturnType<typeof useGpuReadings>, calls: vi.fn() }));
vi.mock("../hooks/useGpuReadings", () => ({ useGpuReadings: () => { mock.calls(); return mock.state; } }));
const initial = useAppStore.getState();
beforeEach(() => {
  mock.calls.mockClear(); const reading = gpuFixture();
  mock.state = { status: "live", reading, history: [reading], session: "one", stale: false };
  useAppStore.setState({ locale: "en-US", displayMode: "windowed", reducedMotion: true });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); useAppStore.setState(initial, true); });
function setup() {
  const view = render(<GpuPanel />); const details = view.container.querySelector("details")!;
  const toggle = (open: boolean) => { details.open = open; fireEvent(details, new Event("toggle")); };
  return { ...view, toggle };
}

it("mounts at most three selected charts and stops work when closed or wallpaper", () => {
  const view = setup(); expect(mock.calls).not.toHaveBeenCalled(); view.toggle(true);
  expect(view.container.querySelectorAll("svg")).toHaveLength(3);
  expect(screen.getByRole("region", { name: "Engine observed sum" })).toHaveTextContent("0%");
  expect(screen.getByText(/not total GPU utilization/)).toBeInTheDocument();
  view.toggle(false); expect(view.container.querySelectorAll("svg")).toHaveLength(0);
  view.toggle(true); act(() => useAppStore.setState({ displayMode: "wallpaper" }));
  expect(view.container.querySelectorAll("svg")).toHaveLength(0);
});

it("keeps every engine reachable with stable selection, focus and chart nodes during sampling", () => {
  const adapter = mock.state.reading!.adapters[0];
  adapter.engines = Array.from({ length: 80 }, (_, id) => ({ ...adapter.engines[0], id }));
  const view = setup(); view.toggle(true);
  const select = screen.getByRole("combobox", { name: "Engine" });
  expect(within(select).getAllByRole("option")).toHaveLength(80);
  fireEvent.change(select, { target: { value: "79" } }); select.focus();
  const line = screen.getByRole("region", { name: "Engine observed sum" }).querySelector("polyline");
  const memoryLine = screen.getByRole("region", { name: "Dedicated memory usage" }).querySelector("polyline");
  mock.state = { ...mock.state, reading: structuredClone(mock.state.reading) };
  mock.state.reading!.adapters[0].engines.forEach(engine => engine.observedPercentSum = 40);
  view.rerender(<GpuPanel />); expect(select).toHaveValue("79"); expect(select).toHaveFocus();
  expect(screen.getByRole("region", { name: "Engine observed sum" }).querySelector("polyline")).toBe(line);
  fireEvent.change(select, { target: { value: "2" } });
  expect(screen.getByRole("region", { name: "Engine observed sum" }).querySelector("polyline")).not.toBe(line);
  expect(screen.getByRole("region", { name: "Dedicated memory usage" }).querySelector("polyline")).toBe(memoryLine);
  mock.state = { ...mock.state, session: "new" }; view.rerender(<GpuPanel />);
  expect(screen.getByRole("region", { name: "Dedicated memory usage" }).querySelector("polyline")).not.toBe(memoryLine);
  mock.state.reading!.adapters[0].engines = [adapter.engines[0]]; view.rerender(<GpuPanel />);
  expect(select).toHaveValue("0");
});

it("shows both-language baseline, unknown types, unavailable and empty states honestly", () => {
  const view = setup(); view.toggle(true);
  expect(screen.getByRole("option", { name: /Unknown type/ })).toBeInTheDocument();
  mock.state = { ...mock.state, status: "baseline" }; view.rerender(<GpuPanel />);
  expect(screen.getByRole("status")).toHaveTextContent("baseline");
  mock.state.reading!.adapters[0].engines[0].observedPercentSum = null;
  act(() => useAppStore.setState({ locale: "zh-CN" }));
  expect(screen.getByRole("region", { name: "引擎观测和" })).toHaveTextContent("—");
  expect(screen.getByText(/缺失值不补零/)).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "GPU 计数器实例" })).toBeInTheDocument();
  mock.state = { ...mock.state, status: "empty", reading: { ...gpuFixture(), adapters: [] } }; view.rerender(<GpuPanel />);
  expect(screen.getByRole("status")).toHaveTextContent("未发现");
  mock.state = { ...mock.state, status: "unavailable", reading: null }; view.rerender(<GpuPanel />);
  expect(screen.getByRole("status")).toHaveTextContent("桌面应用");
});

it("enriches device labels without replacing selected identities or chart nodes", () => {
  const view = setup(); view.toggle(true);
  const select = screen.getByRole("combobox", { name: "GPU counter instance" }); select.focus();
  const id = mock.state.reading!.adapters[0].id;
  const line = screen.getByRole("region", { name: "Engine observed sum" }).querySelector("polyline");
  expect(screen.getByText(/Device name unavailable/)).toBeInTheDocument();
  mock.state.reading!.adapters[0].device = { name: "Vendor GPU", software: false };
  view.rerender(<GpuPanel />);
  expect(screen.getByRole("option", { name: "Vendor GPU · 0" })).toBeInTheDocument();
  expect(select).toHaveValue(id); expect(select).toHaveFocus(); expect(select).toHaveAttribute("title", "Vendor GPU");
  expect(screen.getByRole("region", { name: "Engine observed sum" }).querySelector("polyline")).toBe(line);
  mock.state.reading!.adapters[0].device = { name: "Software renderer", software: true };
  view.rerender(<GpuPanel />); expect(screen.getByRole("option", { name: /Software adapter/ })).toBeInTheDocument();
  act(() => useAppStore.setState({ locale: "zh-CN" }));
  expect(screen.getByRole("option", { name: /软件适配器/ })).toBeInTheDocument();
  mock.state.reading!.adapters[0].device = null; view.rerender(<GpuPanel />);
  expect(select).toHaveValue(id); expect(screen.getByText(/设备名称暂不可用/)).toBeInTheDocument();
});

it.each([30, 60, 120] as const)("shares one animation frame at %i Hz and cancels on collapse", fps => {
  let id = 0;
  const frames = new Map<number, FrameRequestCallback>();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; });
  vi.stubGlobal("cancelAnimationFrame", (key: number) => frames.delete(key));
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  useAppStore.setState({ animationFps: fps, reducedMotion: false, paused: false, collector: "native" });
  const tick = (now: number) => act(() => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now)); });
  const view = setup(); view.toggle(true);
  const region = screen.getByRole("region", { name: "Engine observed sum" });
  const visible = region.querySelector('span[aria-hidden="true"]')!;
  const line = region.querySelector("polyline");
  const next = gpuFixture(); next.adapters[0].engines[0].observedPercentSum = 100;
  next.adapters[0].dedicated.bytes = 2048; next.adapters[0].shared.bytes = 4096;
  mock.state = { ...mock.state, reading: next, history: [...mock.state.history, next] };
  view.rerender(<GpuPanel />);
  expect(visible).toHaveTextContent(/^0%$/);
  expect(region.querySelector(".animated-metric-observation")).toHaveTextContent(/^100%$/);
  expect(frames.size).toBe(1);
  tick(1000); tick(1160);
  expect(parseFloat(visible.textContent!)).toBeGreaterThan(0);
  expect(parseFloat(visible.textContent!)).toBeLessThan(100);
  expect(region.querySelector("polyline")).toBe(line);
  mock.state = { ...mock.state, status: "error", stale: true }; view.rerender(<GpuPanel />);
  expect(frames.size).toBe(0);
  expect(screen.getByRole("status")).toHaveTextContent("not live");
  expect(region.querySelector("polyline")).toBe(line);
  expect(visible).toHaveTextContent(/^100%$/);
  const recovered = gpuFixture();
  mock.state = { ...mock.state, status: "live", stale: false, reading: recovered, history: [next, recovered] };
  view.rerender(<GpuPanel />); expect(frames.size).toBe(1);
  view.toggle(false); expect(frames.size).toBe(0);
});
