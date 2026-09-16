import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AnimatedMetric } from "./AnimatedMetric";
import { Sparkline } from "./Sparkline";
import { useAppStore } from "../stores/appStore";

const initial = useAppStore.getState();
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); useAppStore.setState(initial, true); });

it.each([30, 60, 120] as const)("cancels shared metric work immediately on OS reduced motion at %i Hz", animationFps => {
  let id = 0;
  const frames = new Map<number, FrameRequestCallback>();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; });
  vi.stubGlobal("cancelAnimationFrame", (key: number) => frames.delete(key));
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  const listeners = new Set<() => void>();
  const preference = {
    matches: false,
    addEventListener: (_: string, callback: () => void) => listeners.add(callback),
    removeEventListener: (_: string, callback: () => void) => listeners.delete(callback),
  };
  vi.stubGlobal("matchMedia", () => preference);
  useAppStore.setState({ paused: false, reducedMotion: false, displayMode: "windowed", animationFps });
  const format = (value: number) => value.toFixed(1);
  const content = (value: number) => <><AnimatedMetric value={value} format={format} /><Sparkline values={[0, value, 100]} scale="percent" /></>;
  const view = render(content(0));
  view.rerender(content(100));
  expect(frames.size).toBe(1);
  expect(listeners.size).toBe(2);
  act(() => { preference.matches = true; [...listeners].forEach(listener => listener()); });
  // No animation frame has fired: the preference event alone settles both.
  expect(frames.size).toBe(0);
  expect(view.container.querySelector('span[aria-hidden="true"]')).toHaveTextContent("100.0");
  expect(view.container.querySelector("polyline")).toHaveAttribute("points", "0.0,38.0 80.0,6.0 160.0,6.0");
  act(() => { preference.matches = false; [...listeners].forEach(listener => listener()); });
  expect(frames.size).toBe(0);
  view.rerender(content(50));
  expect(frames.size).toBe(1);
  expect(listeners.size).toBe(2);
  view.unmount();
  expect(frames.size).toBe(0);
  expect(listeners.size).toBe(0);
});
