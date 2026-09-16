import { describe, expect, it } from "vitest";
import { deriveDemoEvent, deriveProcessEvents } from "../data/events";
import type { ProcessSnapshot, SystemSnapshot } from "../types/system";

function process(pid: number, cpuPercent = 1, parentPid?: number): ProcessSnapshot {
  return { pid, parentPid, name: `process-${pid}`, cpuPercent, memoryBytes: 1024, startedAt: 1, status: "active" };
}

function snapshot(timestamp: number, processes: ProcessSnapshot[]): SystemSnapshot {
  return { timestamp, processes, cpuPercent: 1, memoryUsedBytes: 1, memoryTotalBytes: 2, processCount: processes.length, threadCount: 1, logicalCpuCount: 1, uptimeSeconds: 1, power: { watts: null, source: "unavailable" } };
}

describe("native process delta events", () => {
  it("reports PID reuse as distinct birth and exit, never a CPU spike", () => {
    const old = { ...process(42, 1), name: "old-app", startedAt: 1_700_000_000 };
    const replacement = { ...process(42, 90), name: "new-app", startedAt: 1_700_000_001 };
    const events = deriveProcessEvents(snapshot(1, [old]), snapshot(2, [replacement]));
    expect(events.map(({ kind, processName }) => ({ kind, processName }))).toEqual([
      { kind: "birth", processName: "new-app" },
      { kind: "exit", processName: "old-app" }
    ]);
    expect(new Set(events.map((event) => event.id)).size).toBe(2);
  });

  it("preserves a lifetime when collectors change start-time units", () => {
    const old = { ...process(42, 1), startedAt: 1_700_000_000 };
    const same = { ...old, startedAt: old.startedAt * 1_000, cpuPercent: 40 };
    const events = deriveProcessEvents(snapshot(1, [old]), snapshot(2, [same]));
    expect(events.map((event) => event.kind)).toEqual(["spike"]);
  });

  it("retains parent association when a reused PID starts as a child", () => {
    const old = process(42);
    const child = { ...process(42, 50, 7), startedAt: 2 };
    const events = deriveProcessEvents(snapshot(1, [old, process(7)]), snapshot(2, [child, process(7)]));
    expect(events.map((event) => event.kind)).toEqual(["spawn", "exit"]);
  });

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
