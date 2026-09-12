import type { ProcessSnapshot } from "../types/system";

/** Hysteresis avoids repeated births/deaths when two applications trade CPU rank. */
export function selectPopulation(processes: ProcessSnapshot[], previous: number[], limit: number, selectedPid: number | null) {
  const incumbents = new Set(previous);
  const score = (p: ProcessSnapshot) => (p.cpuPercent + p.memoryBytes / 100_000_000) * (incumbents.has(p.pid) ? 1.18 : 1) + (incumbents.has(p.pid) ? 2 : 0);
  const ranked = [...processes].sort((a, b) => Number(b.pid === selectedPid) - Number(a.pid === selectedPid) || score(b) - score(a) || a.pid - b.pid).slice(0, limit);
  const order = new Map(previous.map((pid, index) => [pid, index]));
  return ranked.sort((a, b) => (order.get(a.pid) ?? previous.length) - (order.get(b.pid) ?? previous.length));
}
