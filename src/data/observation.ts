import type { SystemObservation, SystemSnapshot } from "../types/system";

export function toObservation(snapshot: SystemSnapshot): SystemObservation {
  return {
    timestamp: snapshot.timestamp,
    cpuPercent: snapshot.cpuPercent,
    memoryUsedBytes: snapshot.memoryUsedBytes,
    memoryTotalBytes: snapshot.memoryTotalBytes,
    processCount: snapshot.processCount,
    ...(snapshot.threadCount === undefined ? {} : { threadCount: snapshot.threadCount }),
    logicalCpuCount: snapshot.logicalCpuCount,
    uptimeSeconds: snapshot.uptimeSeconds,
    power: { ...snapshot.power },
    processes: snapshot.processes.map(({ pid, startedAt, cpuPercent, memoryBytes, threadCount }) => ({
      pid, startedAt, cpuPercent, memoryBytes,
      ...(threadCount === undefined ? {} : { threadCount }),
    })),
  };
}
