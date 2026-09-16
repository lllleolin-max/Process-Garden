import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ProcessIo } from "./ProcessIo";
import { useAppStore } from "../stores/appStore";

const read = vi.hoisted(() => vi.fn());
vi.mock("../hooks/useProcessIo", () => ({ useProcessIo: () => {
  // Test-only signal models the hook's independent state notifications.
  useAppStore(s => s.snapshot.timestamp);
  return read();
} }));
const initial = useAppStore.getState();
const publish = () => act(() => useAppStore.setState(s => ({ snapshot: { ...s.snapshot, timestamp: s.snapshot.timestamp + 1 } })));
afterEach(() => { cleanup(); useAppStore.setState(initial, true); read.mockReset(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("shows binary rate units and truthful bilingual states without stale curves", () => {
  useAppStore.setState({ locale: "en-US", reducedMotion: true });
  const rates = { readBytesPerSecond: 1024, writtenBytesPerSecond: 1048576 };
  read.mockReturnValue({ status: "live", rates, history: [rates] });
  const view = render(<ProcessIo pid={42} startedAt={1800000000} />);
  const labels = () => [...view.container.querySelectorAll(".animated-metric-observation")].map(node => node.textContent);
  expect(labels()).toEqual(["1 KiB/s", "1 MiB/s"]);
  expect(view.container.querySelectorAll("svg")).toHaveLength(2);
  expect(screen.getByText(/not physical disk throughput/)).toBeInTheDocument();
  read.mockReturnValue({ status: "error", rates: null, history: [] });
  publish();
  view.rerender(<ProcessIo pid={42} startedAt={1800000000} />);
  expect(labels()).toEqual(["—", "—"]);
  expect(view.container.querySelectorAll("svg")).toHaveLength(0);
  act(() => useAppStore.setState({ locale: "zh-CN" }));
  expect(screen.getByText("读数不可用，正在重试")).toBeInTheDocument();
  read.mockReturnValue({ status: "live", rates: { readBytesPerSecond: 0, writtenBytesPerSecond: 0 }, history: [] });
  publish();
  view.rerender(<ProcessIo pid={42} startedAt={1800000000} />);
  expect(labels()).toEqual(["0 B/s", "0 B/s"]);
});

it("morphs displayed rates while exposing the actual value and clears errors immediately", () => {
  let id = 0;
  const frames = new Map<number, FrameRequestCallback>();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; });
  vi.stubGlobal("cancelAnimationFrame", (key: number) => frames.delete(key));
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  useAppStore.setState({ locale: "en-US", reducedMotion: false, paused: false, displayMode: "windowed" });
  read.mockReturnValue({ status: "live", rates: { readBytesPerSecond: 0, writtenBytesPerSecond: 0 }, history: [] });
  const view = render(<ProcessIo pid={42} startedAt={1800000000} />);
  read.mockReturnValue({ status: "live", rates: { readBytesPerSecond: 1024, writtenBytesPerSecond: 0 }, history: [] });
  publish();
  view.rerender(<ProcessIo pid={42} startedAt={1800000000} />);
  const visible = view.container.querySelector('strong [aria-hidden="true"]')!;
  expect(visible).toHaveTextContent("0 B/s");
  expect(view.container.querySelector(".animated-metric-observation")).toHaveTextContent("1 KiB/s");
  const tick = (now: number) => act(() => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(now)); });
  tick(1000); tick(1160);
  expect(visible.textContent).not.toBe("0 B/s");
  expect(visible.textContent).not.toBe("1 KiB/s");
  read.mockReturnValue({ status: "error", stale: true, rates: { readBytesPerSecond: 1024, writtenBytesPerSecond: 0 }, history: [] });
  publish();
  expect(visible).toHaveTextContent("1 KiB/s");
  expect(frames.size).toBe(0);
  expect(screen.getByRole("status")).toHaveTextContent("not live");
  read.mockReturnValue({ status: "error", rates: null, history: [] });
  publish();
  view.rerender(<ProcessIo pid={42} startedAt={1800000000} />);
  expect(visible).toHaveTextContent("—");
  expect(frames.size).toBe(0);
});

it("ignores parent rerenders with unchanged process props but responds to its own data", () => {
  useAppStore.setState({ reducedMotion: true });
  read.mockReturnValue({ status: "baseline", rates: null, history: [] });
  const view = render(<div><span>0</span><ProcessIo pid={42} startedAt={1800000000} /></div>);
  read.mockClear();
  for (let index = 1; index <= 20; index++) view.rerender(<div><span>{index}</span><ProcessIo pid={42} startedAt={1800000000} /></div>);
  expect(read).not.toHaveBeenCalled();
  read.mockReturnValue({ status: "live", rates: { readBytesPerSecond: 25, writtenBytesPerSecond: 0 }, history: [] });
  publish();
  expect(view.container.querySelector(".animated-metric-observation")).toHaveTextContent("25 B/s");
});

it("keeps retained curve nodes and describes stale values in both languages", () => {
  useAppStore.setState({ locale: "en-US", reducedMotion: true });
  const rates = { readBytesPerSecond: 8, writtenBytesPerSecond: 16 };
  read.mockReturnValue({ status: "live", rates, history: [rates], stale: false });
  const view = render(<ProcessIo pid={42} startedAt={1800000000} />);
  const line = view.container.querySelector("polyline");
  read.mockReturnValue({ status: "error", rates, history: [rates], stale: true });
  publish();
  expect(view.container.querySelector("polyline")).toBe(line);
  expect(screen.getByRole("region", { name: "Process I/O" })).toHaveAccessibleDescription(/not live/);
  expect(view.container.querySelector(".animated-metric-observation")).toHaveTextContent("8 B/s");
  act(() => useAppStore.setState({ locale: "zh-CN" }));
  expect(screen.getByRole("status")).toHaveTextContent("显示上次采样（非实时）");
});
