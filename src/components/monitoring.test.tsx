import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../i18n/config";
import { useAppStore } from "../stores/appStore";
import { Inspector } from "./Inspector";
import { Sparkline } from "./Sparkline";
import { Timeline } from "./Timeline";

const initial = useAppStore.getState();

beforeEach(async () => {
  await i18n.changeLanguage("en-US");
  useAppStore.setState({ ...initial, locale: "en-US", reducedMotion: false, paused: false, displayMode: "windowed" });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  useAppStore.setState(initial);
});

describe("monitoring motion and feedback", () => {
  it.each([NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])("rejects invalid discrete counts %s and preserves observed zero", value => {
    const process = { ...initial.snapshot.processes[0], threadCount: value, connections: value };
    const snapshot = { ...initial.snapshot, processes: [process] };
    useAppStore.setState({ selectedPid: process.pid, snapshot });
    const view = render(<Inspector />);
    const counts = () => [...view.container.querySelectorAll(".detail-grid strong")].slice(1, 3).map(node => node.textContent);
    expect(counts()).toEqual(["—", "—"]);
    for (const tab of ["Threads", "Connections"]) {
      fireEvent.click(screen.getByRole("tab", { name: tab }));
      expect(view.container.querySelector(".inspector-tab-summary strong")).toHaveTextContent(i18n.t("common.unavailable"));
    }
    act(() => useAppStore.setState({ snapshot: { ...snapshot, processes: [{ ...process, threadCount: 0, connections: 0 }] } }));
    expect(counts()).toEqual(["0", "0"]);
    expect(view.container.querySelector(".inspector-tab-summary strong")).toHaveTextContent("0");
    expect(view.container.querySelector(".activity-highlights")).toHaveTextContent("0 connections");
  });

  it("smooths Inspector readings without carrying values into a reused PID", () => {
    vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    let id = 0;
    const frames = new Map<number, FrameRequestCallback>();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; });
    vi.stubGlobal("cancelAnimationFrame", (key: number) => frames.delete(key));
    const tick = (now: number) => act(() => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now)); });
    const process = { ...initial.snapshot.processes[0], cpuPercent: 0, memoryBytes: 0 };
    const snapshot = { ...initial.snapshot, processes: [process] };
    useAppStore.setState({ selectedPid: process.pid, snapshot, history: [] });
    const view = render(<Inspector />);
    const readings = () => [...view.container.querySelectorAll('.resource-chart-title strong [aria-hidden="true"]')];
    const original = readings();
    act(() => useAppStore.setState({ snapshot: { ...snapshot, processes: [{ ...process, cpuPercent: 100, memoryBytes: 100 * 1024 * 1024 }] } }));
    expect(readings()[0]).toBe(original[0]);
    expect(readings()[0]).toHaveTextContent("0%");
    expect(view.container.querySelector(".animated-metric-observation")).toHaveTextContent("100%");
    tick(1000); tick(1160);
    expect(parseFloat(readings()[0].textContent!)).toBeGreaterThan(0);
    expect(parseFloat(readings()[0].textContent!)).toBeLessThan(100);
    expect(readings()[1]).not.toHaveTextContent(/^0 MB$/);
    act(() => useAppStore.setState({ snapshot: { ...snapshot, processes: [{ ...process, startedAt: process.startedAt + 1000, cpuPercent: 25 }] } }));
    expect(readings()[0]).not.toBe(original[0]);
    expect(readings()[0]).toHaveTextContent("25%");
    expect(readings()[1]).toHaveTextContent("0 MB");
    view.unmount();
    expect(frames.size).toBe(0);
  });

  it.each([NaN, Infinity, -1])("does not display invalid memory %s as observed zero or bridge its history", value => {
    const process = { ...initial.snapshot.processes[0], memoryBytes: value };
    const snapshot = { ...initial.snapshot, processes: [process] };
    useAppStore.setState({ reducedMotion: true, selectedPid: process.pid, snapshot, history: [snapshot] });
    const view = render(<Inspector />);
    const chart = view.container.querySelectorAll(".resource-chart")[1];
    expect(chart.querySelector("strong")).toHaveTextContent("—");
    expect(chart.querySelector("polyline")).toHaveAttribute("points", "");
    const zero = { ...snapshot, processes: [{ ...process, memoryBytes: 0 }] };
    act(() => useAppStore.setState({ snapshot: zero, history: [snapshot, zero] }));
    expect(chart.querySelector("strong")).toHaveTextContent("0 MB");
    expect(chart.querySelector("polyline")).toHaveAttribute("points", "160.0,40.0");
  });

  it("keeps process CPU on the same absolute percentage scale and marks invalid readings unavailable", () => {
    const process = { ...initial.snapshot.processes[0], cpuPercent: 0 };
    const history = [0, 1, 0].map(cpuPercent => ({ ...initial.snapshot, processes: [{ ...process, cpuPercent }] }));
    useAppStore.setState({ reducedMotion: true, selectedPid: process.pid, snapshot: { ...initial.snapshot, processes: [process] }, history });
    render(<Inspector />);
    const chart = screen.getByTitle("Whole-machine CPU capacity · fixed 0–100% scale");
    const line = chart.querySelector("polyline")!;
    expect(line).toHaveAttribute("points", "0.0,46.0 80.0,45.6 160.0,46.0");
    const invalid = { ...initial.snapshot, processes: [{ ...process, cpuPercent: NaN }] };
    act(() => useAppStore.setState({ snapshot: invalid, history: [...history, invalid] }));
    expect(chart.querySelector("strong")).toHaveTextContent("—");
    expect(chart.querySelector("polyline")).toBe(line);
    expect(line).toHaveAttribute("points", "");
    const recovery = { ...initial.snapshot, processes: [{ ...process, cpuPercent: 100 }] };
    act(() => useAppStore.setState({ snapshot: recovery, history: [...history, invalid, recovery] }));
    expect(line).toHaveAttribute("points", "160.0,6.0");
  });

  it("keeps embryo stage tied to the accepted snapshot and exposes child inspection", () => {
    vi.useFakeTimers();
    const now = Date.now();
    const parent = { ...initial.snapshot.processes[0], pid: 12010, name: "codex" };
    const child = { ...parent, pid: 12011, parentPid: parent.pid, name: "task-runner", startedAt: now - 10_000 };
    useAppStore.setState({ paused: true, selectedPid: parent.pid, snapshot: { ...initial.snapshot, timestamp: now, processes: [parent, child] } });
    render(<Inspector />);
    expect(screen.getByText("Seeded embryo")).toBeInTheDocument();
    expect(screen.getByText(/not the Agent's actual task progress/)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(300_000));
    fireEvent.click(screen.getByRole("tab", { name: "Threads" }));
    expect(screen.getByText("Seeded embryo")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Select task-runner process" }));
    expect(useAppStore.getState().selectedPid).toBe(child.pid);
    expect(screen.getByRole("heading", { name: "task-runner" })).toBeInTheDocument();
  });

  it("interpolates a sample, then continues from the visible curve when interrupted", () => {
    vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    let nextId = 0;
    const frames = new Map<number, FrameRequestCallback>();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++nextId, callback); return nextId; });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
    const tick = (time: number) => act(() => { const pending = [...frames.values()]; frames.clear(); pending.forEach((callback) => callback(time)); });
    const view = render(<Sparkline values={[0, 10, 0]} />);
    const line = view.container.querySelector("polyline")!;
    const original = line.getAttribute("points");
    view.rerender(<Sparkline values={[10, 0, 10]} />);
    expect(line.getAttribute("points")).toBe(original);
    tick(0); tick(180);
    const intermediate = line.getAttribute("points");
    expect(intermediate).not.toBe(original);
    view.rerender(<Sparkline values={[0, 5, 10]} />);
    expect(line.getAttribute("points")).toBe(intermediate);
    tick(200); tick(620);
    expect(line.getAttribute("points")).toBe("0.0,38.0 80.0,22.0 160.0,6.0");
    expect(frames.size).toBe(0);
    view.rerender(<Sparkline values={[10, 0, 10]} />);
    view.unmount();
    expect(frames.size).toBe(0);
  });

  it("renders empty, single and invalid samples without broken geometry, and skips reduced motion", () => {
    useAppStore.setState({ reducedMotion: true });
    const raf = vi.fn();
    vi.stubGlobal("requestAnimationFrame", raf);
    const view = render(<Sparkline values={[]} />);
    expect(view.container.querySelector("polyline")).toHaveAttribute("points", "");
    expect(view.container.querySelector("circle")).toBeNull();
    view.rerender(<Sparkline values={[NaN, 12, Infinity]} />);
    expect(view.container.querySelector("circle")).toBeNull();
    expect(view.container.querySelector("polyline")).toHaveAttribute("points", "");
    // Only a valid latest observation gets a tip; never resurrect a pre-gap value.
    view.rerender(<Sparkline values={[NaN, 12]} />);
    expect(view.container.querySelector("circle")).toHaveAttribute("cx", "160.0");
    expect(view.container.innerHTML).not.toMatch(/NaN|Infinity/);
    view.rerender(<Sparkline values={[10, 5]} />);
    expect(raf).not.toHaveBeenCalled();
  });

  it("keeps event positions and ages fixed while paused, even when another control rerenders", () => {
    vi.useFakeTimers();
    const now = Date.now();
    useAppStore.setState({ paused: true, snapshot: { ...initial.snapshot, timestamp: now }, events: [{ id: "test", pid: 5521, processName: "chrome", kind: "birth", messageKey: "events.born", timestamp: now - 10_000 }] });
    const view = render(<Timeline />);
    const marker = screen.getByRole("button", { name: "chrome Birth" });
    const left = marker.style.left;
    const time = view.container.querySelector("time")!.textContent;
    act(() => vi.advanceTimersByTime(90_000));
    fireEvent.click(screen.getByRole("button", { name: "All events" }));
    expect(screen.getByRole("button", { name: "chrome Birth" }).style.left).toBe(left);
    expect(view.container.querySelector("time")!.textContent).toBe(time);
  });

  it("reports clipboard failure without false success, and supports arrow-key tabs", async () => {
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    render(<Inspector />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Copy process summary" })));
    expect(screen.getByRole("status")).toHaveTextContent("Could not copy");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Overview" }), { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Threads" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Threads" })).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "inspector-tab-threads");
  });
});

