import { expect, it } from "vitest";
import { snapshotStatusLabel } from "./useSnapshotStatus";

it("does not label demo or paused observations as live", () => {
  expect(snapshotStatusLabel("demo", false, false, "en-US")).toBe("Demo");
  expect(snapshotStatusLabel("demo", true, false, "en-US")).toBe("Demo · paused");
  expect(snapshotStatusLabel("native", true, false, "en-US")).toBe("Paused");
});

it("keeps native errors visibly stale, including when paused", () => {
  expect(snapshotStatusLabel("native", false, true, "en-US")).toBe("Stale data");
  expect(snapshotStatusLabel("native", true, true, "zh-CN")).toBe("数据已过期");
  expect(snapshotStatusLabel("native", false, false, "zh-CN")).toBe("实时");
  expect(snapshotStatusLabel("demo", false, true, "zh-CN")).toBe("演示");
});
