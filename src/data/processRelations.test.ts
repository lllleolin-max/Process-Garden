import { expect, it } from "vitest";
import { isObservedChild, observedParent } from "./processRelations";
import type { ProcessSnapshot } from "../types/system";

const parent: ProcessSnapshot = { pid: 4, name: "parent", startedAt: 1800000000, cpuPercent: 0, memoryBytes: 0, status: "idle" };
const child = { ...parent, pid: 8, parentPid: 4, startedAt: parent.startedAt + 10 };
it("resolves observed parents across timestamp units", () => {
  expect(observedParent(child, [parent, child])).toBe(parent);
  expect(observedParent({ ...child, startedAt: child.startedAt * 1000 }, [parent])).toBe(parent);
});
it("rejects missing, self, unknown-time and newer reused parent PIDs", () => {
  expect(observedParent(child, [])).toBeNull();
  expect(observedParent({ ...child, parentPid: child.pid }, [child])).toBeNull();
  for (const startedAt of [0, NaN, Infinity, child.startedAt + 1]) {
    expect(observedParent(child, [{ ...parent, startedAt }])).toBeNull();
  }
});

it("uses the same direct relationship rule in both navigation directions", () => {
  for (const candidate of [child, { ...child, startedAt: child.startedAt * 1000 },
    { ...child, parentPid: undefined }, { ...child, parentPid: 99 },
    { ...child, pid: parent.pid }, { ...child, startedAt: 0 },
    { ...child, startedAt: NaN }, { ...child, startedAt: parent.startedAt - 1 }]) {
    expect(isObservedChild(parent, candidate)).toBe(observedParent(candidate, [parent]) !== null);
  }
});

it("checks a large child set without changing or truncating the source records", () => {
  const records = Array.from({ length: 5000 }, (_, index) => ({ ...child, pid: index + 100, parentPid: index % 2 ? 99 : parent.pid }));
  const copy = [...records];
  const children = records.filter(record => isObservedChild(parent, record));
  expect(children).toHaveLength(2500);
  expect(children.at(-1)?.pid).toBe(5098);
  expect(records).toEqual(copy);
});
