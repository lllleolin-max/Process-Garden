import { Profiler } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import i18n from "../i18n/config";
import { useAppStore } from "../stores/appStore";
import { Inspector } from "./Inspector";

const initial = useAppStore.getState();
afterEach(() => { cleanup(); useAppStore.setState(initial, true); localStorage.clear(); });

it("does not rerender inspector charts for unrelated controls but updates selected telemetry", async () => {
  await i18n.changeLanguage("en-US");
  const process = initial.snapshot.processes[0];
  useAppStore.setState({ ...initial, locale: "en-US", selectedPid: process.pid, paused: true, reducedMotion: true }, true);
  const commit = vi.fn();
  render(<Profiler id="inspector" onRender={commit}><Inspector /></Profiler>);
  commit.mockClear();
  for (let index = 0; index < 20; index++) {
    act(() => useAppStore.setState({ searchQuery: `search-${index}`, events: [...initial.events], settingsOpen: index % 2 === 0 }));
  }
  expect(commit).not.toHaveBeenCalled();
  act(() => useAppStore.setState({ snapshot: { ...initial.snapshot, processes: initial.snapshot.processes.map(item =>
    item.pid === process.pid ? { ...item, name: "updated-inspector-process" } : item) } }));
  expect(screen.getByRole("heading", { name: "updated-inspector-process" })).toBeInTheDocument();
  expect(commit).toHaveBeenCalled();
  act(() => useAppStore.setState({ selectedPid: null }));
  expect(screen.queryByRole("heading", { name: "updated-inspector-process" })).toBeNull();
});
