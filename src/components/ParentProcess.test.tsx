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
