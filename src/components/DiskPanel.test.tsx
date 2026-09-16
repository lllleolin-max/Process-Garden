import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useAppStore } from "../stores/appStore";
import type { DiskState } from "../hooks/useDiskReadings";
import { DiskPanel } from "./DiskPanel";
const mock = vi.hoisted(() => ({ state: null as unknown as DiskState, calls: vi.fn() }));
vi.mock("../hooks/useDiskReadings", () => ({ useDiskReadings: () => { mock.calls(); return mock.state; } }));
const initial = useAppStore.getState();
const row = { id: "0 C:", readBytesPerSecond: 0, writeBytesPerSecond: 1024, activePercent: 25 };
beforeEach(() => {
  mock.calls.mockClear();
  mock.state = { status: "live", rows: [row], history: [[row]], session: "one" };
  useAppStore.setState({ locale: "en-US", displayMode: "windowed", reducedMotion: true });
});
afterEach(() => { cleanup(); useAppStore.setState(initial, true); });
function setup() {
  const view = render(<DiskPanel />);
  const details = view.container.querySelector("details")!;
  const toggle = (open: boolean) => { details.open = open; fireEvent(details, new Event("toggle")); };
  return { ...view, toggle };
}

it("mounts only three selected-disk charts and removes their work when collapsed or wallpaper", () => {
  const view = setup();
  expect(mock.calls).not.toHaveBeenCalled();
  view.toggle(true);
  expect(view.container.querySelectorAll("svg")).toHaveLength(3);
  expect(screen.getByRole("region", { name: "Read rate" })).toHaveTextContent("0 B/s");
  expect(screen.getByRole("region", { name: "Write rate" })).toHaveTextContent("1 KiB/s");
  view.toggle(false); expect(view.container.querySelectorAll("svg")).toHaveLength(0);
  view.toggle(true);
  act(() => useAppStore.setState({ displayMode: "wallpaper" }));
  expect(view.container.querySelectorAll("svg")).toHaveLength(0);
});

it("preserves selection, chart nodes and focus during updates, but resets chart identity on session change", () => {
  mock.state.rows = Array.from({ length: 60 }, (_, index) => ({ ...row, id: String(index) }));
  const view = setup(); view.toggle(true);
  const select = screen.getByRole("combobox");
  expect(screen.getAllByRole("option")).toHaveLength(60);
  fireEvent.change(select, { target: { value: "59" } }); select.focus();
  const line = screen.getByRole("region", { name: "Read rate" }).querySelector("polyline");
  mock.state = { ...mock.state, rows: mock.state.rows.map(item => ({ ...item, readBytesPerSecond: 100 })) };
  view.rerender(<DiskPanel />);
  expect(select).toHaveValue("59"); expect(select).toHaveFocus();
  expect(screen.getByRole("region", { name: "Read rate" }).querySelector("polyline")).toBe(line);
  mock.state = { ...mock.state, session: "two" }; view.rerender(<DiskPanel />);
  expect(screen.getByRole("region", { name: "Read rate" }).querySelector("polyline")).not.toBe(line);
  mock.state = { ...mock.state, rows: [mock.state.rows[0]] }; view.rerender(<DiskPanel />);
  expect(select).toHaveValue("0");
});

it("distinguishes unavailable, empty, baseline and partial readings in both languages", () => {
  mock.state = { status: "error", rows: [], history: [], session: "one" };
  const view = setup(); view.toggle(true);
  expect(screen.getByRole("status")).toHaveTextContent("unavailable");
  mock.state = { ...mock.state, status: "empty" }; view.rerender(<DiskPanel />);
  expect(screen.getByRole("status")).toHaveTextContent("No physical disk instances");
  mock.state = { ...mock.state, status: "baseline", rows: [{ ...row, readBytesPerSecond: null, writeBytesPerSecond: null, activePercent: null }] };
  view.rerender(<DiskPanel />);
  expect(screen.getByRole("status")).toHaveTextContent("consecutive valid samples");
  mock.state = { ...mock.state, status: "live", rows: [{ ...row, activePercent: null }] };
  act(() => useAppStore.setState({ locale: "zh-CN" }));
  expect(screen.getByText("部分指标尚无有效采样")).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "物理磁盘" })).toBeInTheDocument();
});
