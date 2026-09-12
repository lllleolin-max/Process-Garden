import { describe, expect, it } from "vitest";
import { deriveDemoEvent, deriveProcessEvents } from "../data/events";
import type { ProcessSnapshot, SystemSnapshot } from "../types/system";

function process(pid: number, cpuPercent = 1, parentPid?: number): ProcessSnapshot {
  return { pid, parentPid, name: `process-${pid}`, cpuPercent, memoryBytes: 1024, startedAt: 1, status: "active" };
}

function snapshot(timestamp: number, processes: ProcessSnapshot[]): SystemSnapshot {
  return { timestamp, processes, cpuPercent: 1, memoryUsedBytes: 1, memoryTotalBytes: 2, processCount: processes.length, threadCount: 1, logicalCpuCount: 1, uptimeSeconds: 1 };
}

describe("native process delta events", () => {
  it("derives spawn, exit and CPU spike events", () => {
    const previous = snapshot(1, [process(1), process(2), process(3, 10)]);
    const next = snapshot(2, [process(1), process(3, 42), process(4, 2, 1)]);
    const events = deriveProcessEvents(previous, next);
    expect(events.map((event) => event.kind)).toEqual(expect.arrayContaining(["spawn", "exit", "spike"]));
    expect(events.find((event) => event.pid === 4)?.kind).toBe("spawn");
  });

  it("emits at most one deterministic demo event per four-second bucket", () => {
    const previous = snapshot(4_000, [process(1)]);
    expect(deriveDemoEvent(previous, snapshot(7_999, [process(1)]))).toBeNull();
    expect(deriveDemoEvent(previous, snapshot(8_000, [process(1)]))?.pid).toBe(1);
  });
});
