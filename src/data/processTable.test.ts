import { expect, it } from "vitest";
import { queryProcesses } from "./processTable";
import type { ProcessSnapshot } from "../types/system";

const processes: ProcessSnapshot[] = [
  { pid: 20, name: "Beta", executablePath: "C:\\Tools\\worker.exe", cpuPercent: 5, memoryBytes: 20, startedAt: 10, status: "active" },
  { pid: 10, name: "Alpha", cpuPercent: 5, memoryBytes: 10, startedAt: 20, status: "active", threadCount: 2 },
  { pid: 30, name: "Gamma", cpuPercent: 8, memoryBytes: 30, startedAt: 30, status: "active", threadCount: 8 }
];
it("filters names, PIDs and paths without mutating the snapshot", () => {
  expect(queryProcesses(processes, " WORKER ", "pid", true, "en-US").map(p => p.pid)).toEqual([20]);
  expect(queryProcesses(processes, "10", "pid", true, "en-US").map(p => p.pid)).toEqual([10]);
  expect(queryProcesses(processes, "ALPHA", "pid", true, "en-US").map(p => p.pid)).toEqual([10]);
  expect(processes.map(p => p.pid)).toEqual([20, 10, 30]);
});
it("uses deterministic ties and keeps unknown readings last in both directions", () => {
  expect(queryProcesses(processes, "", "cpuPercent", false, "en-US").map(p => p.pid)).toEqual([30, 10, 20]);
  expect(queryProcesses(processes, "", "threadCount", false, "en-US").map(p => p.pid)).toEqual([30, 10, 20]);
  expect(queryProcesses(processes, "", "threadCount", true, "en-US").map(p => p.pid)).toEqual([10, 30, 20]);
});

it("does not cap a large received snapshot during filtering or sorting", () => {
  const large = Array.from({ length: 5000 }, (_, index) => ({ ...processes[0], pid: index + 1, name: `worker-${index + 1}` }));
  expect(queryProcesses(large, "", "name", true, "en-US")).toHaveLength(5000);
  expect(queryProcesses(large, "worker-5000", "name", true, "en-US").map(p => p.pid)).toEqual([5000]);
});
