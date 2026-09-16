import { diskFields, parseDiskReadings, type DiskReading } from "../data/diskReadings";
import { createNativeReadings, type NativeStatus } from "./useNativeReadings";

export interface DiskState { status: NativeStatus; rows: DiskReading[]; history: DiskReading[][]; session: string; stale: boolean }
const useDiskProvider = createNativeReadings("sample_disks", parseDiskReadings,
  rows => !rows.length ? "empty" : rows.some(row => diskFields.some(field => row[field] !== null)) ? "live" : "baseline");

/** Mounted only while the disk panel is expanded and windowed. */
export function useDiskReadings(): DiskState {
  const { reading, ...state } = useDiskProvider();
  return { ...state, rows: reading ?? [] };
}
