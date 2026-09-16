import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ChildProcesses } from "./ChildProcesses";
import { useAppStore } from "../stores/appStore";

const initial = useAppStore.getState();
const parent = { ...initial.snapshot.processes[0], pid: 100, name: "parent", startedAt: 1800000000 };
const child = { ...parent, pid: 101, name: "child", parentPid: 100, startedAt: 1800000010 };
afterEach(() => { cleanup(); useAppStore.setState(initial, true); });
function setup(processes = [parent, child]) {
  useAppStore.setState({ selectedPid: parent.pid, collector: "native", snapshot: { ...initial.snapshot, processes } });
  return render(<aside className="inspector" tabIndex={-1}><ChildProcesses process={parent} processes={processes} locale="en-US" /></aside>);
}
it("navigates to a confirmed child and retains Inspector focus", () => {
  setup();
  fireEvent.click(screen.getByRole("button", { name: "Inspect child, PID 101" }));
  expect(useAppStore.getState().selectedPid).toBe(101);
  expect(screen.getByRole("complementary")).toHaveFocus();
});
it("paginates all confirmed children without rendering the full list", () => {
  const children = Array.from({ length: 19 }, (_, i) => ({ ...child, pid: 101 + i, name: `child-${i}` }));
  setup([parent, ...children]);
  expect(screen.getAllByRole("button", { name: /^Inspect/ })).toHaveLength(8);
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getAllByRole("button", { name: /^Inspect/ })).toHaveLength(3);
  fireEvent.click(screen.getByRole("button", { name: "Inspect child-18, PID 119" }));
  expect(useAppStore.getState().selectedPid).toBe(119);
});
it("does not invent relationships for older, unknown, dead or unrelated children", () => {
  setup([parent, { ...child, startedAt: parent.startedAt - 1 }, { ...child, pid: 102, startedAt: 0 },
    { ...child, pid: 103, status: "dead" }, { ...child, pid: 104, parentPid: 99 }]);
  expect(screen.queryByRole("button")).toBeNull();
  expect(screen.getByText("No confirmed children in this snapshot")).toBeInTheDocument();
});
it.each(["source", "exit", "reuse", "parent-reuse", "reparent", "deselect"])("rejects stale child navigation after %s", change => {
  setup();
  const button = screen.getByRole("button", { name: "Inspect child, PID 101" });
  button.addEventListener("click", () => {
    const processes = change === "exit" ? [parent] : [
      change === "parent-reuse" ? { ...parent, startedAt: parent.startedAt + 1 } : parent,
      change === "reuse" ? { ...child, startedAt: child.startedAt + 1 }
        : change === "reparent" ? { ...child, parentPid: 99 } : child];
    useAppStore.setState({ snapshot: { ...initial.snapshot, processes },
      collector: change === "source" ? "demo" : "native", selectedPid: change === "deselect" ? null : parent.pid });
  }, { capture: true, once: true });
  fireEvent.click(button);
  expect(useAppStore.getState().selectedPid).toBe(change === "deselect" ? null : parent.pid);
});
it("clamps a shrunken list and keeps the clamp when children return", () => {
  const children = Array.from({ length: 19 }, (_, i) => ({ ...child, pid: 101 + i }));
  const view = setup([parent, ...children]);
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  view.rerender(<ChildProcesses process={parent} processes={[parent, child]} locale="zh-CN" />);
  expect(within(screen.getByRole("region", { name: "子进程" })).getAllByRole("button")).toHaveLength(1);
  act(() => view.rerender(<ChildProcesses process={parent} processes={[parent, ...children]} locale="zh-CN" />));
  expect(screen.getByRole("button", { name: "上一页" })).toBeDisabled();
});

it("preserves page, row identity and focus on telemetry but resets across sources", () => {
  const children = Array.from({ length: 19 }, (_, i) => ({ ...child, pid: 101 + i, name: `child-${i}` }));
  useAppStore.setState({ collector: "native" });
  const view = render(<ChildProcesses process={parent} processes={[parent, ...children]} locale="en-US" />);
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  const button = screen.getByRole("button", { name: "Inspect child-8, PID 109" });
  button.focus();
  view.rerender(<ChildProcesses process={{ ...parent, cpuPercent: 50 }} processes={[parent, ...children.map(item => ({ ...item, memoryBytes: 1234 }))]} locale="en-US" />);
  expect(screen.getByRole("button", { name: "Inspect child-8, PID 109" })).toBe(button);
  expect(button).toHaveFocus();
  expect(screen.getByText("2 / 3")).toBeInTheDocument();
  act(() => useAppStore.setState({ collector: "demo" }));
  expect(screen.getByText("1 / 3")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByRole("button", { name: "Inspect child-8, PID 109" })).not.toBe(button);
});
