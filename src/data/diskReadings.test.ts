import { expect, it } from "vitest";
import { diskHistory, parseDiskReadings } from "./diskReadings";
const row = { id: "0 C:", readBytesPerSecond: 0, writeBytesPerSecond: 1024, activePercent: null };

it("preserves observed zero, null and empty results without retaining input objects", () => {
  const result = parseDiskReadings([row]);
  expect(result).toEqual([row]); expect(result[0]).not.toBe(row);
  expect(parseDiskReadings([])).toEqual([]);
});
it.each([null, {}, [row, row], [{ ...row, id: "_Total" }], [{ ...row, id: "" }], [{ ...row, activePercent: 101 }], [{ ...row, readBytesPerSecond: -1 }], [{ ...row, writeBytesPerSecond: NaN }], [{ id: "missing-values" }], Array(1025).fill(row)])("rejects invalid disk payload %#", value => {
  expect(() => parseDiskReadings(value)).toThrow();
});
it("breaks curves at missing instances or unavailable values and caps history", () => {
  expect(diskHistory([[row], [], [{ ...row, readBytesPerSecond: 4 }]], row.id, "readBytesPerSecond")).toEqual([4]);
  expect(diskHistory([[row], [{ ...row, readBytesPerSecond: null }]], row.id, "readBytesPerSecond")).toEqual([]);
  expect(diskHistory(Array(100).fill([row]), row.id, "readBytesPerSecond")).toHaveLength(36);
});
