import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EndProcessDialog } from "./EndProcessDialog";
import { useAppStore } from "../stores/appStore";
import { coreDropTarget, insideCore } from "../processes/termination";
import { makeDemoSnapshot } from "../data/demo";
import i18n from "../i18n/config";

const native = vi.hoisted(() => vi.fn());
vi.mock("../processes/termination", async (original) => ({ ...await original<typeof import("../processes/termination")>(), terminateNativeProcess: native }));
const initial = useAppStore.getState();
beforeEach(async () => {
  await i18n.changeLanguage("en-US");
  useAppStore.setState({ ...initial, snapshot: makeDemoSnapshot(0), collector: "demo", demoMode: true, paused: false, endedDemoProcesses: {} });
  native.mockReset();
});
afterEach(() => { cleanup(); useAppStore.setState(initial); });

function show(collector: "demo" | "native" = "demo") {
  const process = useAppStore.getState().snapshot.processes[0];
  useAppStore.setState({ collector, demoMode: collector === "demo" });
  const onClose = vi.fn();
  render(<div data-testid="outside"><button>Outside</button><EndProcessDialog target={{ process, collector, demoMode: collector === "demo" }} onClose={onClose} /></div>);
  return { process, onClose };
}

describe("ending processes", () => {
  it("keeps cancellation focused and inerts the background without terminating anything", () => {
    const { onClose } = show();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(screen.getByTestId("outside").parentElement).toHaveAttribute("inert");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(native).not.toHaveBeenCalled();
    expect(useAppStore.getState().endedDemoProcesses).toEqual({});
  });
  it("ends a demo identity without invoking native code or respawning on the next sample", async () => {
    const { process, onClose } = show();
    fireEvent.click(screen.getByRole("button", { name: "End process" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(native).not.toHaveBeenCalled();
    expect(useAppStore.getState().snapshot.processes.some((item) => item.pid === process.pid)).toBe(false);
    act(() => useAppStore.getState().ingestSnapshot({ ...makeDemoSnapshot(1), timestamp: Date.now() + 1000 }, "demo"));
    expect(useAppStore.getState().snapshot.processes.some((item) => item.pid === process.pid)).toBe(false);
  });
  it("refuses a stale target or changed data mode", async () => {
    show("native");
    act(() => useAppStore.setState({ collector: "demo", demoMode: true }));
    fireEvent.click(screen.getByRole("button", { name: "End process" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("data mode switched");
    expect(native).not.toHaveBeenCalled();
  });
  it("retains the organism after native failure and prevents duplicate submissions", async () => {
    const { process } = show("native");
    let reject!: (reason: string) => void;
    native.mockImplementation(() => new Promise((_resolve, fail) => { reject = fail; }));
    fireEvent.click(screen.getByRole("button", { name: "End process" }));
    expect(screen.getByRole("button", { name: "Ending…" })).toBeDisabled();
    await act(async () => reject("denied"));
    expect(screen.getByRole("alert")).toHaveTextContent("access was denied");
    expect(native).toHaveBeenCalledOnce();
    expect(useAppStore.getState().snapshot.processes.some((item) => item.pid === process.pid)).toBe(true);
  });
  it("removes only the confirmed process after native success", async () => {
    const { process, onClose } = show("native");
    const before = useAppStore.getState().snapshot.processes.length;
    native.mockResolvedValue(undefined);
    fireEvent.click(screen.getByRole("button", { name: "End process" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(native).toHaveBeenCalledWith(process);
    expect(useAppStore.getState().snapshot.processes).toHaveLength(before - 1);
  });
  it("uses the same center as the scene and excludes outside drops", () => {
    const core = coreDropTarget(1000, 600, false);
    expect(insideCore({ x: 500, y: 282 }, core)).toBe(true);
    expect(insideCore({ x: 500 + core.radius + 1, y: 282 }, core)).toBe(false);
  });
});
