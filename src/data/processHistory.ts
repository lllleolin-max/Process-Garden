import { processIdentity } from "../animation/processIdentity";
import type { ProcessSnapshot, SystemObservation, ProcessObservation } from "../types/system";

/** Only chart the uninterrupted, observed tail of this process lifetime. */
export function processHistory(history: SystemObservation[], process: ProcessSnapshot, limit = Infinity) {
  const key = processIdentity(process);
  const result: ProcessObservation[] = [];
  for (let index = history.length - 1; index >= 0 && result.length < limit; index--) {
    const sample = history[index].processes.find(item => item.pid === process.pid && processIdentity(item) === key);
    if (!sample) break;
    result.push(sample);
  }
  return result.reverse();
}
