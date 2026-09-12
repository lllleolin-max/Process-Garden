import type { ProcessEvent, ProcessSnapshot, SystemSnapshot } from "../types/system";

const GIB = 1024 ** 3;
const MIB = 1024 ** 2;
const DEMO_NOW = Math.floor(Date.now() / 1000);

const processSeeds: Array<Omit<ProcessSnapshot, "cpuPercent" | "memoryBytes" | "status"> & { cpu: number; memory: number; phase: number }> = [
  { pid: 5521, name: "chrome", parentPid: 1120, cpu: 11.8, memory: 824, phase: 0.2, startedAt: 1_754_000_000, threadCount: 42, connections: 24, executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" },
  { pid: 2458, name: "code", parentPid: 1120, cpu: 7.1, memory: 736, phase: 1.1, startedAt: 1_754_001_300, threadCount: 36, connections: 12, executablePath: "C:\\Users\\you\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe" },
  { pid: 7618, name: "node", parentPid: 2458, cpu: 5.7, memory: 342, phase: 2.3, startedAt: 1_754_001_880, threadCount: 18, connections: 8 },
  { pid: 3325, name: "spotify", parentPid: 1120, cpu: 2.4, memory: 280, phase: 3.2, startedAt: 1_754_000_700, threadCount: 24, connections: 16 },
  { pid: 5432, name: "postgres", parentPid: 1120, cpu: 8.2, memory: 678, phase: 4.1, startedAt: 1_753_998_000, threadCount: 28, connections: 21 },
  { pid: 1954, name: "docker", parentPid: 1120, cpu: 4.1, memory: 382, phase: 5.1, startedAt: 1_753_996_500, threadCount: 32, connections: 14 },
  { pid: 9233, name: "python", parentPid: 2458, cpu: 6.4, memory: 330, phase: 0.8, startedAt: 1_754_002_100, threadCount: 12, connections: 4 },
  { pid: 4100, name: "explorer", parentPid: 808, cpu: 1.5, memory: 198, phase: 2.8, startedAt: 1_753_990_000, threadCount: 46, connections: 2 },
  { pid: 808, name: "system", cpu: 3.2, memory: 256, phase: 3.8, startedAt: 1_753_980_000, threadCount: 120, connections: 0 },
  { pid: 8431, name: "vite", parentPid: 7618, cpu: 4.8, memory: 168, phase: 5.8, startedAt: 1_754_002_240, threadCount: 10, connections: 3 },
  { pid: 6250, name: "terminal", parentPid: 4100, cpu: 1.2, memory: 112, phase: 4.8, startedAt: 1_754_001_000, threadCount: 14, connections: 1 },
  { pid: 2220, name: "discord", parentPid: 1120, cpu: 3.6, memory: 420, phase: 1.8, startedAt: 1_753_999_000, threadCount: 30, connections: 18 },
  { pid: 9902, name: "rust-analyzer", parentPid: 2458, cpu: 9.5, memory: 544, phase: 2.5, startedAt: 1_754_002_360, threadCount: 16, connections: 2 },
  { pid: 7840, name: "webview2", parentPid: 5521, cpu: 2.1, memory: 144, phase: 0.4, startedAt: 1_754_001_600, threadCount: 12, connections: 6 },
  { pid: 12010, name: "codex", parentPid: 6250, cpu: 12.6, memory: 612, phase: 1.4, startedAt: DEMO_NOW - 840, threadCount: 48, connections: 9, executablePath: "C:\\Tools\\Codex\\codex.exe", command: "codex app-server" },
  { pid: 12011, name: "agent-task", parentPid: 12010, cpu: 4.6, memory: 178, phase: 2.1, startedAt: DEMO_NOW - 28, threadCount: 10, connections: 3, command: "task implement organism registry" },
  { pid: 12020, name: "claude", parentPid: 6250, cpu: 8.4, memory: 524, phase: 3.4, startedAt: DEMO_NOW - 1_500, threadCount: 39, connections: 7, executablePath: "C:\\Tools\\Claude\\claude.exe", command: "claude agent" },
  { pid: 12021, name: "tool-runner", parentPid: 12020, cpu: 3.2, memory: 126, phase: 4.2, startedAt: DEMO_NOW - 130, threadCount: 8, connections: 2, command: "tool task render preview" },
  { pid: 12030, name: "trae", parentPid: 6250, cpu: 5.8, memory: 438, phase: 5.4, startedAt: DEMO_NOW - 2_800, threadCount: 31, connections: 6, executablePath: "C:\\Tools\\Trae\\trae.exe", command: "trae agent" },
  { pid: 12031, name: "workflow-runner", parentPid: 12030, cpu: 2.7, memory: 112, phase: 0.9, startedAt: DEMO_NOW - 420, threadCount: 7, connections: 1, command: "task finalize delivery" }
];

export function makeDemoSnapshot(tick: number): SystemSnapshot {
  const processes = processSeeds.map((seed, index): ProcessSnapshot => {
    const wave = Math.sin(tick / 4 + seed.phase) * 0.35 + Math.sin(tick / 11 + index) * 0.14;
    const cpuPercent = Math.max(0.1, seed.cpu * (1 + wave));
    const memoryBytes = Math.round(seed.memory * MIB * (1 + Math.sin(tick / 15 + seed.phase) * 0.045));
    return {
      ...seed,
      cpuPercent,
      memoryBytes,
      status: cpuPercent > 12 ? "stressed" : cpuPercent < 1.2 ? "idle" : "active",
      networkActivity: Math.max(0, Math.sin(tick / 3 + seed.phase) * 0.5 + 0.5)
    };
  });
  const cpuPercent = 22 + Math.sin(tick / 4) * 5 + Math.sin(tick / 13) * 3;
  const memoryUsedBytes = (8.5 + Math.sin(tick / 20) * 0.3) * GIB;
  return {
    timestamp: Date.now(),
    cpuPercent,
    memoryUsedBytes,
    memoryTotalBytes: 32 * GIB,
    processCount: 247 + Math.round(Math.sin(tick / 8) * 4),
    threadCount: 1024 + Math.round(Math.sin(tick / 6) * 24),
    logicalCpuCount: 12,
    uptimeSeconds: 7 * 86400 + 14 * 3600 + 22 * 60 + tick,
    power: { watts: 54 + Math.sin(tick / 4) * 9 + Math.sin(tick / 13) * 5, source: "demo" },
    processes
  };
}

export const demoEvents: ProcessEvent[] = [
  { id: "evt-1", timestamp: Date.now() - 2_000, kind: "spawn", processName: "chrome", pid: 5521, messageKey: "events.spawned" },
  { id: "evt-2", timestamp: Date.now() - 5_000, kind: "network", processName: "node", pid: 7618, messageKey: "events.connected" },
  { id: "evt-3", timestamp: Date.now() - 8_000, kind: "spike", processName: "rust-analyzer", pid: 9902, messageKey: "events.spiked" },
  { id: "evt-4", timestamp: Date.now() - 12_000, kind: "birth", processName: "python", pid: 9233, messageKey: "events.born" },
  { id: "evt-5", timestamp: Date.now() - 18_000, kind: "io", processName: "docker", pid: 1954, messageKey: "events.io" },
  { id: "evt-6", timestamp: Date.now() - 25_000, kind: "exit", processName: "spotify-helper", pid: 3341, messageKey: "events.exited" }
];
