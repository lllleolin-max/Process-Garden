import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import i18n from "../i18n/config";
import { useAppStore } from "../stores/appStore";
import { ProcessExplorer } from "./ProcessExplorer";

const initial = useAppStore.getState();
let frames: Map<number, FrameRequestCallback>;
let id = 0;
beforeEach(async () => {
  await i18n.changeLanguage("en-US");
  frames = new Map(); id = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; });
  vi.stubGlobal("cancelAnimationFrame", (key: number) => frames.delete(key));
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  const process = { ...initial.snapshot.processes[0], cpuPercent: 0, memoryBytes: 1024 };
  useAppStore.setState({ ...initial, locale: "en-US", collector: "demo", paused: false, reducedMotion: false, displayMode: "windowed", snapshot: { ...initial.snapshot, processes: [process], processCount: 1 } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); useAppStore.setState(initial, true); });
const tick = (now: number) => act(() => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now)); });
const cells = () => within(within(screen.getByRole("table")).getAllByRole("row")[1]).getAllByRole("cell");
const visible = (cell: HTMLElement) => cell.querySelector('[aria-hidden="true"]')!;
function sample(cpuPercent: number, memoryBytes = 2048, startedAt?: number) {
  const snapshot = useAppStore.getState().snapshot;
  act(() => useAppStore.setState({ snapshot: { ...snapshot, processes: snapshot.processes.map(p => ({ ...p, cpuPercent, memoryBytes, startedAt: startedAt ?? p.startedAt })) } }));
}

it.each([30, 60, 120] as const)("smooths held-row readings at %i Hz and settles immediately on close", fps => {
  useAppStore.setState({ animationFps: fps });
  const close = vi.fn();
  const view = render(<ProcessExplorer open onClose={close} />);
  tick(0); tick(16);
  fireEvent.click(screen.getByRole("button", { name: "Keep row order" }));
  const before = cells();
  sample(100);
  expect(visible(before[2])).toHaveTextContent(/^0%$/);
  expect(before[2].querySelector(".animated-metric-observation")).toHaveTextContent(/^100%$/);
  expect(frames.size).toBe(2);
  tick(1000); tick(1160);
  expect(parseFloat(visible(before[2]).textContent!)).toBeGreaterThan(0);
  expect(parseFloat(visible(before[2]).textContent!)).toBeLessThan(100);
  expect(cells()[2]).toBe(before[2]);
  view.rerender(<ProcessExplorer open={false} onClose={close} />);
  expect(visible(before[2])).toHaveTextContent(/^100%$/);
  expect(frames.size).toBe(0);
  sample(50);
  expect(visible(before[2])).toHaveTextContent(/^50%$/);
  expect(frames.size).toBe(0);
});

it.each(["pause", "reduced", "source", "lifetime"])("cancels interpolation on %s changes without crossing identities", change => {
  render(<ProcessExplorer open onClose={() => {}} />);
  tick(0); tick(16);
  const before = cells()[2];
  sample(100);
  tick(1000); tick(1160);
  if (change === "pause") act(() => useAppStore.setState({ paused: true }));
  else if (change === "reduced") act(() => useAppStore.setState({ reducedMotion: true }));
  else if (change === "source") act(() => useAppStore.setState({ collector: "native" }));
  else sample(100, 2048, useAppStore.getState().snapshot.processes[0].startedAt + 1);
  expect(visible(cells()[2])).toHaveTextContent(/^100%$/);
  expect(frames.size).toBe(0);
  if (change === "source" || change === "lifetime") expect(cells()[2]).not.toBe(before);
  else expect(cells()[2]).toBe(before);
});

it("drops unavailable readings immediately and begins recovered observations without invented interpolation", () => {
  render(<ProcessExplorer open onClose={() => {}} />);
  tick(0); tick(16);
  sample(100);
  tick(1000); tick(1160);
  sample(NaN, Infinity);
  expect(visible(cells()[2])).toHaveTextContent(/^—$/);
  expect(visible(cells()[3])).toHaveTextContent(/^—$/);
  expect(frames.size).toBe(0);
  sample(0, 0);
  expect(visible(cells()[2])).toHaveTextContent(/^0%$/);
  expect(visible(cells()[3])).toHaveTextContent(/^0 MB$/);
  expect(frames.size).toBe(0);
});

it("animates only the visible 50 rows and cancels their work when paging", () => {
  const snapshot = useAppStore.getState().snapshot;
  const processes = Array.from({ length: 1500 }, (_, index) => ({ ...snapshot.processes[0], pid: index + 1 }));
  useAppStore.setState({ snapshot: { ...snapshot, processes, processCount: processes.length } });
  const view = render(<ProcessExplorer open onClose={() => {}} />);
  tick(0); tick(16);
  fireEvent.click(screen.getByRole("button", { name: "Keep row order" }));
  sample(100);
  // Exactly two numeric transitions per mounted row, never 3000 for all records.
  expect(frames.size).toBe(100);
  expect(view.container.querySelectorAll(".animated-metric-observation")).toHaveLength(100);
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(frames.size).toBe(0);
  expect(screen.getByText("Page 2 of 30")).toBeInTheDocument();
  expect(visible(cells()[2])).toHaveTextContent(/^100%$/);
  sample(50, 4096);
  expect(frames.size).toBe(100);
  view.unmount();
  expect(frames.size).toBe(0);
});
