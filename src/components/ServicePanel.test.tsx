import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ServicePanel } from "./ServicePanel";
import { useAppStore } from "../stores/appStore";
import type { ServiceReading } from "../data/serviceReadings";
const read = vi.hoisted(() => vi.fn());
vi.mock("../hooks/useServiceReadings", () => ({ useServiceReadings: () => {
  useAppStore(s => s.snapshot.timestamp); return read();
} }));
const initial = useAppStore.getState();
afterEach(() => { cleanup(); useAppStore.setState(initial, true); read.mockReset(); });
const rows: ServiceReading[] = Array.from({ length: 30 }, (_, i) => ({ name: `svc-${i}`, displayName: `Service ${i}`, state: 4, processId: i + 100, serviceType: 32 }));
function setup() {
  useAppStore.setState({ locale: "en-US", displayMode: "windowed" });
  read.mockReturnValue({ status: "live", stale: false, rows });
  const view = render(<ServicePanel />);
  const details = view.container.querySelector("details")!;
  const toggle = (open: boolean) => { details.open = open; fireEvent(details, new Event("toggle")); };
  return { ...view, toggle };
}
it("mounts only while open/windowed and paginates all records with name/PID filtering", () => {
  const view = setup(); expect(read).not.toHaveBeenCalled();
  view.toggle(true); expect(screen.getAllByRole("listitem")).toHaveLength(12);
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText("Service 29")).toBeInTheDocument();
  expect(screen.getAllByRole("listitem")).toHaveLength(6);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "129" } });
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "absent" } });
  expect(screen.getByText("No matching services")).toBeInTheDocument();
  view.toggle(false); expect(screen.queryByRole("textbox")).toBeNull();
  view.toggle(true);
  act(() => useAppStore.setState({ displayMode: "wallpaper" }));
  expect(screen.queryByRole("textbox")).toBeNull();
});
it("retains rows/filter focus during stale updates and translates state/coverage", () => {
  const view = setup(); view.toggle(true);
  const filter = screen.getByRole("textbox"); filter.focus();
  const first = screen.getAllByRole("listitem")[0];
  read.mockReturnValue({ status: "error", stale: true, rows });
  act(() => useAppStore.setState(s => ({ snapshot: { ...s.snapshot, timestamp: s.snapshot.timestamp + 1 } })));
  expect(screen.getAllByRole("listitem")[0]).toBe(first);
  expect(filter).toHaveFocus();
  expect(screen.getByRole("list")).toHaveAccessibleDescription(/not live/);
  expect(screen.getByText(/Inaccessible services may be omitted/)).toBeInTheDocument();
  act(() => useAppStore.setState({ locale: "zh-CN" }));
  expect(screen.getByRole("status")).toHaveTextContent("非实时");
  expect(screen.getByText(/无权限的服务可能被省略/)).toBeInTheDocument();
});

it("filters service states and commits shrinking page bounds without jumping back", () => {
  const view = setup(); view.toggle(true);
  const publish = (next: typeof rows) => {
    read.mockReturnValue({ status: "live", stale: false, rows: next });
    act(() => useAppStore.setState(s => ({ snapshot: { ...s.snapshot, timestamp: s.snapshot.timestamp + 1 } })));
  };
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  publish(rows.slice(0, 2));
  expect(screen.getAllByRole("listitem")).toHaveLength(2);
  publish(rows);
  expect(screen.getByText("1 / 3")).toBeInTheDocument();
  fireEvent.change(screen.getByRole("combobox", { name: "Service state" }), { target: { value: "1" } });
  expect(screen.getByText("No matching services")).toBeInTheDocument();
  publish(rows.map((row, i) => i === 0 ? { ...row, state: 1, processId: null } : row));
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  expect(screen.getByText("Stopped · PID —")).toBeInTheDocument();
  fireEvent.change(screen.getByRole("combobox", { name: "Service state" }), { target: { value: "all" } });
  expect(screen.getAllByRole("listitem")).toHaveLength(12);
});
