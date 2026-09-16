import { expect, it } from "vitest";
import { parseServiceReadings, serviceStateLabel } from "./serviceReadings";

const row = { name: "Example", displayName: "Example service", state: 4, processId: 42, serviceType: 32 };
it("projects only public fields and distinguishes empty tables from malformed data", () => {
  expect(parseServiceReadings([{ ...row, secret: "ignored" }])).toEqual([row]);
  expect(parseServiceReadings([])).toEqual([]);
  for (const invalid of [null, {}, [null], [row, { ...row, name: "EXAMPLE" }], Array(65537).fill(row)])
    expect(() => parseServiceReadings(invalid)).toThrow();
});
it.each([0, 1, 2, 3, 8, 0xffffffff])("rejects process targets for non-valid state %i but retains unknown state", state => {
  expect(() => parseServiceReadings([{ ...row, state }])).toThrow();
  expect(parseServiceReadings([{ ...row, state, processId: null }])[0].state).toBe(state);
});
it("rejects invalid fields and permits absent PID for an otherwise running service", () => {
  for (const patch of [{ name: "" }, { name: "a\0b" }, { displayName: "a".repeat(4097) }, { state: -1 }, { state: NaN }, { processId: 0 }, { processId: undefined }, { processId: 1.5 }, { serviceType: 2 ** 32 }])
    expect(() => parseServiceReadings([{ ...row, ...patch }])).toThrow();
  expect(parseServiceReadings([{ ...row, processId: null }])[0].processId).toBeNull();
});
it("labels known and future service states without pretending unknown means stopped", () => {
  expect(serviceStateLabel(4, "en-US")).toBe("Running");
  expect(serviceStateLabel(3, "zh-CN")).toBe("正在停止");
  expect(serviceStateLabel(88, "zh-CN")).toBe("未知 (88)");
});
