export type ProcessStatus = "born" | "active" | "idle" | "stressed" | "dying" | "dead";

export interface ProcessSnapshot {
  pid: number;
  parentPid?: number;
  name: string;
  cpuPercent: number;
  memoryBytes: number;
  startedAt: number;
  status: ProcessStatus;
  networkActivity?: number;
  threadCount?: number;
  connections?: number;
  executablePath?: string;
  command?: string;
}

export interface PowerSnapshot {
  watts: number | null;
  /** Battery discharge is system draw; Intel is a driver-reported package domain. Demo is never native telemetry. */
  source: "battery" | "intel" | "unavailable" | "demo";
}

export interface SystemSnapshot {
  timestamp: number;
  cpuPercent: number;
  memoryUsedBytes: number;
  memoryTotalBytes: number;
  processCount: number;
  threadCount: number;
  logicalCpuCount: number;
  uptimeSeconds: number;
  power: PowerSnapshot;
  processes: ProcessSnapshot[];
}

export type EventKind = "birth" | "exit" | "spawn" | "network" | "spike" | "io";

export interface ProcessEvent {
  /** PID + normalized start time; absent on legacy events with unknown lifetime. */
  processKey?: string;
  id: string;
  timestamp: number;
  kind: EventKind;
  processName: string;
  pid: number;
  messageKey: string;
  value?: number;
}
