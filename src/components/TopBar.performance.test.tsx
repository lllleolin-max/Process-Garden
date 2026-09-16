import { Profiler } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import i18n from "../i18n/config";
import { useAppStore } from "../stores/appStore";
import { TopBar } from "./TopBar";

const initial = useAppStore.getState();
afterEach(() => {
  cleanup();
  useAppStore.setState(initial);
  localStorage.clear();
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
