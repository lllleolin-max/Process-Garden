import { expect, it } from "vitest";
import { makeDemoSnapshot } from "./demo";
import { toObservation } from "./observation";

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
