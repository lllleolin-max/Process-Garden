import { processIdentity } from "../animation/processIdentity";
import type { ProcessSnapshot, SystemSnapshot } from "../types/system";

/** Only chart the uninterrupted, observed tail of this process lifetime. */
export function processHistory(history: SystemSnapshot[], process: ProcessSnapshot) {
  const key = processIdentity(process);
  const result: ProcessSnapshot[] = [];
  for (let index = history.length - 1; index >= 0; index--) {
    const sample = history[index].processes.find(item => processIdentity(item) === key);
    if (!sample) break;
    result.push(sample);
  }
  return result.reverse();
}
