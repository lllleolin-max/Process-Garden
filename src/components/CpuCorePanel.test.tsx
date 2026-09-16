import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { CpuCorePanel } from "./CpuCorePanel";
import { useAppStore } from "../stores/appStore";
import { useFeedHealth } from "../stores/feedHealth";
import { toObservation } from "../data/observation";

const initial = useAppStore.getState();
const health = useFeedHealth.getState();
afterEach(() => { cleanup(); useAppStore.setState(initial, true); useFeedHealth.setState(health, true); });
function setup(values?: (number | null)[]) {
  const snapshot = { ...initial.snapshot, logicalCpuCount: values?.length ?? 8, cpuCorePercents: values };
  useAppStore.setState({ locale: "en-US", collector: "native", reducedMotion: true, snapshot, history: [toObservation(snapshot)] });
  const view = render(<CpuCorePanel />);
  const details = view.container.querySelector("details")!;
  const toggle = (open: boolean) => { details.open = open; fireEvent(details, new Event("toggle")); };
  return { ...view, toggle };
}
it("mounts charts only while expanded and reaches every logical processor through bounded pages", () => {
  const view = setup(Array.from({ length: 20 }, (_, i) => i));
  expect(view.container.querySelectorAll("svg")).toHaveLength(0);
  view.toggle(true);
  expect(view.container.querySelectorAll("svg")).toHaveLength(8);
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText("CPU 8")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText("CPU 19")).toBeInTheDocument();
  expect(view.container.querySelectorAll("svg")).toHaveLength(4);
  expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  view.toggle(false);
  expect(view.container.querySelectorAll("svg")).toHaveLength(0);
});
it("distinguishes zero from unavailable values and exposes stale status", () => {
  const view = setup([0, null, NaN, 101]);
  view.toggle(true);
  expect(screen.getByText("0%")).toBeInTheDocument();
  expect(screen.getAllByText("—")).toHaveLength(3);
  act(() => useFeedHealth.setState({ failed: true }));
  expect(screen.getByText(/Stale data/)).toBeInTheDocument();
  act(() => useAppStore.setState({ locale: "zh-CN" }));
  expect(screen.getByText("逻辑处理器")).toBeInTheDocument();
  expect(screen.getByText(/数据已过期/)).toBeInTheDocument();
});
it("shows unsupported data honestly instead of manufacturing idle processors", () => {
  const view = setup();
  view.toggle(true);
  expect(screen.getByText(/readings are unavailable/)).toBeInTheDocument();
  expect(view.container.querySelectorAll("svg")).toHaveLength(0);
});
