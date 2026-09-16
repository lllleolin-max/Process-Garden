import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ServicePanel } from "./ServicePanel";
import { useAppStore } from "../stores/appStore";
const read = vi.hoisted(() => vi.fn());
vi.mock("../hooks/useServiceReadings", () => ({ useServiceReadings: () => {
  useAppStore(s => s.snapshot.timestamp); return read();
} }));
const initial = useAppStore.getState();
afterEach(() => { cleanup(); useAppStore.setState(initial, true); read.mockReset(); });
const rows = Array.from({ length: 30 }, (_, i) => ({ name: `svc-${i}`, displayName: `Service ${i}`, state: 4, processId: i + 100, serviceType: 32 }));
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
