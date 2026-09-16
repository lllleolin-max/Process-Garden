import { expect, it } from "vitest";
import { processIdentity } from "./processIdentity";

it("normalizes timestamp units while distinguishing reused PIDs", () => {
  expect(processIdentity({ pid: 12, startedAt: 1_800_000_000 })).toBe(processIdentity({ pid: 12, startedAt: 1_800_000_000_000 }));
  expect(processIdentity({ pid: 12, startedAt: 1_800_000_000 })).not.toBe(processIdentity({ pid: 12, startedAt: 1_800_000_001 }));
});
