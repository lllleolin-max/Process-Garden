import { isObservedMetric, isObservedPercent } from "./processTable";

export interface CounterCoverage { available: boolean; unmappedInstances: number; aggregateInstances: number }
export interface GpuMemory { bytes: number | null; sampleCount: number; invalidSamples: number }
export interface GpuEngine {
  id: number; engineType: string | null; typeConflict: boolean; sampleCount: number;
  invalidSamples: number; duplicateSamples: number; sumOutOfRange: boolean; observedPercentSum: number | null;
}
export interface GpuDevice { name: string; software: boolean }
export interface GpuAdapter { id: string; device: GpuDevice | null; engines: GpuEngine[]; dedicated: GpuMemory; shared: GpuMemory }
export interface GpuReading {
  rateBaseline: boolean; adapters: GpuAdapter[];
  engineCoverage: CounterCoverage; dedicatedCoverage: CounterCoverage; sharedCoverage: CounterCoverage;
}
type RecordValue = Record<string, unknown>;
const fail = (): never => { throw new Error("invalid GPU response"); };
const object = (value: unknown): RecordValue => value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : fail();
const bool = (value: unknown): boolean => typeof value === "boolean" ? value : fail();
const count = (value: unknown, max = 65536): number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= max ? value : fail();
const metric = (value: unknown, percent = false): number | null => value === null ? null : typeof value === "number" && (percent ? isObservedPercent(value) : isObservedMetric(value)) ? value : fail();
function coverage(value: unknown): CounterCoverage {
  const row = object(value);
  const result = { available: bool(row.available), unmappedInstances: count(row.unmappedInstances), aggregateInstances: count(row.aggregateInstances) };
  if (!result.available && (result.unmappedInstances || result.aggregateInstances)) fail();
  return result;
}
function memory(value: unknown, available: boolean): GpuMemory {
  const row = object(value);
  const result = { bytes: metric(row.bytes), sampleCount: count(row.sampleCount), invalidSamples: count(row.invalidSamples) };
  if (result.invalidSamples > result.sampleCount || (!available && result.sampleCount)
    || (result.bytes !== null && (!available || result.sampleCount !== 1 || result.invalidSamples))) fail();
  return result;
}

function device(value: unknown): GpuDevice | null {
  // Older native builds omit this optional enrichment; readings stay usable.
  if (value === undefined || value === null) return null;
  const row = object(value);
  if (typeof row.name !== "string" || !row.name.trim() || row.name.length > 127
    || /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/.test(row.name)) return fail();
  return { name: row.name, software: bool(row.software) };
}

/** Explicit projection: native metadata/PIDs not in this contract are not retained. */
export function parseGpuReading(value: unknown): GpuReading {
  const input = object(value);
  const rateBaseline = bool(input.rateBaseline);
  const engineCoverage = coverage(input.engineCoverage);
  const dedicatedCoverage = coverage(input.dedicatedCoverage);
  const sharedCoverage = coverage(input.sharedCoverage);
  if (!Array.isArray(input.adapters) || input.adapters.length > 256) return fail();
  const ids = new Set<string>();
  let engineCount = 0;
  const adapters = input.adapters.map(value => {
    const row = object(value);
    if (typeof row.id !== "string" || !/^luid_[0-9a-f]{8}_[0-9a-f]{8}_phys_\d{1,10}$/.test(row.id) || ids.has(row.id)) return fail();
    count(Number(row.id.split("_phys_")[1]), 0xffffffff);
    ids.add(row.id);
    if (!Array.isArray(row.engines) || row.engines.length > 4096 || (!engineCoverage.available && row.engines.length)) return fail();
    engineCount += row.engines.length;
    if (engineCount > 16384) return fail();
    const enginesSeen = new Set<number>();
    const engines = row.engines.map(value => {
      const item = object(value);
      const id = count(item.id, 0xffffffff);
      if (enginesSeen.has(id)) return fail();
      enginesSeen.add(id);
      const engineType = item.engineType;
      if (engineType !== null && (typeof engineType !== "string" || engineType.length > 1024 || !/^[a-zA-Z0-9_]+$/.test(engineType))) return fail();
      const engine: GpuEngine = { id, engineType, typeConflict: bool(item.typeConflict), sampleCount: count(item.sampleCount),
        invalidSamples: count(item.invalidSamples), duplicateSamples: count(item.duplicateSamples),
        sumOutOfRange: bool(item.sumOutOfRange), observedPercentSum: metric(item.observedPercentSum, true) };
      if (!engine.sampleCount || engine.invalidSamples > engine.sampleCount || engine.duplicateSamples >= engine.sampleCount
        || (engine.typeConflict && engineType !== null)
        || (engine.observedPercentSum !== null && (rateBaseline || engine.typeConflict || engine.sumOutOfRange
          || engine.invalidSamples || engine.duplicateSamples || engineCoverage.unmappedInstances))) return fail();
      return engine;
    });
    return { id: row.id, device: device(row.device), engines, dedicated: memory(row.dedicated, dedicatedCoverage.available), shared: memory(row.shared, sharedCoverage.available) };
  });
  return { rateBaseline, adapters, engineCoverage, dedicatedCoverage, sharedCoverage };
}

export type GpuField = "dedicated" | "shared" | number;
export function gpuHistory(history: GpuReading[], id: string, field: GpuField): number[] {
  const values: number[] = [];
  const kind = typeof field === "number" ? history.at(-1)?.adapters.find(row => row.id === id)?.engines.find(engine => engine.id === field)?.engineType : undefined;
  for (let index = history.length - 1; index >= 0 && values.length < 36; index--) {
    const frame = history[index];
    const adapter = frame.adapters.find(row => row.id === id);
    const engine = typeof field === "number" ? adapter?.engines.find(engine => engine.id === field) : undefined;
    const value = typeof field === "number" ? engine?.observedPercentSum : adapter?.[field].bytes;
    if (typeof field === "number" && (frame.rateBaseline || kind !== engine?.engineType)) break;
    if (!isObservedMetric(value)) break;
    values.push(value);
  }
  return values.reverse();
}
