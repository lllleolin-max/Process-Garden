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

export interface SystemSnapshot {
  timestamp: number;
  cpuPercent: number;
  memoryUsedBytes: number;
  memoryTotalBytes: number;
  processCount: number;
  threadCount: number;
  logicalCpuCount: number;
  uptimeSeconds: number;
  processes: ProcessSnapshot[];
}

export type EventKind = "birth" | "exit" | "spawn" | "network" | "spike" | "io";

export interface ProcessEvent {
  id: string;
  timestamp: number;
  kind: EventKind;
  processName: string;
  pid: number;
  messageKey: string;
  value?: number;
}
