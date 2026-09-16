import type { SystemObservation, SystemSnapshot } from "../types/system";

export function toObservation(snapshot: SystemSnapshot): SystemObservation {
  return {
    ...snapshot,
    power: { ...snapshot.power },
    processes: snapshot.processes.map(({ pid, startedAt, cpuPercent, memoryBytes, threadCount }) => ({
      pid, startedAt, cpuPercent, memoryBytes,
      ...(threadCount === undefined ? {} : { threadCount }),
    })),
  };
}
