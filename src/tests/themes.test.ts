import { zipSync, strToU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { applyTheme, builtInThemes, gardenTheme, normalizeThemeManifest, validateThemeManifest } from "../design-system/themes/builtIn";
import { MAX_THEME_MANIFEST_BYTES, parseThemePackage, serializeThemePackage } from "../themes/package";

describe("theme contract", () => {
  it("accepts both shipped themes", () => {
    expect(builtInThemes.every(validateThemeManifest)).toBe(true);
  });

  it("applies color and typography tokens immediately", () => {
    applyTheme(gardenTheme, "zh-CN");
    expect(document.documentElement.dataset.theme).toBe("garden");
    expect(document.documentElement.style.getPropertyValue("--color-primary")).toBe(gardenTheme.colors.primary);
    expect(document.documentElement.style.getPropertyValue("--font-body")).toBe("Noto Sans SC");
  });

  it("rejects remote CSS and unknown font families", () => {
    const unsafeColor = structuredClone(gardenTheme);
    unsafeColor.id = "unsafe-color";
    unsafeColor.colors.panel = "url(https://example.com/track.png)";
    expect(validateThemeManifest(unsafeColor)).toBe(false);

    const unsafeFont = structuredClone(gardenTheme);
    unsafeFont.id = "unsafe-font";
    unsafeFont.typography.display = "Remote Font";
    expect(validateThemeManifest(unsafeFont)).toBe(false);
  });

  it("migrates early v1 manifests that omitted the editorial role", () => {
    const legacy = structuredClone(gardenTheme) as unknown as Record<string, unknown>;
    delete (legacy.typography as Record<string, unknown>).editorial;
    const normalized = normalizeThemeManifest(legacy);
    expect(validateThemeManifest(normalized)).toBe(true);
  });
});

describe(".pgtheme packages", () => {
  it("round-trips a validated manifest", () => {
    const custom = structuredClone(gardenTheme);
    custom.id = "moss-night";
    custom.name = { "en-US": "Moss Night", "zh-CN": "苔藓之夜" };
    const bytes = serializeThemePackage(custom);
    expect(parseThemePackage("moss-night.pgtheme", bytes)).toEqual(custom);
  });

  it("rejects path traversal and executable extras", () => {
    const traversal = zipSync({ "../manifest.json": strToU8(JSON.stringify(gardenTheme)) });
    expect(() => parseThemePackage("bad.pgtheme", traversal)).toThrow(/unsafe/);
    const script = zipSync({ "manifest.json": strToU8(JSON.stringify(gardenTheme)), "install.js": strToU8("alert(1)") });
    expect(() => parseThemePackage("bad.pgtheme", script)).toThrow(/unsupported/);
  });

  it("rejects oversized manifests", () => {
    expect(() => parseThemePackage("large.json", new Uint8Array(MAX_THEME_MANIFEST_BYTES + 1))).toThrow(/large/);
  });
});
