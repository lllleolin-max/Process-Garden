import type { ProcessEvent, SystemSnapshot } from "../types/system";
import { processIdentity } from "../animation/processIdentity";

export function deriveProcessEvents(previous: SystemSnapshot, next: SystemSnapshot): ProcessEvent[] {
  const before = new Map(previous.processes.map((process) => [processIdentity(process), process]));
  const after = new Set(next.processes.map(processIdentity));
  const observedPids = new Set([...previous.processes, ...next.processes].map((process) => process.pid));
  const events: ProcessEvent[] = [];
  const makeId = (kind: string, pid: number) => `${kind}-${pid}-${next.timestamp}`;

  for (const process of next.processes) {
    const old = before.get(processIdentity(process));
    if (!old) {
      const spawned = process.parentPid !== undefined && observedPids.has(process.parentPid);
      events.push({
        id: makeId(spawned ? "spawn" : "birth", process.pid),
        timestamp: next.timestamp,
        kind: spawned ? "spawn" : "birth",
        processName: process.name,
        pid: process.pid,
        processKey: processIdentity(process),
        messageKey: spawned ? "events.spawned" : "events.born"
      });
    } else if (old.cpuPercent < 20 && process.cpuPercent >= 35) {
      events.push({ id: makeId("spike", process.pid), timestamp: next.timestamp, kind: "spike", processName: process.name, pid: process.pid, processKey: processIdentity(process), messageKey: "events.spiked", value: process.cpuPercent });
    }
  }

  for (const process of previous.processes) {
    if (!after.has(processIdentity(process))) {
      events.push({ id: makeId("exit", process.pid), timestamp: next.timestamp, kind: "exit", processName: process.name, pid: process.pid, processKey: processIdentity(process), messageKey: "events.exited" });
    }
  }

  return events.slice(0, 24);
}

const demoKinds = ["birth", "spawn", "network", "io", "spike"] as const;
const demoMessageKeys = { birth: "events.born", spawn: "events.spawned", network: "events.connected", io: "events.io", spike: "events.spiked" } as const;

export function deriveDemoEvent(previous: SystemSnapshot, next: SystemSnapshot): ProcessEvent | null {
  const previousBucket = Math.floor(previous.timestamp / 4_000);
  const nextBucket = Math.floor(next.timestamp / 4_000);
  if (previousBucket === nextBucket || next.processes.length === 0) return null;
  const kind = demoKinds[nextBucket % demoKinds.length];
  const process = next.processes[nextBucket % next.processes.length];
  return { id: `demo-${kind}-${process.pid}-${nextBucket}`, timestamp: next.timestamp, kind, processName: process.name, pid: process.pid, processKey: processIdentity(process), messageKey: demoMessageKeys[kind], value: kind === "spike" ? process.cpuPercent : undefined };
}
