import { describe, expect, it } from "vitest";
import enUS from "../i18n/locales/en-US.json";
import zhCN from "../i18n/locales/zh-CN.json";

function flatten(value: unknown, prefix = ""): Record<string, string> {
  if (typeof value === "string") return { [prefix]: value };
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((all, [key, child]) => ({ ...all, ...flatten(child, prefix ? `${prefix}.${key}` : key) }), {});
}

function variables(value: string) {
  return [...value.matchAll(/{{\s*([\w.-]+)\s*}}/g)].map((match) => match[1]).sort();
}

describe("localization catalog", () => {
  it("keeps Chinese and English key sets identical", () => {
    expect(Object.keys(flatten(zhCN)).sort()).toEqual(Object.keys(flatten(enUS)).sort());
  });

  it("keeps interpolation variables identical", () => {
    const english = flatten(enUS);
    const chinese = flatten(zhCN);
    Object.keys(english).forEach((key) => expect(variables(chinese[key]), key).toEqual(variables(english[key])));
  });

  it("has no blank translations", () => {
    expect(Object.values(flatten(enUS)).every((value) => value.trim().length > 0)).toBe(true);
    expect(Object.values(flatten(zhCN)).every((value) => value.trim().length > 0)).toBe(true);
  });
});
