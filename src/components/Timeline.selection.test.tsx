import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { Timeline } from "./Timeline";
import "../i18n/config";
import { useAppStore } from "../stores/appStore";
import { processIdentity } from "../animation/processIdentity";
import type { ProcessEvent } from "../types/system";

const initial = useAppStore.getState();
afterEach(() => { cleanup(); useAppStore.setState(initial, true); });

it("keeps both event entry points readable but non-selectable after PID reuse", () => {
  const old = { ...initial.snapshot.processes[0], pid: 42, name: "old-app", startedAt: 1_800_000_000 };
  const replacement = { ...old, name: "new-app", startedAt: old.startedAt + 1 };
  const event: ProcessEvent = { id: "old-event", pid: old.pid, processKey: processIdentity(old), processName: old.name, timestamp: initial.snapshot.timestamp, kind: "birth", messageKey: "events.born" };
  useAppStore.setState({ snapshot: { ...initial.snapshot, processes: [replacement] }, events: [event], selectedPid: 42 });
  const view = render(<Timeline />);
  const buttons = view.container.querySelectorAll<HTMLButtonElement>(".timeline-point, .recent-event");
  expect(buttons).toHaveLength(2);
  for (const button of buttons) {
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAttribute("aria-pressed", "false");
    act(() => useAppStore.setState({ selectedPid: null }));
    fireEvent.click(button);
    expect(useAppStore.getState().selectedPid).toBeNull();
  }
});

it("selects a matching lifetime, then stops selecting when the process disappears", () => {
  const process = initial.snapshot.processes[0];
  const event: ProcessEvent = { id: "current-event", pid: process.pid, processKey: processIdentity(process), processName: process.name, timestamp: initial.snapshot.timestamp, kind: "birth", messageKey: "events.born" };
  useAppStore.setState({ snapshot: { ...initial.snapshot, processes: [process] }, events: [event], selectedPid: null });
  const view = render(<Timeline />);
  for (const selector of [".timeline-point", ".recent-event"]) {
    const button = view.container.querySelector(selector)!;
    act(() => useAppStore.setState({ selectedPid: null }));
    fireEvent.click(button);
    expect(useAppStore.getState().selectedPid).toBe(process.pid);
    expect(button).toHaveAttribute("aria-pressed", "true");
  }
  act(() => useAppStore.setState({ snapshot: { ...initial.snapshot, processes: [] }, selectedPid: null }));
  for (const button of view.container.querySelectorAll(".timeline-point, .recent-event")) {
    fireEvent.click(button);
    expect(useAppStore.getState().selectedPid).toBeNull();
    expect(button).toHaveAttribute("aria-disabled", "true");
  }
});
