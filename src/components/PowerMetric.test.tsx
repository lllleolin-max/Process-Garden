import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../i18n/config";
import { formatWatts } from "../i18n/formatters";
import { useAppStore } from "../stores/appStore";
import type { PowerSnapshot } from "../types/system";
import { PowerMetric } from "./PowerMetric";

const initial = useAppStore.getInitialState();
const battery: PowerSnapshot = { watts: 24.375, source: "battery" };
const gpu: PowerSnapshot = { watts: 18.5, source: "intel" };
const missing: PowerSnapshot = { watts: null, source: "unavailable" };
function sample(power: PowerSnapshot, timestamp = Date.now()) {
  return { ...initial.snapshot, power, timestamp };
}

beforeEach(async () => {
  await i18n.changeLanguage("en-US");
  useAppStore.setState({ ...initial, locale: "en-US", reducedMotion: true, demoMode: false, collector: "native", snapshot: sample(battery), history: [sample(battery)] }, true);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  useAppStore.setState(initial, true);
});

describe("power measurement presentation", () => {
  it("labels real battery discharge and Intel package scope in both card and wallpaper HUD", () => {
    render(<><PowerMetric /><PowerMetric compact /></>);
    expect(screen.getByRole("region", { name: "System power" })).toHaveTextContent("24.4 W");
    expect(screen.getByRole("region", { name: "System power" })).toHaveTextContent("Battery discharge");
    act(() => useAppStore.setState({ snapshot: sample(gpu) }));
    expect(screen.getByRole("region", { name: "Package power" })).toHaveTextContent("18.5 W");
    expect(screen.getByRole("region", { name: "Package power" })).toHaveAttribute("title", expect.stringContaining("not total computer power"));
    expect(screen.getByLabelText("Package power: 18.5 W. Intel package sensor")).toBeInTheDocument();
  });

  it("renders missing or invalid sensors as a dash and clears the curve", () => {
    const view = render(<PowerMetric />);
    for (const power of [missing, { watts: NaN, source: "battery" }, { watts: -5, source: "battery" }] as PowerSnapshot[]) {
      act(() => useAppStore.setState({ snapshot: sample(power) }));
      expect(screen.getByRole("region", { name: "Power" })).toHaveTextContent("—");
      expect(screen.getByText("No available sensor")).toBeInTheDocument();
      expect(view.container.querySelector("polyline")).toHaveAttribute("points", "");
    }
    expect(formatWatts(0, "en-US")).toBe("0.0 W");
    expect(formatWatts(Infinity, "zh-CN")).toBe("—");
  });

  it("never presents fallback demo watts as a reading of this computer", () => {
    useAppStore.setState({ collector: "demo", demoMode: false, snapshot: initial.snapshot });
    render(<PowerMetric />);
    expect(screen.getByRole("region", { name: "Power" })).toHaveTextContent("—");
    expect(screen.getByText("No local reading yet")).toBeInTheDocument();
    act(() => useAppStore.setState({ demoMode: true }));
    expect(screen.getByRole("region", { name: "Power · Demo" })).toHaveTextContent("Simulated reading");
    act(() => useAppStore.setState({ collector: "native", snapshot: sample(battery) }));
    expect(screen.getByRole("region", { name: "Power" })).toHaveTextContent("—");
  });

  it("starts a new curve after a source change or a missing sample", () => {
    useAppStore.setState({ snapshot: sample(gpu), history: [sample(battery), sample(gpu)] });
    const view = render(<PowerMetric />);
    expect(view.container.querySelector("polyline")!.getAttribute("points")!.split(" ")).toHaveLength(1);
    act(() => useAppStore.setState({ history: [sample(gpu), sample(missing), sample(gpu)] }));
    expect(view.container.querySelector("polyline")!.getAttribute("points")!.split(" ")).toHaveLength(1);
  });

  it("expires stalled live readings, then recovers on a fresh sample", () => {
    vi.useFakeTimers();
    render(<PowerMetric />);
    act(() => vi.advanceTimersByTime(5001));
    expect(screen.getByRole("region", { name: "Power" })).toHaveTextContent("—");
    expect(screen.getByText("Reading out of date")).toBeInTheDocument();
    act(() => useAppStore.setState({ snapshot: sample(battery) }));
    expect(screen.getByRole("region", { name: "System power" })).toHaveTextContent("24.4 W");
  });

  it("retains paused readings and marks them as paused, then expires on resume", async () => {
    vi.useFakeTimers();
    useAppStore.setState({ paused: true });
    render(<PowerMetric />);
    act(() => vi.advanceTimersByTime(60000));
    expect(screen.getByRole("region", { name: "System power" })).toHaveTextContent("24.4 W");
    expect(screen.getByText("Battery discharge · Sampling paused")).toBeInTheDocument();
    act(() => useAppStore.setState({ paused: false }));
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole("region", { name: "Power" })).toHaveTextContent("—");
    await act(async () => { await i18n.changeLanguage("zh-CN"); useAppStore.setState({ locale: "zh-CN", snapshot: sample(gpu) }); });
    expect(screen.getByRole("region", { name: "封装功耗" })).toHaveTextContent("Intel 封装传感器");
  });
});
