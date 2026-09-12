import { act, cleanup, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { processIconKey, useProcessIconStore } from "../stores/processIconStore";
import type { ProcessSnapshot } from "../types/system";
import { useProcessIcons } from "./useProcessIcons";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

function process(name: string): ProcessSnapshot {
  return { pid: 1, name, executablePath: `C:\\Apps\\${name}.exe`, cpuPercent: 1, memoryBytes: 1, startedAt: 1, status: "active" };
}

beforeEach(() => {
  invoke.mockReset();
  useProcessIconStore.setState({ icons: {} });
  Object.defineProperty(window, "__TAURI_INTERNALS__", { configurable: true, value: {} });
});
afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
});

describe("native icon caching", () => {
  it("retains a pending native result across fallback writes, rerenders, and unmount", async () => {
    const item = process("slow-icon");
    const key = processIconKey(item);
    let resolve!: (results: Array<{ key: string; dataUrl: string }>) => void;
    invoke.mockReturnValue(new Promise((done) => { resolve = done; }));
    const hook = renderHook(({ processes }) => useProcessIcons(processes), { initialProps: { processes: [item] }, wrapper: StrictMode });
    await act(() => vi.dynamicImportSettled());
    expect(invoke).toHaveBeenCalledTimes(1);
    hook.rerender({ processes: [{ ...item }] });
    hook.unmount();
    await act(async () => { resolve([{ key, dataUrl: "data:image/png;base64,native" }]); });
    expect(useProcessIconStore.getState().icons[key]).toBe("data:image/png;base64,native");
  });

  it("retries a failed request on the next process sample", async () => {
    const item = process("retry-icon");
    const key = processIconKey(item);
    invoke.mockRejectedValueOnce(new Error("temporary failure"));
    const hook = renderHook(({ processes }) => useProcessIcons(processes), { initialProps: { processes: [item] } });
    await act(() => vi.dynamicImportSettled());
    invoke.mockResolvedValue([{ key, dataUrl: "data:image/png;base64,recovered" }]);
    hook.rerender({ processes: [{ ...item }] });
    await act(() => vi.dynamicImportSettled());
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(useProcessIconStore.getState().icons[key]).toBe("data:image/png;base64,recovered");
  });

  it("deduplicates executable requests and does not broadcast unchanged icons", async () => {
    const item = process("shared-icon");
    const key = processIconKey(item);
    invoke.mockResolvedValue([{ key, dataUrl: null }]);
    renderHook(() => useProcessIcons([item, { ...item, pid: 2 }]));
    await act(() => vi.dynamicImportSettled());
    expect(invoke.mock.calls[0][1].requests).toHaveLength(1);
    const listener = vi.fn();
    const unsubscribe = useProcessIconStore.subscribe(listener);
    useProcessIconStore.getState().mergeIcons([{ key, dataUrl: useProcessIconStore.getState().icons[key] }]);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});
