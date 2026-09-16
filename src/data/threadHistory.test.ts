import { expect, it } from "vitest";
import { makeDemoSnapshot } from "./demo";
import { threadHistory } from "./threadHistory";

it("never converts missing thread enumeration into zero or bridges a gap", () => {
  const base = makeDemoSnapshot(0);
  const samples = [12, undefined, 16, 18].map(threadCount => ({ ...base, threadCount }));
  expect(threadHistory(samples)).toEqual([16, 18]);
  expect(threadHistory(samples.slice(0, 2))).toEqual([]);
  expect(threadHistory([{ ...base, threadCount: 0 }])).toEqual([0]);
  expect(threadHistory(samples, 1)).toEqual([18]);
});
