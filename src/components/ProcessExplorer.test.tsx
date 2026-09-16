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

it.each(["exit", "rank", "reuse"])("returns focus to the list, never another process, after focused row %s", reason => {
  render(<TopBar />);
  fireEvent.click(screen.getByRole("button", { name: "Processes" }));
  const button = screen.getByRole("button", { name: "Inspect app-120, PID 120" });
  act(() => button.focus());
  const snapshot = useAppStore.getState().snapshot;
  const processes = reason === "exit" ? snapshot.processes.filter(p => p.pid !== 120)
    : snapshot.processes.map(p => p.pid !== 120 ? p : reason === "rank" ? { ...p, cpuPercent: 0 } : { ...p, startedAt: p.startedAt + 1 });
  act(() => useAppStore.setState({ snapshot: { ...snapshot, processes, processCount: processes.length } }));
  expect(button.isConnected).toBe(false);
  const list = screen.getByRole("table").parentElement!;
  expect(list).toHaveFocus();
  fireEvent.keyDown(list, { key: "Enter" });
  expect(useAppStore.getState().selectedPid).toBeNull();
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});

it.each(["Previous", "Next"])("retains %s focus when live page counts collapse and guards unavailable activation", label => {
  render(<TopBar />);
  fireEvent.click(screen.getByRole("button", { name: "Processes" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  const button = screen.getByRole("button", { name: label });
  act(() => button.focus());
  const snapshot = useAppStore.getState().snapshot;
  act(() => useAppStore.setState({ snapshot: { ...snapshot, processes: snapshot.processes.slice(0, 1), processCount: 1 } }));
  expect(button).toHaveFocus();
  expect(button).toHaveAttribute("aria-disabled", "true");
  expect(button).not.toBeDisabled();
  fireEvent.click(button);
  expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
  act(() => useAppStore.setState({ snapshot }));
  expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
  expect(button).toHaveFocus();
  expect(useAppStore.getState().selectedPid).toBeNull();
});

it("does not steal filter focus when the previously focused process disappears", () => {
  render(<TopBar />);
  fireEvent.click(screen.getByRole("button", { name: "Processes" }));
  act(() => screen.getByRole("button", { name: "Inspect app-120, PID 120" }).focus());
  const filter = screen.getByRole("textbox", { name: "Filter processes" });
  act(() => filter.focus());
  fireEvent.change(filter, { target: { value: "app-1.exe" } });
  expect(filter).toHaveFocus();
});

it("holds row position and keyboard focus while readings change, then releases to live sorting", () => {
  const snapshot = useAppStore.getState().snapshot;
  const processes = snapshot.processes.slice(0, 3);
  useAppStore.setState({ snapshot: { ...snapshot, processes, processCount: 3 } });
  render(<TopBar />);
  fireEvent.click(screen.getByRole("button", { name: "Processes" }));
  const order = () => within(screen.getByRole("table")).getAllByRole("button", { name: /^Inspect/ });
  const before = order();
  fireEvent.click(screen.getByRole("button", { name: "Keep row order" }));
  act(() => before[0].focus());
  act(() => useAppStore.setState({ snapshot: { ...snapshot, processes: processes.map(p => ({ ...p, cpuPercent: p.pid === 1 ? 99 : 0 })), processCount: 3 } }));
  expect(order()).toEqual(before);
  expect(before[0]).toHaveFocus();
  expect(within(before[2].closest("tr")!).getAllByRole("cell")[2]).toHaveTextContent("99%");
  expect(screen.getByRole("columnheader", { name: "CPU" })).toHaveAttribute("aria-sort", "none");
  expect(useAppStore.getState().paused).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Keep row order" }));
  expect(order()[0]).toBe(before[2]);
  expect(screen.getByRole("columnheader", { name: /CPU/ })).toHaveAttribute("aria-sort", "descending");
});

it("appends new lifetimes and forgets removed ones without resetting retained rows", () => {
  const snapshot = useAppStore.getState().snapshot;
  const [a, b, c] = snapshot.processes.slice(0, 3);
  const update = (processes: typeof snapshot.processes) => act(() => useAppStore.setState({ snapshot: { ...snapshot, processes, processCount: processes.length } }));
  update([a, b]);
  render(<TopBar />);
  fireEvent.click(screen.getByRole("button", { name: "Processes" }));
  fireEvent.click(screen.getByRole("button", { name: "Keep row order" }));
  const names = () => within(screen.getByRole("table")).getAllByRole("button", { name: /^Inspect/ }).map(node => node.getAttribute("aria-label"));
  update([a, b, { ...c, cpuPercent: 99 }]);
  expect(names()).toEqual(["Inspect app-2, PID 2", "Inspect app-1, PID 1", "Inspect app-3, PID 3"]);
  update([a, { ...b, startedAt: b.startedAt + 1 }, c]);
  expect(names()).toEqual(["Inspect app-1, PID 1", "Inspect app-3, PID 3", "Inspect app-2, PID 2"]);
  update([]);
  update([a, b, c]);
  expect(names()).toEqual(["Inspect app-3, PID 3", "Inspect app-2, PID 2", "Inspect app-1, PID 1"]);
});

it.each(["filter", "sort", "source"])("releases held row order after %s changes", change => {
  render(<TopBar />);
  fireEvent.click(screen.getByRole("button", { name: "Processes" }));
  fireEvent.click(screen.getByRole("button", { name: "Keep row order" }));
  expect(screen.getByRole("button", { name: "Keep row order" })).toHaveAttribute("aria-pressed", "true");
  if (change === "filter") fireEvent.change(screen.getByRole("textbox", { name: "Filter processes" }), { target: { value: "app-1" } });
  else if (change === "sort") fireEvent.click(screen.getByRole("button", { name: "PID" }));
  else act(() => useAppStore.setState({ collector: useAppStore.getState().collector === "demo" ? "native" : "demo" }));
  expect(screen.getByRole("button", { name: "Keep row order" })).toHaveAttribute("aria-pressed", "false");
});

it("keeps the current page stable across metric rank changes and still bounds mounted rows", () => {
  render(<TopBar />);
  fireEvent.click(screen.getByRole("button", { name: "Processes" }));
  fireEvent.click(screen.getByRole("button", { name: "Keep row order" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  const before = within(screen.getByRole("table")).getAllByRole("row");
  const snapshot = useAppStore.getState().snapshot;
  act(() => useAppStore.setState({ snapshot: { ...snapshot, processes: snapshot.processes.map(p => ({ ...p, cpuPercent: 100 - p.cpuPercent })) } }));
  expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
  expect(within(screen.getByRole("table")).getAllByRole("row")).toEqual(before);
  expect(before).toHaveLength(51);
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByRole("button", { name: "Inspect app-1, PID 1" })).toBeInTheDocument();
});

it("marks out-of-domain percentages and fractional counts unavailable in the table", () => {
  const snapshot = useAppStore.getState().snapshot;
  const process = { ...snapshot.processes[0], cpuPercent: 101, threadCount: 0.5 };
  useAppStore.setState({ snapshot: { ...snapshot, processes: [process], processCount: 1 } });
  render(<TopBar />);
  fireEvent.click(screen.getByRole("button", { name: "Processes" }));
  const cells = within(within(screen.getByRole("table")).getAllByRole("row")[1]).getAllByRole("cell");
  expect(cells[2].querySelector('[aria-hidden="true"]')).toHaveTextContent(/^—$/);
  expect(cells[4]).toHaveTextContent(/^—$/);
});

it("opens a bounded process table, sorts and filters, then locates a process in the inspector", () => {
  useAppStore.setState({ collector: "native" });
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

it("labels displayed demo totals honestly even when native mode is requested", () => {
  useAppStore.setState({ collector: "demo", demoMode: false });
  render(<TopBar />);
  fireEvent.click(screen.getByRole("button", { name: "Processes" }));
  expect(screen.getByText(/140 simulated total, not measured on this computer/)).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("20 entries in the simulated total have no demo record.");
  expect(screen.queryByText(/reported by system/)).toBeNull();
  act(() => useAppStore.setState({ locale: "zh-CN" }));
  expect(screen.getByText(/模拟总数 140，非本机实测/)).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("模拟总数中有 20 项未提供演示记录。");
  act(() => useAppStore.setState({ collector: "native", locale: "en-US" }));
  expect(screen.getByText(/140 reported by system/)).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("20 reported processes");
});

it("clamps a shrinking result set and shows an honest empty state", () => {
  render(<TopBar />);
  fireEvent.click(screen.getByRole("button", { name: "Processes" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  act(() => useAppStore.setState({ snapshot: { ...useAppStore.getState().snapshot, processes: [], processCount: 0 } }));
  expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
  expect(screen.getByText("No process records are available.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Next" })).toHaveAttribute("aria-disabled", "true");
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
  for (const index of [2, 3]) expect(cells[index].querySelector('[aria-hidden="true"]')).toHaveTextContent(/^—$/);
  expect(cells[4]).toHaveTextContent(/^—$/);
  act(() => useAppStore.setState({ snapshot: { ...before, processes: [{ ...process, cpuPercent: 0, memoryBytes: 0, threadCount: 0 }], processCount: 1 } }));
  // The existing row remains mounted; its metric cells update in place.
  expect(within(screen.getByRole("table")).getAllByRole("row")[1]).toBe(row);
  expect(cells[2].querySelector('[aria-hidden="true"]')).toHaveTextContent(/^0%$/);
  expect(cells[3].querySelector('[aria-hidden="true"]')).toHaveTextContent(/^0 MB$/);
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
