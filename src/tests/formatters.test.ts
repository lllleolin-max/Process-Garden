import { describe, expect, it } from "vitest";
import { formatBytes, formatDateTime, formatDuration, formatPercent } from "../i18n/formatters";

describe("locale-aware formatters", () => {
  it("formats bytes and percentages for both locales", () => {
    expect(formatBytes(1.5 * 1024 ** 3, "en-US")).toContain("1.5 GB");
    expect(formatBytes(1.5 * 1024 ** 3, "zh-CN")).toContain("1.5 GB");
    expect(formatPercent(12.5, "en-US", 1)).toContain("12.5%");
  });

  it("formats durations and valid timestamps", () => {
    expect(formatDuration(90061, "zh-CN")).toBe("1天 1小时 1分");
    expect(formatDuration(90061, "en-US")).toBe("1d 1h 1m");
    expect(formatDateTime(1_754_000_000, "en-US")).not.toContain("Invalid");
  });

  it("normalizes seconds and milliseconds, and safely displays unavailable start times", () => {
    expect(formatDateTime(1_754_000_000_000, "zh-CN")).toBe(formatDateTime(1_754_000_000, "zh-CN"));
    for (const timestamp of [0, -1, NaN, Infinity, 1e30]) expect(formatDateTime(timestamp, "en-US")).toBe("—");
  });
});
