import { expect, it } from "vitest";
import { useAppStore } from "../stores/appStore";
import { processHistory } from "./processHistory";
import type { ProcessSnapshot } from "../types/system";

const base = useAppStore.getState().snapshot;
const current: ProcessSnapshot = { pid: 10, name: "app", startedAt: 1_800_000_000, cpuPercent: 12, memoryBytes: 100, status: "active" };
const snapshot = (processes: ProcessSnapshot[]) => ({ ...base, processes });

it("does not join resource histories across reused PIDs", () => {
  const old = { ...current, startedAt: current.startedAt - 100, cpuPercent: 95 };
  expect(processHistory([snapshot([old]), snapshot([current])], current)).toEqual([current]);
});

it("does not invent zero usage or bridge an unobserved gap", () => {
  expect(processHistory([snapshot([current]), snapshot([]), snapshot([current])], current)).toEqual([current]);
  expect(processHistory([snapshot([current]), snapshot([])], current)).toEqual([]);
});

it("keeps chronological observations across equivalent timestamp units", () => {
  const first = { ...current, startedAt: current.startedAt * 1000, cpuPercent: 2 };
  expect(processHistory([snapshot([first]), snapshot([current])], current)).toEqual([first, current]);
});
