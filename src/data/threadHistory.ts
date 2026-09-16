import type { SystemObservation } from "../types/system";
import { isObservedCount } from "./processTable";

/** Missing enumeration breaks the series; never draw a false zero or bridge it. */
export function threadHistory(history: SystemObservation[], limit = 36): number[] {
  const values: number[] = [];
  for (let index = history.length - 1; index >= 0 && values.length < limit; index--) {
    const value = history[index].threadCount;
    if (!isObservedCount(value)) break;
    values.push(value);
  }
  return values.reverse();
}
