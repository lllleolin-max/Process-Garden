import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { NetworkPanel } from "./NetworkPanel";
import { useAppStore } from "../stores/appStore";
import { toObservation } from "../data/observation";
import { networkHistory } from "../data/networkHistory";
import type { NetworkInterfaceRates } from "../types/system";
const initial = useAppStore.getState();
const row: NetworkInterfaceRates = { id: "18446744073709551615", name: "Ethernet", interfaceType: 6, operational: true, receivedBytesPerSecond: 0, sentBytesPerSecond: 1024 };
afterEach(() => { cleanup(); useAppStore.setState(initial, true); });
function setup(network: NetworkInterfaceRates[] | null = [row]) {
  const snapshot = { ...initial.snapshot, network };
  useAppStore.setState({ locale: "en-US", paused: true, collector: "native", displayMode: "windowed", snapshot, history: [toObservation(snapshot)] });
  const view = render(<NetworkPanel />);
  const details = view.container.querySelector("details")!;
  const toggle = (open: boolean) => { details.open = open; fireEvent(details, new Event("toggle")); };
  return { ...view, toggle };
}
it("mounts only two charts while open and distinguishes rates from baseline", () => {
  const view = setup();
  expect(view.container.querySelectorAll("svg")).toHaveLength(0);
  view.toggle(true);
  expect(screen.getByRole("region", { name: "Receive rate" })).toHaveTextContent("0 B/s");
  expect(screen.getByRole("region", { name: "Send rate" })).toHaveTextContent("1 KiB/s");
  expect(view.container.querySelectorAll("svg")).toHaveLength(2);
  act(() => useAppStore.setState({ snapshot: { ...initial.snapshot, network: [{ ...row, receivedBytesPerSecond: null }] } }));
  expect(screen.getByRole("region", { name: "Receive rate" })).toHaveTextContent("—");
  expect(screen.getByText("Waiting for consecutive valid samples")).toBeInTheDocument();
  view.toggle(false);
  expect(view.container.querySelectorAll("svg")).toHaveLength(0);
});
it("keeps every adapter reachable and preserves selection through samples", () => {
  const rows = Array.from({ length: 60 }, (_, i) => ({ ...row, id: String(i), name: `adapter-${i}` }));
  const view = setup(rows); view.toggle(true);
  expect(screen.getAllByRole("option")).toHaveLength(60);
  const select = screen.getByRole("combobox");
  fireEvent.change(select, { target: { value: "59" } });
  act(() => useAppStore.setState({ snapshot: { ...initial.snapshot, network: rows.map(item => ({ ...item, sentBytesPerSecond: 2 })) } }));
  expect(screen.getByRole("combobox")).toBe(select);
  expect(select).toHaveValue("59");
  expect(view.container.querySelectorAll("svg")).toHaveLength(2);
  act(() => useAppStore.setState({ displayMode: "wallpaper" }));
  expect(view.container.querySelectorAll("svg")).toHaveLength(0);
});
it("separates unavailable and empty tables and translates the empty state", () => {
  const view = setup(null); view.toggle(true);
  expect(screen.getByRole("status")).toHaveTextContent("Network interface data unavailable");
  act(() => useAppStore.setState({ snapshot: { ...initial.snapshot, network: [] } }));
  expect(screen.getByText("No network interfaces found")).toBeInTheDocument();
  act(() => useAppStore.setState({ locale: "zh-CN" }));
  expect(screen.getByText("未发现网络接口")).toBeInTheDocument();
});
it("breaks adapter history across failures, disconnects, resets and type changes", () => {
  const make = (network: NetworkInterfaceRates[] | null) => toObservation({ ...initial.snapshot, network });
  for (const gap of [null, [], [{ ...row, operational: false }], [{ ...row, receivedBytesPerSecond: null }], [{ ...row, interfaceType: 24 }]]) {
    const history = [make([row]), make(gap), make([{ ...row, receivedBytesPerSecond: 4 }])];
    expect(networkHistory(history, row, "receivedBytesPerSecond")).toEqual([4]);
    expect(networkHistory(history.slice(0, 2), row, "receivedBytesPerSecond")).toEqual([]);
  }
});

