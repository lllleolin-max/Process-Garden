import { afterEach, expect, it, vi } from "vitest";
afterEach(() => vi.restoreAllMocks());

it("reuses number formatters across animation frames without mixing units or precision", async () => {
  vi.resetModules();
  const { formatBytes, formatPercent, formatWatts } = await import("../i18n/formatters");
  const original = Intl.NumberFormat;
  const construct = vi.spyOn(Intl, "NumberFormat").mockImplementation(function(locale, options) {
    return new original(locale, options);
  });
  for (let i = 0; i < 120; i++) {
    expect(formatBytes(1536, "en-US")).toBe("1.5 KB");
    expect(formatPercent(12.5, "en-US", 1)).toBe("12.5%");
    expect(formatWatts(12, "en-US")).toBe("12.0 W");
  }
  expect(construct).toHaveBeenCalledTimes(3);
  expect(formatPercent(12.5, "en-US", 0)).toBe("13%");
  expect(formatPercent(12.5, "zh-CN", 1)).toBe("12.5%");
  expect(construct).toHaveBeenCalledTimes(5);
});

it("bounds cached caller precision variants", async () => {
  vi.resetModules();
  const { formatBytes } = await import("../i18n/formatters");
  const original = Intl.NumberFormat;
  const construct = vi.spyOn(Intl, "NumberFormat").mockImplementation(function(locale, options) {
    return new original(locale, options);
  });
  for (let precision = 0; precision < 20; precision++) formatBytes(1536, "en-US", precision);
  expect(construct).toHaveBeenCalledTimes(20);
  formatBytes(1536, "en-US", 19);
  expect(construct).toHaveBeenCalledTimes(20);
  formatBytes(1536, "en-US", 0);
  expect(construct).toHaveBeenCalledTimes(21);
});
