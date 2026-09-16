import { expect, it } from "vitest";
import { gpuFixture } from "../tests/gpuFixture";
import { gpuHistory, parseGpuReading } from "./gpuReadings";

it("copies known fields only and keeps zero, unknown types and missing values distinct", () => {
  const raw = gpuFixture();
  raw.adapters[0].shared = { bytes: null, sampleCount: 1, invalidSamples: 1 };
  const result = parseGpuReading({ ...raw, processIds: [123] });
  expect(result).toEqual(raw); expect(result).not.toBe(raw);
  expect(result.adapters[0]).not.toBe(raw.adapters[0]);
  expect(result.adapters[0].engines[0].observedPercentSum).toBe(0);
  expect(result.adapters[0].engines[1].engineType).toBeNull();
});

it.each([undefined, null, {}, [], { ...gpuFixture(), rateBaseline: "true" },
  { ...gpuFixture(), adapters: Array(257).fill(gpuFixture().adapters[0]) },
  { ...gpuFixture(), adapters: [...gpuFixture().adapters, ...gpuFixture().adapters] },
  { ...gpuFixture(), engineCoverage: { available: false, unmappedInstances: 1, aggregateInstances: 0 } },
])("rejects malformed or unbounded response %#", value => { expect(() => parseGpuReading(value)).toThrow(); });

it("rejects duplicate engines, invalid identity and contradictory rate/coverage metadata", () => {
  const mutations = [
    (raw: ReturnType<typeof gpuFixture>) => { raw.adapters[0].engines.push(raw.adapters[0].engines[0]); },
    (raw: ReturnType<typeof gpuFixture>) => { raw.adapters[0].id = "luid_00000000_00000001_phys_4294967296"; },
    (raw: ReturnType<typeof gpuFixture>) => { raw.rateBaseline = true; },
    (raw: ReturnType<typeof gpuFixture>) => { raw.engineCoverage.unmappedInstances = 1; },
    (raw: ReturnType<typeof gpuFixture>) => { raw.engineCoverage.available = false; },
    (raw: ReturnType<typeof gpuFixture>) => { raw.adapters[0].engines[0].observedPercentSum = 101; },
    (raw: ReturnType<typeof gpuFixture>) => { raw.adapters[0].engines[0].invalidSamples = 1; },
    (raw: ReturnType<typeof gpuFixture>) => { raw.adapters[0].engines[0].sumOutOfRange = true; },
    (raw: ReturnType<typeof gpuFixture>) => { raw.adapters[0].engines[0].typeConflict = true; },
    (raw: ReturnType<typeof gpuFixture>) => { raw.adapters[0].dedicated.bytes = NaN; },
    (raw: ReturnType<typeof gpuFixture>) => { raw.adapters[0].dedicated.sampleCount = 2; },
    (raw: ReturnType<typeof gpuFixture>) => { raw.dedicatedCoverage.available = false; },
  ];
  for (const mutate of mutations) { const raw = gpuFixture(); mutate(raw); expect(() => parseGpuReading(raw)).toThrow(); }
});

it("breaks history at absent/unknown/baseline/type-changed observations without affecting memory", () => {
  const raw = gpuFixture(); const id = raw.adapters[0].id;
  const missing = gpuFixture(); missing.adapters[0].engines[0].observedPercentSum = null;
  expect(gpuHistory([raw, missing, raw], id, 0)).toEqual([0]);
  expect(gpuHistory([raw, { ...raw, adapters: [] }, raw], id, 0)).toEqual([0]);
  const baseline = gpuFixture(); baseline.rateBaseline = true;
  expect(gpuHistory([raw, baseline, raw], id, 0)).toEqual([0]);
  expect(gpuHistory([raw, baseline, raw], id, "dedicated")).toEqual([1024, 1024, 1024]);
  const different = gpuFixture(); different.adapters[0].engines[0].engineType = "Copy";
  expect(gpuHistory([different, raw], id, 0)).toEqual([0]);
  expect(gpuHistory(Array(80).fill(raw), id, 0)).toHaveLength(36);
});
