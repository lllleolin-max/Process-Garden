import { parseGpuReading } from "../data/gpuReadings";
import { createNativeReadings } from "./useNativeReadings";

export const useGpuReadings = createNativeReadings("sample_gpu", parseGpuReading, reading => {
  if (reading.rateBaseline) return "baseline";
  if (!reading.adapters.length) return [reading.engineCoverage, reading.dedicatedCoverage, reading.sharedCoverage]
    .some(coverage => coverage.unmappedInstances) ? "error" : "empty";
  return reading.adapters.some(adapter => adapter.dedicated.bytes !== null || adapter.shared.bytes !== null
    || adapter.engines.some(engine => engine.observedPercentSum !== null)) ? "live" : "error";
});
