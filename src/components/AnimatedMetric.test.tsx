import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useAppStore } from "../stores/appStore";
import { AnimatedMetric } from "./AnimatedMetric";

const initial = useAppStore.getState();
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); useAppStore.setState(initial, true); });
it.each([30, 60, 120] as const)("continues from displayed values and settles at %i Hz", fps => {
  let id = 0;
  const frames = new Map<number, FrameRequestCallback>();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; });
  vi.stubGlobal("cancelAnimationFrame", (key: number) => frames.delete(key));
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  useAppStore.setState({ paused: false, reducedMotion: false, displayMode: "windowed", animationFps: fps });
  const tick = (now: number) => act(() => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now)); });
  const format = (value: number) => value.toFixed(1);
  const view = render(<AnimatedMetric value={0} format={format} />);
  view.rerender(<AnimatedMetric value={100} format={format} />);
  tick(1000); tick(1160);
  const displayed = view.container.textContent;
  expect(Number(displayed)).toBeGreaterThan(0);
  expect(Number(displayed)).toBeLessThan(100);
  expect(view.container.firstChild).toHaveAttribute("aria-label", "100.0");
  view.rerender(<AnimatedMetric value={20} format={format} />);
  expect(view.container.textContent).toBe(displayed);
  tick(1170); tick(1500);
  expect(view.container.textContent).toBe("20.0");
  expect(frames.size).toBe(0);
  view.rerender(<AnimatedMetric value={40} format={format} />);
  act(() => useAppStore.setState({ paused: true }));
  expect(view.container.textContent).toBe("40.0");
  expect(frames.size).toBe(0);
});

it.each([30, 60, 120] as const)("bounds DOM writes at %i Hz and releases hidden or unmounted work", fps => {
  let id = 0;
  const frames = new Map<number, FrameRequestCallback>();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; });
  vi.stubGlobal("cancelAnimationFrame", (key: number) => frames.delete(key));
  const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  useAppStore.setState({ paused: false, reducedMotion: false, displayMode: "windowed", animationFps: fps });
  const tick = (now: number) => act(() => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now)); });
  const format = (value: number) => value.toFixed(1);
  const view = render(<AnimatedMetric value={0} format={format} />);
  view.rerender(<AnimatedMetric value={100} format={format} />);
  const writes = vi.spyOn(view.container.querySelector('[aria-hidden="true"]')!, "textContent", "set");
  for (let index = 0; index <= 40; index++) tick(1000 + index * 1000 / 120);
  // Rounded labels may repeat across frames; only changed text needs a write.
  expect(writes.mock.calls.length).toBeGreaterThan(0);
  expect(writes.mock.calls.length).toBeLessThanOrEqual(Math.ceil(0.32 * fps) + 2);
  expect(frames.size).toBe(0);
  view.rerender(<AnimatedMetric value={50} format={format} />);
  hidden.mockReturnValue(true);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(view.container.textContent).toBe("50.0");
  expect(frames.size).toBe(0);
  hidden.mockReturnValue(false);
  view.rerender(<AnimatedMetric value={NaN} format={format} />);
  expect(view.container.textContent).toBe("—");
  expect(frames.size).toBe(0);
  view.rerender(<AnimatedMetric value={0} format={format} />);
  expect(view.container.textContent).toBe("0.0");
  expect(frames.size).toBe(0);
  view.rerender(<AnimatedMetric value={10} format={format} />);
  expect(frames.size).toBe(1);
  view.unmount();
  expect(frames.size).toBe(0);
});

it("does not interpolate demo observations into native measurements", () => {
  const frames = new Map<number, FrameRequestCallback>();
  let id = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; });
  vi.stubGlobal("cancelAnimationFrame", (key: number) => frames.delete(key));
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  useAppStore.setState({ collector: "demo", paused: false, reducedMotion: false, displayMode: "windowed" });
  const format = (value: number) => value.toFixed(1);
  const view = render(<AnimatedMetric value={10} format={format} />);
  view.rerender(<AnimatedMetric value={30} format={format} />);
  expect(frames.size).toBe(1);
  act(() => useAppStore.setState({ collector: "native" }));
  expect(view.container.textContent).toBe("30.0");
  expect(frames.size).toBe(0);
  view.rerender(<AnimatedMetric value={40} format={format} />);
  expect(frames.size).toBe(1);
});

it("does not write repeated rounded labels while retaining the final observation", () => {
  let id = 0;
  const frames = new Map<number, FrameRequestCallback>();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; });
  vi.stubGlobal("cancelAnimationFrame", (key: number) => frames.delete(key));
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  useAppStore.setState({ paused: false, reducedMotion: false, displayMode: "windowed", animationFps: 120 });
  const format = (value: number) => `${Math.round(value)}%`;
  const view = render(<AnimatedMetric value={20.1} format={format} />);
  const writes = vi.spyOn(view.container.querySelector('[aria-hidden="true"]')!, "textContent", "set");
  view.rerender(<AnimatedMetric value={20.4} format={format} />);
  for (let index = 0; index <= 40; index++) {
    act(() => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(1000 + index * 1000 / 120)); });
  }
  expect(writes).not.toHaveBeenCalled();
  expect(view.container.textContent).toBe("20%");
  expect(frames.size).toBe(0);
});
