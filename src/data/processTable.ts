import { processIdentity } from "../animation/processIdentity";
import type { ProcessSnapshot } from "../types/system";

export type ProcessSort = "name" | "pid" | "cpuPercent" | "memoryBytes" | "threadCount";
export function isObservedMetric(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
export function queryProcesses(processes: ProcessSnapshot[], query: string, sort: ProcessSort, ascending: boolean, locale: string) {
  const needle = query.trim().toLocaleLowerCase(locale);
  const collator = new Intl.Collator(locale, { numeric: true });
  return processes.filter(process => !needle || [process.name, String(process.pid), process.executablePath ?? ""].some(value => value.toLocaleLowerCase(locale).includes(needle)))
    .sort((left, right) => {
      const a = left[sort], b = right[sort];
      // Missing readings stay last in either direction; they are not zero usage.
      const missingA = a === undefined || (typeof a === "number" && !isObservedMetric(a));
      const missingB = b === undefined || (typeof b === "number" && !isObservedMetric(b));
      if (missingA !== missingB) return missingA ? 1 : -1;
      const comparison = missingA ? 0 : sort === "name" ? collator.compare(String(a), String(b)) : Number(a) - Number(b);
      return (ascending ? comparison : -comparison) || left.pid - right.pid || processIdentity(left).localeCompare(processIdentity(right));
    });
}
