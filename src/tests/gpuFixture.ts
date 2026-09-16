import type { GpuReading } from "../data/gpuReadings";

export function gpuFixture(): GpuReading {
  const coverage = () => ({ available: true, unmappedInstances: 0, aggregateInstances: 0 });
  return { rateBaseline: false, engineCoverage: coverage(), dedicatedCoverage: coverage(), sharedCoverage: coverage(),
    adapters: [{ id: "luid_00000000_00000001_phys_0", device: null, engines: [0, 1].map(id => ({ id,
      engineType: id ? null : "3D", typeConflict: false, sampleCount: 1, invalidSamples: 0,
      duplicateSamples: 0, sumOutOfRange: false, observedPercentSum: id ? 20 : 0 })),
    dedicated: { bytes: 1024, sampleCount: 1, invalidSamples: 0 }, shared: { bytes: 0, sampleCount: 1, invalidSamples: 0 } }] };
}
