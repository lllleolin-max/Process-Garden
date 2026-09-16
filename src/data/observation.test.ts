import { expect, it } from "vitest";
import { makeDemoSnapshot } from "./demo";
import { toObservation } from "./observation";
import { processHistory } from "./processHistory";
import { threadHistory } from "./threadHistory";

it("retains measurements and identity without executable metadata or mutable aliases", () => {
  const source = makeDemoSnapshot(0);
  source.processes[0] = { ...source.processes[0], threadCount: 0, command: "private command", executablePath: "private path" };
  source.processes[1] = { ...source.processes[1], threadCount: undefined };
  const history = toObservation(source);
  expect(history.processes).toHaveLength(source.processes.length);
  expect(history.processes[0]).toEqual({ pid: source.processes[0].pid, startedAt: source.processes[0].startedAt,
    cpuPercent: source.processes[0].cpuPercent, memoryBytes: source.processes[0].memoryBytes, threadCount: 0 });
  expect(history.processes[1]).not.toHaveProperty("threadCount");
  const memory = history.processes[0].memoryBytes;
  const watts = history.power.watts;
  source.processes[0].memoryBytes += 100;
  source.power.watts = 999;
  expect(history.processes[0].memoryBytes).toBe(memory);
  expect(history.power.watts).toBe(watts);
});

it("copies logical CPU observations without filling unavailable values or retaining aliases", () => {
  const source = { ...makeDemoSnapshot(0), cpuCorePercents: [0, 100, null] };
  const observation = toObservation(source);
  expect(observation.cpuCorePercents).toEqual([0, 100, null]);
  source.cpuCorePercents[0] = 90;
  expect(observation.cpuCorePercents).toEqual([0, 100, null]);
  expect(toObservation(makeDemoSnapshot(0))).not.toHaveProperty("cpuCorePercents");
});

it("does not retain unrecognized payload fields and preserves missing system thread counts", () => {
  const source = { ...makeDemoSnapshot(0), threadCount: undefined, diagnosticPayload: { metadata: "not chart data" } };
  const observation = toObservation(source);
  expect(observation).not.toHaveProperty("diagnosticPayload");
  expect(observation).not.toHaveProperty("threadCount");
  const zero = toObservation({ ...source, threadCount: 0 });
  expect(threadHistory([zero, observation])).toEqual([]);
  expect(threadHistory([observation, zero])).toEqual([0]);
});

it("keeps compact chart tails isolated across process gaps and reused PIDs", () => {
  const source = makeDemoSnapshot(0);
  const current = source.processes[0];
  const old = toObservation({ ...source, processes: [{ ...current, startedAt: current.startedAt - 100, cpuPercent: 99 }] });
  const next = toObservation({ ...source, processes: [current] });
  const missing = toObservation({ ...source, processes: [] });
  expect(processHistory([old, next], current)).toEqual(next.processes);
  expect(processHistory([next, missing, next], current)).toEqual(next.processes);
  expect(processHistory([next, missing], current)).toEqual([]);
  const milliseconds = toObservation({ ...source, processes: [{ ...current, startedAt: current.startedAt * 1000 }] });
  expect(processHistory([milliseconds, next], current)).toEqual([...milliseconds.processes, ...next.processes]);
});
