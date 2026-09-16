import { isObservedMetric, isObservedPercent } from "./processTable";

export interface DiskReading {
  id: string;
  readBytesPerSecond: number | null;
  writeBytesPerSecond: number | null;
  activePercent: number | null;
}
export type DiskField = Exclude<keyof DiskReading, "id">;
export const diskFields: DiskField[] = ["readBytesPerSecond", "writeBytesPerSecond", "activePercent"];

export function parseDiskReadings(input: unknown): DiskReading[] {
  if (!Array.isArray(input) || input.length > 1024) throw new Error("invalid disk response");
  const ids = new Set<string>();
  return input.map(row => {
    if (!row || typeof row.id !== "string" || !row.id.length || row.id.length > 1024 || ids.has(row.id) || row.id === "_Total") throw new Error("invalid disk identity");
    ids.add(row.id);
    for (const field of diskFields) {
      if (row[field] !== null && !(field === "activePercent" ? isObservedPercent : isObservedMetric)(row[field])) throw new Error("invalid disk value");
    }
    return { id: row.id, readBytesPerSecond: row.readBytesPerSecond, writeBytesPerSecond: row.writeBytesPerSecond, activePercent: row.activePercent };
  });
}

export function diskHistory(history: DiskReading[][], id: string, field: DiskField): number[] {
  const values: number[] = [];
  for (let index = history.length - 1; index >= 0 && values.length < 36; index--) {
    const value = history[index].find(row => row.id === id)?.[field];
    if (!(field === "activePercent" ? isObservedPercent : isObservedMetric)(value)) break;
    values.push(value);
  }
  return values.reverse();
}
