import type { NetworkInterfaceRates, SystemObservation } from "../types/system";
import { isObservedMetric } from "./processTable";

export function networkHistory(history: SystemObservation[], adapter: NetworkInterfaceRates,
  field: "receivedBytesPerSecond" | "sentBytesPerSecond", limit = 36): number[] {
  const values: number[] = [];
  for (let index = history.length - 1; index >= 0 && values.length < limit; index--) {
    const row = history[index].network?.find(item => item.id === adapter.id);
    if (!row || !row.operational || row.interfaceType !== adapter.interfaceType || !isObservedMetric(row[field])) break;
    values.push(row[field]);
  }
  return values.reverse();
}
