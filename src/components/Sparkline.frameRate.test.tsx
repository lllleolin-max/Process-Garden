import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useAppStore } from "../stores/appStore";
import { Sparkline } from "./Sparkline";

const initial = useAppStore.getState();
let frames: Map<number, FrameRequestCallback>, id: number;
function tick(now: number) {
  act(() => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now)); });
}
beforeEach(() => {
  frames = new Map(); id = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; });
  vi.stubGlobal("cancelAnimationFrame", (key: number) => frames.delete(key));
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  useAppStore.setState({ paused: false, reducedMotion: false, displayMode: "windowed" });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); useAppStore.setState(initial); });

it.each([30, 60, 120] as const)("paces SVG writes at %i Hz without changing transition duration", (fps) => {
  useAppStore.setState({ animationFps: fps });
  const view = render(<Sparkline values={[0, 10, 0]} />);
  const line = view.container.querySelector("polyline")!;
  view.rerender(<Sparkline values={[10, 0, 10]} />);
  const writes = vi.spyOn(line, "setAttribute");
  for (let index = 0; index <= 51; index++) tick(1000 + index * 1000 / 120);
  const pointsWrites = writes.mock.calls.filter(([name]) => name === "points").length;
  expect(pointsWrites).toBeGreaterThanOrEqual(Math.floor(0.42 * fps));
  expect(pointsWrites).toBeLessThanOrEqual(Math.ceil(0.42 * fps) + 2);
  expect(line).toHaveAttribute("points", "0.0,6.0 80.0,38.0 160.0,6.0");
  expect(frames.size).toBe(0);
});

it("does not restart an active transition when the selected rate changes", () => {
  useAppStore.setState({ animationFps: 30 });
  const view = render(<Sparkline values={[0, 10, 0]} />);
  view.rerender(<Sparkline values={[10, 0, 10]} />);
  tick(1000); tick(1200);
  const line = view.container.querySelector("polyline")!;
  const before = line.getAttribute("points");
  act(() => useAppStore.setState({ animationFps: 120 }));
  expect(line.getAttribute("points")).toBe(before);
  tick(1425);
  expect(line).toHaveAttribute("points", "0.0,6.0 80.0,38.0 160.0,6.0");
  expect(frames.size).toBe(0);
});
