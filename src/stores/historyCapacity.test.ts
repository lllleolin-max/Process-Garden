import { afterEach, expect, it } from "vitest";
import { useAppStore } from "./appStore";
import { processHistory } from "../data/processHistory";
import { toObservation } from "../data/observation";

const initial = useAppStore.getState();
afterEach(() => useAppStore.setState(initial, true));

it("bounds full-table history without truncating processes or changing old observations", () => {
  useAppStore.setState({ ...initial, paused: false }, true);
  const seed = initial.snapshot.processes[0];
  const processes = Array.from({ length: 1500 }, (_, index) => ({
    ...seed, pid: index + 1, name: `capacity-${index}`, cpuPercent: 1,
    executablePath: `C:\\Applications\\CapacityFixture\\app-${index}.exe`,
  }));
  let firstRetained: ReturnType<typeof useAppStore.getState>["snapshot"] | undefined;
  const started = performance.now();
  for (let index = 1; index <= 150; index++) {
    const snapshot = {
      ...initial.snapshot, timestamp: initial.snapshot.timestamp + index * 1000,
      processCount: processes.length,
      processes: processes.map(process => ({ ...process, memoryBytes: index * 1024 })),
    };
    if (index === 31) firstRetained = snapshot;
    useAppStore.getState().ingestSnapshot(snapshot, "native");
  }
  const ingestionMs = performance.now() - started;
  const state = useAppStore.getState();
  expect(state.history).toHaveLength(120);
  expect(state.history[0]).toEqual(toObservation(firstRetained!));
  expect(state.history.at(-1)).toEqual(toObservation(state.snapshot));
  expect(state.snapshot.processes[1499].executablePath).toBe(processes[1499].executablePath);
  expect(state.history[0].processes[1499]).not.toHaveProperty("executablePath");
  expect(state.history.every(snapshot => snapshot.processes.length === 1500)).toBe(true);
  expect(state.history[0].processes[1499].memoryBytes).toBe(31 * 1024);
  const selectedHistory = processHistory(state.history, state.snapshot.processes[1499], 42);
  expect(selectedHistory).toHaveLength(42);
  expect(selectedHistory[0].memoryBytes).toBe(109 * 1024);
  expect(selectedHistory.at(-1)?.memoryBytes).toBe(150 * 1024);
  const jsonBytes = new TextEncoder().encode(JSON.stringify(state.history)).byteLength;
  // Diagnostic only: serialized bytes are NOT retained JS heap size, and elapsed
  // time is not a CI threshold or a rendered-frame-rate measurement.
  console.info({ historySamples: state.history.length, retainedProcessRecords: 120 * 1500, jsonBytes, ingestionMs });
});
