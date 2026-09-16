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

it("uses a fixed percentage scale without amplifying small CPU fluctuations", () => {
  useAppStore.setState({ reducedMotion: true });
  const view = render(<Sparkline values={[0, 1, 0]} scale="percent" />);
  const line = view.container.querySelector("polyline")!;
  expect(line).toHaveAttribute("points", "0.0,38.0 80.0,37.7 160.0,38.0");
  view.rerender(<Sparkline values={[0, 100, 0]} scale="percent" />);
  expect(line).toHaveAttribute("points", "0.0,38.0 80.0,6.0 160.0,38.0");
  view.rerender(<Sparkline values={[10, 101, 20]} scale="percent" />);
  expect(line).toHaveAttribute("points", "160.0,31.6");
  view.rerender(<Sparkline values={[0, 1, 0]} scale="auto" />);
  expect(line).toHaveAttribute("points", "0.0,38.0 80.0,6.0 160.0,38.0");
});

it("rebases an in-flight curve when its viewBox height changes", () => {
  const view = render(<Sparkline values={[0, 10, 0]} height={40} />);
  view.rerender(<Sparkline values={[10, 0, 10]} height={40} />);
  tick(1000); tick(1200);
  const line = view.container.querySelector("polyline")!;
  const before = line.getAttribute("points")!.split(" ").map(point => point.split(",").map(Number));
  view.rerender(<Sparkline values={[10, 0, 10]} height={80} />);
  const rebased = line.getAttribute("points")!.split(" ").map(point => point.split(",").map(Number));
  expect(rebased).toEqual(before.map(([x, y]) => [x, Number((y * 2).toFixed(1))]));
  expect(view.container.querySelector("polygon")).toHaveAttribute("points", `0,80 ${line.getAttribute("points")} 160,80`);
  expect(view.container.querySelector("circle")).toHaveAttribute("cy", rebased.at(-1)![1].toFixed(1));
  expect(frames.size).toBe(1);
  tick(1210); tick(1640);
  expect(line).toHaveAttribute("points", "0.0,6.0 80.0,76.0 160.0,6.0");
  expect(frames.size).toBe(0);
});

it("morphs a growing history and reverses from the displayed curve when interrupted", () => {
  useAppStore.setState({ animationFps: 60 });
  const view = render(<Sparkline values={[0, 10, 0]} />);
  const line = view.container.querySelector("polyline")!;
  const original = line.getAttribute("points");
  view.rerender(<Sparkline values={[0, 10, 0, 20]} />);
  expect(line.getAttribute("points")).toBe(original);
  tick(1000); tick(1200);
  const intermediate = line.getAttribute("points");
  expect(intermediate).not.toBe(original);
  view.rerender(<Sparkline values={[10, 0]} />);
  expect(line.getAttribute("points")).toBe(intermediate);
  tick(1210); tick(1640);
  expect(line).toHaveAttribute("points", "0.0,6.0 160.0,38.0");
  expect(frames.size).toBe(0);
});

it("mounts fill on the displayed curve without restarting an in-flight transition", () => {
  const view = render(<Sparkline values={[0, 10, 0]} fill={false} />);
  view.rerender(<Sparkline values={[10, 0, 10]} fill={false} />);
  tick(1000); tick(1200);
  const line = view.container.querySelector("polyline")!;
  const intermediate = line.getAttribute("points");
  view.rerender(<Sparkline values={[10, 0, 10]} fill />);
  expect(line.getAttribute("points")).toBe(intermediate);
  expect(view.container.querySelector("polygon")).toHaveAttribute("points", `0,42 ${intermediate} 160,42`);
  tick(1425);
  expect(line).toHaveAttribute("points", "0.0,6.0 80.0,38.0 160.0,6.0");
  expect(view.container.querySelector("polygon")).toHaveAttribute("points", `0,42 ${line.getAttribute("points")} 160,42`);
  expect(frames.size).toBe(0);
});

it("does not bridge invalid observations or display a stale tip when the latest sample is missing", () => {
  useAppStore.setState({ reducedMotion: true });
  const view = render(<Sparkline values={[100, Number.NaN, 0, 10]} />);
  const line = view.container.querySelector("polyline")!;
  expect(line).toHaveAttribute("points", "0.0,38.0 160.0,6.0");
  view.rerender(<Sparkline values={[0, 10, Number.POSITIVE_INFINITY]} />);
  expect(line).toHaveAttribute("points", "");
  expect(view.container.querySelector("polygon")).toHaveAttribute("points", "");
  expect(view.container.querySelector("circle")).toBeNull();
  view.rerender(<Sparkline values={[10, Number.NaN, 0]} />);
  expect(line).toHaveAttribute("points", "160.0,38.0");
  expect(view.container.querySelector("circle")).not.toBeNull();
  expect(frames.size).toBe(0);
});

it.each(["paused", "reducedMotion", "wallpaper"])("settles and releases frames when %s disables visible motion", reason => {
  const view = render(<Sparkline values={[0, 10, 0]} />);
  view.rerender(<Sparkline values={[10, 0, 10]} />);
  tick(1000); tick(1100);
  expect(frames.size).toBe(1);
  act(() => useAppStore.setState(reason === "wallpaper" ? { displayMode: "wallpaper" }
    : reason === "paused" ? { paused: true } : { reducedMotion: true }));
  expect(frames.size).toBe(0);
  expect(view.container.querySelector("polyline")).toHaveAttribute("points", "0.0,6.0 80.0,38.0 160.0,6.0");
  act(() => useAppStore.setState({ paused: false, reducedMotion: false, displayMode: "windowed" }));
  expect(frames.size).toBe(0);
});

it("finishes hidden transitions and does not replay stale motion after returning", () => {
  const view = render(<Sparkline values={[0, 10, 0]} />);
  view.rerender(<Sparkline values={[10, 0, 10]} />);
  tick(1000); tick(1100);
  vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(frames.size).toBe(0);
  expect(view.container.querySelector("polyline")).toHaveAttribute("points", "0.0,6.0 80.0,38.0 160.0,6.0");
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  tick(1_000_000);
  expect(frames.size).toBe(0);
});

it("releases its frame and visibility listener on unmount", () => {
  const added = vi.spyOn(document, "addEventListener");
  const removed = vi.spyOn(document, "removeEventListener");
  const view = render(<Sparkline values={[0, 10, 0]} />);
  view.rerender(<Sparkline values={[10, 0, 10]} />);
  tick(1000);
  const listener = added.mock.calls.find(([type]) => type === "visibilitychange")?.[1];
  expect(listener).toBeDefined();
  view.unmount();
  expect(frames.size).toBe(0);
  expect(removed).toHaveBeenCalledWith("visibilitychange", listener);
});
