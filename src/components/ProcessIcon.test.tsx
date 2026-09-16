import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { processIconKey, useProcessIconStore } from "../stores/processIconStore";
import type { ProcessSnapshot } from "../types/system";
import { ProcessIcon } from "./ProcessIcon";
import { useAppStore } from "../stores/appStore";

const process: ProcessSnapshot = { pid: 1, name: "codex.exe", startedAt: 1, cpuPercent: 0, memoryBytes: 1, status: "active" };
const key = processIconKey(process);
const initial = useAppStore.getState();
afterEach(() => { cleanup(); useProcessIconStore.setState({ icons: {} }); useAppStore.setState(initial, true); });

it("replaces an undecodable image with initials and recovers when new icon data arrives", () => {
  useProcessIconStore.setState({ icons: { [key]: "data:image/png;base64,broken" } });
  const { container } = render(<ProcessIcon process={process} />);
  const image = container.querySelector("img")!;
  fireEvent.error(image);
  expect(container.querySelector("img")).toBeNull();
  expect(screen.getByText("CO")).toBeInTheDocument();
  expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  act(() => useProcessIconStore.getState().mergeIcons([{ key, dataUrl: "data:image/png;base64,recovered" }]));
  expect(container.querySelector("img")).toHaveAttribute("src", "data:image/png;base64,recovered");
  expect(container.firstElementChild).not.toHaveClass("process-icon-ready");
  expect(screen.getByText("CO")).toBeInTheDocument();
  fireEvent.load(container.querySelector("img")!);
  expect(container.firstElementChild).toHaveClass("process-icon-ready");
});

it("retains the placeholder until the current source loads and keeps loaded icons stable on sampling", () => {
  useProcessIconStore.setState({ icons: { [key]: "first" } });
  const view = render(<ProcessIcon process={process} />);
  const icon = view.container.firstElementChild!;
  const first = view.container.querySelector("img")!;
  expect(icon).not.toHaveClass("process-icon-ready");
  fireEvent.load(first);
  expect(icon).toHaveClass("process-icon-ready");
  view.rerender(<ProcessIcon process={{ ...process, cpuPercent: 80 }} />);
  expect(view.container.querySelector("img")).toBe(first);
  expect(icon).toHaveClass("process-icon-ready");
  act(() => useProcessIconStore.getState().mergeIcons([{ key, dataUrl: "second" }]));
  expect(icon).not.toHaveClass("process-icon-ready");
  fireEvent.load(view.container.querySelector("img")!);
  expect(icon).toHaveClass("process-icon-ready");
});

it("retains the fallback through unrelated icon updates without retrying a known failed source", () => {
  useProcessIconStore.setState({ icons: { [key]: "data:image/png;base64,broken" } });
  const view = render(<ProcessIcon process={process} />);
  fireEvent.error(view.container.querySelector("img")!);
  act(() => useProcessIconStore.getState().mergeIcons([{ key: "other-app", dataUrl: "other" }]));
  view.rerender(<ProcessIcon process={{ ...process }} />);
  expect(view.container.querySelector("img")).toBeNull();
  expect(screen.getByText("CO")).toBeInTheDocument();
});

it.each(["paused", "reducedMotion"] as const)("disables icon transitions while %s without hiding the loaded icon", setting => {
  useAppStore.setState({ paused: false, reducedMotion: false });
  useProcessIconStore.setState({ icons: { [key]: "loaded" } });
  const view = render(<ProcessIcon process={process} />);
  const icon = view.container.firstElementChild!;
  fireEvent.load(view.container.querySelector("img")!);
  act(() => useAppStore.setState({ [setting]: true }));
  expect(icon).toHaveClass("process-icon-ready", "process-icon-static");
  act(() => useAppStore.setState({ [setting]: false }));
  expect(icon).toHaveClass("process-icon-ready");
  expect(icon).not.toHaveClass("process-icon-static");
});

it("does not use the previous application's loaded state for a new source", () => {
  const other = { ...process, name: "other.exe", executablePath: "C:/other.exe" };
  useProcessIconStore.setState({ icons: { [key]: "first", [processIconKey(other)]: "other" } });
  const view = render(<ProcessIcon process={process} />);
  fireEvent.load(view.container.querySelector("img")!);
  view.rerender(<ProcessIcon process={other} />);
  expect(view.container.firstElementChild).not.toHaveClass("process-icon-ready");
  expect(screen.getByText("OT")).toBeInTheDocument();
  expect(view.container.querySelector("img")).toHaveAttribute("src", "other");
});
