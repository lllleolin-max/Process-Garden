import { expect, it } from "vitest";
import { makeDemoSnapshot } from "./demo";
import { cpuCoreHistory } from "./cpuCoreHistory";

const sample = (values: (number | null)[], count = values.length) => ({ ...makeDemoSnapshot(0), cpuCorePercents: values, logicalCpuCount: count });
it("preserves zero and full utilization with a bounded chronological tail", () => {
  const history = [sample([20, 0]), sample([40, 100]), sample([60, 50])];
  expect(cpuCoreHistory(history, 1)).toEqual([0, 100, 50]);
  expect(cpuCoreHistory(history, 0, 2)).toEqual([40, 60]);
});
it.each([null, NaN, Infinity, -1, 101])("breaks continuity at unavailable or invalid readings: %s", value => {
  expect(cpuCoreHistory([sample([10]), sample([value]), sample([0])], 0)).toEqual([0]);
  expect(cpuCoreHistory([sample([10]), sample([value])], 0)).toEqual([]);
});
it("breaks on missing, mismatched or changed logical topology", () => {
  expect(cpuCoreHistory([sample([10, 20]), sample([30])], 0)).toEqual([30]);
  expect(cpuCoreHistory([sample([10]), sample([20], 2)], 0)).toEqual([]);
  expect(cpuCoreHistory([sample([10]), makeDemoSnapshot(0)], 0)).toEqual([]);
  for (const core of [-1, 0.5, NaN, 1]) expect(cpuCoreHistory([sample([10])], core)).toEqual([]);
});