it("preserves chart nodes on samples but remounts on adapter and collector changes", () => {
  const rows = [row, { ...row, id: "other", name: "Other" }];
  const view = setup(rows); view.toggle(true);
  const line = screen.getByRole("region", { name: "Receive rate" }).querySelector("polyline");
  const select = screen.getByRole("combobox");
  select.focus();
  act(() => useAppStore.setState({ snapshot: { ...initial.snapshot, network: rows.map(item => ({ ...item, receivedBytesPerSecond: 10 })) } }));
  expect(screen.getByRole("region", { name: "Receive rate" }).querySelector("polyline")).toBe(line);
  expect(select).toHaveFocus();
  fireEvent.change(select, { target: { value: "other" } });
  const otherLine = screen.getByRole("region", { name: "Receive rate" }).querySelector("polyline");
  expect(otherLine).not.toBe(line);
  act(() => useAppStore.setState({ collector: "demo" }));
  expect(screen.getByRole("region", { name: "Receive rate" }).querySelector("polyline")).not.toBe(otherLine);
  expect(select).toHaveValue(row.id);
});

it("commits selection fallback after removal and does not resurrect an old adapter selection", () => {
  const rows = [row, { ...row, id: "other", name: "Other" }];
  const view = setup(rows); view.toggle(true);
  const select = screen.getByRole("combobox");
  fireEvent.change(select, { target: { value: "other" } });
  act(() => useAppStore.setState({ snapshot: { ...initial.snapshot, network: [row] } }));
  expect(select).toHaveValue(row.id);
  act(() => useAppStore.setState({ snapshot: { ...initial.snapshot, network: rows } }));
  expect(select).toHaveValue(row.id);
});

it("recovers from a failed query through an empty baseline to a fresh history tail", () => {
  const view = setup(); view.toggle(true);
  const line = view.container.querySelector("polyline");
  const select = screen.getByRole("combobox");
  select.focus();
  const observations = [toObservation({ ...initial.snapshot, network: [row] })];
  const update = (network: NetworkInterfaceRates[] | null) => {
    const snapshot = { ...initial.snapshot, network };
    observations.push(toObservation(snapshot));
    act(() => useAppStore.setState({ snapshot, history: [...observations] }));
  };
  update(null);
  expect(screen.getByRole("status")).toHaveTextContent("Network interface data unavailable");
  expect(screen.getByRole("status")).toHaveTextContent("not live");
  expect(screen.getByRole("region", { name: "Receive rate" })).toHaveAccessibleDescription(/not live/);
  expect(view.container.querySelectorAll("svg")).toHaveLength(2);
  expect(view.container.querySelector("polyline")).toBe(line);
  expect(select).toHaveFocus();
  update([{ ...row, receivedBytesPerSecond: null, sentBytesPerSecond: null }]);
  expect(screen.getByText("Waiting for consecutive valid samples")).toBeInTheDocument();
  expect(view.container.querySelector("polyline")).toHaveAttribute("points", "");
  update([{ ...row, receivedBytesPerSecond: 32, sentBytesPerSecond: 0 }]);
  expect(screen.queryByText("Waiting for consecutive valid samples")).toBeNull();
  expect(screen.getByRole("region", { name: "Receive rate" })).toHaveTextContent("32 B/s");
  expect(screen.getByRole("region", { name: "Send rate" })).toHaveTextContent("0 B/s");
  for (const line of view.container.querySelectorAll("polyline"))
    expect(line.getAttribute("points")?.trim().split(" ")).toHaveLength(1);
});

it("clears retained interfaces on empty observations and collector changes", () => {
  const view = setup(); view.toggle(true);
  const update = (network: NetworkInterfaceRates[] | null) => act(() =>
    useAppStore.setState({ snapshot: { ...initial.snapshot, network } }));
  update(null);
  expect(screen.getByRole("combobox")).toBeInTheDocument();
  act(() => useAppStore.setState({ collector: "demo" }));
  expect(screen.queryByRole("combobox")).toBeNull();
  update([row]);
  update([]);
  update(null);
  expect(screen.queryByRole("combobox")).toBeNull();
  act(() => useAppStore.setState({ locale: "zh-CN" }));
  expect(screen.getByRole("status")).toHaveTextContent("网络接口数据不可用");
});

it("tracks history by adapter identity rather than row order or display name", () => {
  const other = { ...row, id: "other", receivedBytesPerSecond: 999 };
  const history = [
    toObservation({ ...initial.snapshot, network: [row, other] }),
    toObservation({ ...initial.snapshot, network: [other, { ...row, name: "renamed", receivedBytesPerSecond: 4 }] }),
  ];
  expect(networkHistory(history, row, "receivedBytesPerSecond")).toEqual([0, 4]);
  expect(networkHistory(history, row, "receivedBytesPerSecond", 1)).toEqual([4]);
});
