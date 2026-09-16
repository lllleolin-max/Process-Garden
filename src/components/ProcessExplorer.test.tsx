import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import i18n from "../i18n/config";
import { useAppStore } from "../stores/appStore";
import { TopBar } from "./TopBar";

const initial = useAppStore.getState();
beforeEach(async () => {
  await i18n.changeLanguage("en-US");
  const processes = Array.from({ length: 120 }, (_, i) => ({ ...initial.snapshot.processes[0], pid: i + 1, name: `app-${i + 1}`, cpuPercent: i / 120 * 100, memoryBytes: i * 1000, executablePath: `C:\\Apps\\app-${i + 1}.exe` }));
  useAppStore.setState({ ...initial, locale: "en-US", selectedPid: null, themeMenuOpen: false, snapshot: { ...initial.snapshot, processes, processCount: 140 } });
});
afterEach(() => { cleanup(); useAppStore.setState(initial); localStorage.clear(); });

it("marks out-of-domain percentages and fractional counts unavailable in the table", () => {
  const snapshot = useAppStore.getState().snapshot;
  const process = { ...snapshot.processes[0], cpuPercent: 101, threadCount: 0.5 };
  useAppStore.setState({ snapshot: { ...snapshot, processes: [process], processCount: 1 } });
  render(<TopBar />);
  fireEvent.click(screen.getByRole("button", { name: "Processes" }));
  const cells = within(within(screen.getByRole("table")).getAllByRole("row")[1]).getAllByRole("cell");
  expect(cells[2]).toHaveTextContent(/^—$/);
  expect(cells[4]).toHaveTextContent(/^—$/);
});

