import { Profiler } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import i18n from "../i18n/config";
import { useAppStore } from "../stores/appStore";
import { TopBar } from "./TopBar";
import { useFeedHealth } from "../stores/feedHealth";

const initial = useAppStore.getState();
afterEach(() => {
  cleanup();
  useAppStore.setState(initial);
  useFeedHealth.setState({ failed: false, stalled: false, lastSuccess: null });
  localStorage.clear();
});

it("only marks healthy unpaused native acquisition as a live animation state", async () => {
  await i18n.changeLanguage("en-US");
  useAppStore.setState({ ...initial, locale: "en-US", paused: false, collector: "demo" });
  render(<TopBar />);
  const button = screen.getByRole("button", { name: "Pause" });
  expect(button).toHaveAttribute("data-observation-state", "demo");
  act(() => useAppStore.setState({ collector: "native", demoMode: false }));
  expect(button).toHaveAttribute("data-observation-state", "live");
  act(() => useFeedHealth.setState({ failed: true }));
  expect(button).toHaveAttribute("data-observation-state", "stale");
  expect(button).toHaveTextContent("Stale data");
  act(() => useAppStore.setState({ paused: true }));
  expect(button).toHaveAttribute("data-observation-state", "paused");
  act(() => { useFeedHealth.setState({ failed: false }); useAppStore.setState({ paused: false }); });
  expect(button).toHaveAttribute("data-observation-state", "live");
});

it("does not commit toolbar renders for telemetry updates but keeps controls reactive", async () => {
  await i18n.changeLanguage("en-US");
  useAppStore.setState({ ...initial, locale: "en-US", paused: false, searchQuery: "", themeMenuOpen: false });
  const commit = vi.fn();
  render(<Profiler id="toolbar" onRender={commit}><TopBar /></Profiler>);
  commit.mockClear();
  for (let sample = 0; sample < 20; sample += 1) {
    act(() => useAppStore.setState({
      snapshot: { ...initial.snapshot, processes: [...initial.snapshot.processes] },
      history: [...initial.history], events: [...initial.events]
    }));
  }
  expect(commit).not.toHaveBeenCalled();
  act(() => useAppStore.setState({ searchQuery: "codex", paused: true }));
  expect(screen.getByRole("textbox", { name: "Search processes" })).toHaveValue("codex");
  expect(screen.getByRole("button", { name: "Resume" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "Resume" }));
  expect(useAppStore.getState().paused).toBe(false);
  expect(commit).toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Switch visual theme" }));
  const menu = screen.getByRole("dialog");
  const focused = document.activeElement;
  commit.mockClear();
  act(() => useAppStore.setState({ snapshot: { ...initial.snapshot, processes: [...initial.snapshot.processes] } }));
  expect(commit).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog")).toBe(menu);
  expect(document.activeElement).toBe(focused);
});
