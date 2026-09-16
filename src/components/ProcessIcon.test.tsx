import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { processIconKey, useProcessIconStore } from "../stores/processIconStore";
import type { ProcessSnapshot } from "../types/system";
import { ProcessIcon } from "./ProcessIcon";

const process: ProcessSnapshot = { pid: 1, name: "codex.exe", startedAt: 1, cpuPercent: 0, memoryBytes: 1, status: "active" };
const key = processIconKey(process);
afterEach(() => { cleanup(); useProcessIconStore.setState({ icons: {} }); });

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
  expect(screen.queryByText("CO")).not.toBeInTheDocument();
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
