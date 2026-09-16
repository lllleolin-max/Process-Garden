import { expect, it } from "vitest";
import { observedParent } from "./processRelations";
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