it("opens a bounded process table, sorts and filters, then locates a process in the inspector", () => {
  render(<TopBar />);
  fireEvent.click(screen.getByRole("button", { name: "Processes" }));
  expect(screen.getByRole("textbox", { name: "Filter processes" })).toHaveFocus();
  expect(screen.getByRole("status")).toHaveTextContent("20 reported processes");
  const table = screen.getByRole("table");
  expect(within(table).getAllByRole("row")).toHaveLength(51);
  expect(within(table).getAllByRole("button", { name: /^Inspect/ })[0]).toHaveTextContent("app-120");
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
  fireEvent.click(within(table).getByRole("button", { name: "PID" }));
  expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
  expect(within(table).getAllByRole("button", { name: /^Inspect/ })[0]).toHaveTextContent("app-1");
  fireEvent.change(screen.getByRole("textbox", { name: "Filter processes" }), { target: { value: "app-113.exe" } });
  expect(within(table).getAllByRole("row")).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Inspect app-113, PID 113" }));
  expect(useAppStore.getState().selectedPid).toBe(113);
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("clamps a shrinking result set and shows an honest empty state", () => {
  render(<TopBar />);
  fireEvent.click(screen.getByRole("button", { name: "Processes" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  act(() => useAppStore.setState({ snapshot: { ...useAppStore.getState().snapshot, processes: [], processCount: 0 } }));
  expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
  expect(screen.getByText("No process records are available.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  fireEvent.change(screen.getByRole("textbox", { name: "Filter processes" }), { target: { value: "missing" } });
  expect(screen.getByText("No processes match this filter.")).toBeInTheDocument();
});

it("accepts more than 500 received records without losing the last process", () => {
  const seed = useAppStore.getState().snapshot.processes[0];
  const processes = Array.from({ length: 1500 }, (_, index) => ({ ...seed, pid: index + 1, name: `large-${index + 1}`, executablePath: `C:\\Large\\large-${index + 1}.exe` }));
  useAppStore.setState({ snapshot: { ...useAppStore.getState().snapshot, processes, processCount: processes.length } });
  render(<TopBar />);
  fireEvent.click(screen.getByRole("button", { name: "Processes" }));
  expect(screen.queryByRole("status")).toBeNull();
  expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(51);
  expect(screen.getByText("Page 1 of 30")).toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox", { name: "Filter processes" }), { target: { value: "large-1500.exe" } });
  fireEvent.click(screen.getByRole("button", { name: "Inspect large-1500, PID 1500" }));
  expect(useAppStore.getState().selectedPid).toBe(1500);
});

it.each([NaN, Infinity, -1])("renders invalid metrics %s as unavailable and recovers to observed zero", value => {
  const before = useAppStore.getState().snapshot;
  const process = { ...before.processes[0], cpuPercent: value, memoryBytes: value, threadCount: value };
  useAppStore.setState({ snapshot: { ...before, processes: [process], processCount: 1 } });
  render(<TopBar />);
  fireEvent.click(screen.getByRole("button", { name: "Processes" }));
  const row = within(screen.getByRole("table")).getAllByRole("row")[1];
  const cells = within(row).getAllByRole("cell");
  for (const index of [2, 3, 4]) expect(cells[index]).toHaveTextContent(/^—$/);
  act(() => useAppStore.setState({ snapshot: { ...before, processes: [{ ...process, cpuPercent: 0, memoryBytes: 0, threadCount: 0 }], processCount: 1 } }));
  // The existing row remains mounted; its metric cells update in place.
  expect(within(screen.getByRole("table")).getAllByRole("row")[1]).toBe(row);
  expect(cells[2]).toHaveTextContent(/^0%$/);
  expect(cells[3]).toHaveTextContent(/^0 MB$/);
  expect(cells[4]).toHaveTextContent(/^0$/);
});

it("does not jump back to an obsolete page when process counts recover", () => {
  const full = useAppStore.getState().snapshot;
  render(<TopBar />);
  fireEvent.click(screen.getByRole("button", { name: "Processes" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();
  act(() => useAppStore.setState({ snapshot: { ...full, processes: full.processes.slice(0, 20), processCount: 20 } }));
  expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
  act(() => useAppStore.setState({ snapshot: full }));
  expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
});

it("preserves the search input and caret through telemetry updates", () => {
  render(<TopBar />);
  fireEvent.click(screen.getByRole("button", { name: "Processes" }));
  const input = screen.getByRole("textbox", { name: "Filter processes" }) as HTMLInputElement;
  fireEvent.change(input, { target: { value: "app-1" } });
  input.setSelectionRange(3, 3);
  const current = useAppStore.getState().snapshot;
  act(() => useAppStore.setState({ snapshot: { ...current, timestamp: current.timestamp + 1000, processes: current.processes.map(process => ({ ...process, cpuPercent: process.cpuPercent / 2 })) } }));
  expect(screen.getByRole("textbox", { name: "Filter processes" })).toBe(input);
  expect(input).toHaveFocus();
  expect(input).toHaveValue("app-1");
  expect(input.selectionStart).toBe(3);
  expect(input.selectionEnd).toBe(3);
});

it.each(["exit", "reuse", "source"])("rejects a stale row when %s happens just before its click", change => {
  useAppStore.setState({ collector: "demo" });
  render(<TopBar />);
  fireEvent.click(screen.getByRole("button", { name: "Processes" }));
  const button = screen.getByRole("button", { name: "Inspect app-120, PID 120" });
  // Capture-phase update reproduces a newer store snapshot before React's
  // rendered row handler runs, without relying on timer scheduling.
  button.addEventListener("click", () => {
    if (change === "source") {
      // Even an identical PID/start-time tuple is not the same observation
      // when the collector changes before the rendered handler executes.
      useAppStore.setState({ collector: "native" });
      return;
    }
    const snapshot = useAppStore.getState().snapshot;
    const processes = change === "exit"
      ? snapshot.processes.filter(process => process.pid !== 120)
      : snapshot.processes.map(process => process.pid === 120 ? { ...process, startedAt: process.startedAt + 1 } : process);
    useAppStore.setState({ snapshot: { ...snapshot, processes, processCount: processes.length } });
  }, { capture: true, once: true });
  fireEvent.click(button);
  expect(useAppStore.getState().selectedPid).toBeNull();
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});
