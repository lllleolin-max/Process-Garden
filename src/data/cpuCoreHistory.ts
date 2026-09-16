import type { SystemObservation } from "../types/system";

/** Sampler-index history, only while the observed logical topology is unchanged. */
export function cpuCoreHistory(history: SystemObservation[], core: number, limit = 36): number[] {
  const count = history.at(-1)?.logicalCpuCount;
  if (!Number.isInteger(core) || core < 0 || count === undefined || core >= count) return [];
  const values: number[] = [];
  for (let index = history.length - 1; index >= 0 && values.length < limit; index--) {
    const sample = history[index];
    if (sample.logicalCpuCount !== count || sample.cpuCorePercents?.length !== count) break;
    const value = sample.cpuCorePercents[core];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) break;
    values.push(value);
  }
  return values.reverse();
}
