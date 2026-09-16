import { Profiler } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import "../i18n/config";
import { useAppStore } from "../stores/appStore";
import { Timeline } from "./Timeline";

const initial = useAppStore.getState();
afterEach(() => {
  cleanup();
  useAppStore.setState(initial);
  localStorage.clear();
});

it("ignores unrelated controls and history but responds to new observations", () => {
  const commit = vi.fn();
  render(<Profiler id="timeline" onRender={commit}><Timeline /></Profiler>);
  commit.mockClear();
  for (let update = 0; update < 20; update += 1) {
    act(() => useAppStore.setState({ searchQuery: `query-${update}`, history: [...initial.history] }));
  }
  expect(commit).not.toHaveBeenCalled();
  act(() => useAppStore.setState({ snapshot: { ...initial.snapshot, timestamp: initial.snapshot.timestamp + 1000 } }));
  expect(commit).toHaveBeenCalled();
});
