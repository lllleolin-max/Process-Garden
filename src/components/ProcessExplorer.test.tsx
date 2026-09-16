import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import i18n from "../i18n/config";
import { useAppStore } from "../stores/appStore";
import { TopBar } from "./TopBar";

const initial = useAppStore.getState();
beforeEach(async () => {
  await i18n.changeLanguage("en-US");
  const processes = Array.from({ length: 120 }, (_, i) => ({ ...initial.snapshot.processes[0], pid: i + 1, name: `app-${i + 1}`, cpuPercent: i, memoryBytes: i * 1000, executablePath: `C:\\Apps\\app-${i + 1}.exe` }));
  useAppStore.setState({ ...initial, locale: "en-US", selectedPid: null, themeMenuOpen: false, snapshot: { ...initial.snapshot, processes, processCount: 140 } });
});
afterEach(() => { cleanup(); useAppStore.setState(initial); localStorage.clear(); });

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
