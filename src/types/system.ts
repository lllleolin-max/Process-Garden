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
  /** Logical processor order from the current sampler, not physical-core IDs.
   * Missing array means unsupported; null means an unavailable observation. */
  cpuCorePercents?: (number | null)[];
  memoryUsedBytes: number;
  memoryTotalBytes: number;
  processCount: number;
  threadCount?: number;
  logicalCpuCount: number;
  uptimeSeconds: number;
  power: PowerSnapshot;
  /** Per-interface counters; null means failed/unsupported, [] means no interfaces.
   * Optional for old collectors/demo. Never sum virtual/physical rows as Internet traffic. */
  network?: NetworkInterfaceRates[] | null;
  processes: ProcessSnapshot[];
}

export interface NetworkInterfaceRates {
  id: string;
  name: string;
  interfaceType: number;
  operational: boolean;
  receivedBytesPerSecond: number | null;
  sentBytesPerSecond: number | null;
}

export type EventKind = "birth" | "exit" | "spawn" | "network" | "spike" | "io";

/** Historical charts retain measurements, not repeated executable metadata. */
export type ProcessObservation = Pick<ProcessSnapshot, "pid" | "startedAt" | "cpuPercent" | "memoryBytes" | "threadCount">;
export type SystemObservation = Omit<SystemSnapshot, "processes" | "network"> & {
  processes: ProcessObservation[];
  network?: Omit<NetworkInterfaceRates, "name">[] | null;
};

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
