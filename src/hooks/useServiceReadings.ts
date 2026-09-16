import { parseServiceReadings } from "../data/serviceReadings";
import { createNativeReadings } from "./useNativeReadings";

// Service metadata is not a time series: keep only the current observation.
// Five seconds between completed requests; mount only while the view is open.
const useProvider = createNativeReadings("sample_services", parseServiceReadings,
  rows => rows.length ? "live" : "empty", { intervalMs: 5000, historyLimit: 1 });

export function useServiceReadings() {
  const { reading, ...state } = useProvider();
  return { ...state, rows: reading ?? [] };
}
