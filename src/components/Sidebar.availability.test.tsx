import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import i18n from "../i18n/config";
import { Sidebar } from "./Sidebar";
import { useAppStore } from "../stores/appStore";

const initial = useAppStore.getState();
afterEach(() => { cleanup(); useAppStore.setState(initial, true); });

it("clears the thread curve for missing enumeration and starts a fresh observed tail", async () => {
  await i18n.changeLanguage("en-US");
  const known = { ...initial.snapshot, threadCount: 120 };
  const missing = { ...known, timestamp: known.timestamp + 1_000, threadCount: undefined };
  useAppStore.setState({ locale: "en-US", paused: true, snapshot: missing, history: [known, missing] });
  render(<Sidebar />);
  const card = screen.getByRole("region", { name: "Threads" });
  expect(card.querySelector(".metric-value")).toHaveTextContent("—");
  expect(card.querySelector("polyline")).toHaveAttribute("points", "");
  const recovered = { ...known, timestamp: missing.timestamp + 1_000, threadCount: 123 };
  act(() => useAppStore.setState({ snapshot: recovered, history: [known, missing, recovered] }));
  expect(card.querySelector(".metric-value")).toHaveTextContent("123");
  expect(card.querySelector("polyline")?.getAttribute("points")?.trim().split(" ")).toHaveLength(1);
});

it("displays an observed zero distinctly from an unavailable thread total", async () => {
  await i18n.changeLanguage("en-US");
  const zero = { ...initial.snapshot, threadCount: 0 };
  useAppStore.setState({ locale: "en-US", paused: true, snapshot: zero, history: [zero] });
  render(<Sidebar />);
  const card = screen.getByRole("region", { name: "Threads" });
  expect(card.querySelector(".metric-value")).toHaveTextContent(/^0$/);
  expect(card.querySelector("polyline")?.getAttribute("points")).not.toBe("");
});

it.each([0, -1, NaN, Infinity, 5])("does not invent memory utilization for invalid total %s", async memoryTotalBytes => {
  await i18n.changeLanguage("en-US");
  useAppStore.setState({ locale: "en-US", paused: true, snapshot: { ...initial.snapshot, memoryUsedBytes: 10, memoryTotalBytes } });
  render(<Sidebar />);
  const card = screen.getByRole("region", { name: "Memory" });
  expect(card.querySelector(".metric-detail")).toHaveTextContent("—");
  expect(card.querySelector(".metric-value")).toHaveTextContent("10 B");
});

it("immediately clears invalid animated CPU and memory readings", async () => {
  await i18n.changeLanguage("en-US");
  useAppStore.setState({ locale: "en-US", paused: false, reducedMotion: false, snapshot: { ...initial.snapshot, cpuPercent: 50, memoryUsedBytes: 100 } });
  render(<Sidebar />);
  act(() => useAppStore.setState({ snapshot: { ...initial.snapshot, cpuPercent: 101, memoryUsedBytes: -1 } }));
  for (const name of ["CPU", "Memory"]) {
    const card = screen.getByRole("region", { name });
    expect(card.querySelector('.metric-value [aria-hidden="true"]')).toHaveTextContent(/^—$/);
  }
});
