import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { useAppStore } from "../stores/appStore";
import { ParentProcess } from "./ParentProcess";

const initial = useAppStore.getState();
afterEach(() => { cleanup(); useAppStore.setState(initial, true); });
it("selects the observed parent and rejects a later reused parent PID", () => {
  const parent = { ...initial.snapshot.processes[0], pid: 4, startedAt: 1800000000 };
  const child = { ...parent, pid: 8, parentPid: 4, startedAt: parent.startedAt + 10 };
  const processes = [parent, child];
  useAppStore.setState({ snapshot: { ...initial.snapshot, processes }, selectedPid: child.pid });
  render(<aside className="inspector" tabIndex={-1} aria-label="Inspector"><ParentProcess process={child} processes={processes} locale="en-US" /></aside>);
  const button = screen.getByRole("button");
  fireEvent.click(button);
  expect(useAppStore.getState().selectedPid).toBe(4);
  expect(screen.getByRole("complementary", { name: "Inspector" })).toHaveFocus();
  useAppStore.setState({ selectedPid: 8, snapshot: { ...initial.snapshot, processes: [{ ...parent, startedAt: child.startedAt + 1 }, child] } });
  fireEvent.click(button);
  expect(useAppStore.getState().selectedPid).toBe(8);
});
it("shows an unavailable parent as text instead of an actionable target", () => {
  const child = { ...initial.snapshot.processes[0], parentPid: 999 };
  render(<ParentProcess process={child} processes={[child]} locale="zh-CN" />);
  expect(screen.queryByRole("button")).toBeNull();
  expect(screen.getByText("PID 999 · 无法确认当前父进程")).toBeInTheDocument();
});

it("rejects an old click during a collector handover even with matching PID and start time", () => {
  const parent = { ...initial.snapshot.processes[0], pid: 4, startedAt: 1800000000 };
  const child = { ...parent, pid: 8, parentPid: 4, startedAt: parent.startedAt + 10 };
  const snapshot = { ...initial.snapshot, processes: [parent, child] };
  useAppStore.setState({ collector: "demo", snapshot, selectedPid: child.pid });
  render(<ParentProcess process={child} processes={snapshot.processes} locale="en-US" />);
  // The store changes before React has committed the new source's UI.
  useAppStore.setState({ collector: "native", snapshot, selectedPid: child.pid });
  fireEvent.click(screen.getByRole("button"));
  expect(useAppStore.getState().selectedPid).toBe(child.pid);
});

it.each(["exit", "restart", "reselect", "parent-exit"])("does not follow a stale relationship after %s", change => {
  const parent = { ...initial.snapshot.processes[0], pid: 4, startedAt: 1800000000 };
  const child = { ...parent, pid: 8, parentPid: 4, startedAt: parent.startedAt + 10 };
  useAppStore.setState({ snapshot: { ...initial.snapshot, processes: [parent, child] }, selectedPid: 8 });
  render(<ParentProcess process={child} processes={[parent, child]} locale="en-US" />);
  const processes = change === "exit" ? [parent] : change === "parent-exit" ? [child]
    : [parent, change === "restart" ? { ...child, startedAt: child.startedAt + 1 } : child];
  const selectedPid = change === "reselect" ? null : 8;
  useAppStore.setState({ snapshot: { ...initial.snapshot, processes }, selectedPid });
  fireEvent.click(screen.getByRole("button"));
  expect(useAppStore.getState().selectedPid).toBe(selectedPid);
});
