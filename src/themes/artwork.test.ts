import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { gardenTheme, crimsonTheme, angelTheme, olympusTheme, validateThemeManifest } from "../design-system/themes/builtIn";
import { pngDimensions } from "./assets";
import { parseThemePackage, serializeThemePackage, unpackThemePackage } from "./package";
import { buildThemePrompt } from "./prompts";
import type { ThemeManifest } from "../types/theme";

function header(width = 128, height = 128) {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width); view.setUint32(20, height);
  return bytes;
}
const path = `assets/${"a".repeat(64)}.png`;
const theme: ThemeManifest = { ...gardenTheme, id: "custom-art", schemaVersion: 2, assets: { core: path } };

describe("custom artwork contract", () => {
  it.each([[angelTheme, "angel", "wing"], [olympusTheme, "olympus", "spear"]] as const)("exports the new theme family and its lifecycle", (base, family, captureStyle) => {
    const custom: ThemeManifest = { ...base, id: `custom-${family}`, basedOn: family, schemaVersion: 2, captureStyle };
    expect(unpackThemePackage("divine.pgtheme", serializeThemePackage(custom)).theme).toEqual(custom);
    const prompt = buildThemePrompt("", family, false);
    expect(prompt).toContain(`Exit animation module: ${captureStyle}`);
    expect(prompt).not.toContain("- core-maw.png:");
  });
  it("round trips an ocular theme and includes its swallowing artwork in the prompt", () => {
    const ocular = { ...crimsonTheme, id: "custom-ocular", basedOn: "crimson" as const };
    expect(unpackThemePackage("ocular.pgtheme", serializeThemePackage(ocular)).theme).toEqual(ocular);
    const prompt = buildThemePrompt("Ancient red eye", "crimson", false);
    expect(prompt).toContain("core-maw.png");
    expect(prompt).toContain("Exit animation module: tentacle");
    expect(prompt).toContain("ocular Cthulhu");
  });
  it("round trips a beam override and supplies beam authoring instructions", () => {
    const beam: ThemeManifest = { ...gardenTheme, id: "beam-garden", schemaVersion: 2, captureStyle: "beam" };
    expect(unpackThemePackage("beam.pgtheme", serializeThemePackage(beam)).theme).toEqual(beam);
    expect(buildThemePrompt("", "cyberpunk", false)).toContain("Exit animation module: beam");
    expect(buildThemePrompt("", "garden", false, "beam")).toContain("projector aperture");
  });
  it("round trips a motion-only override and validates capture artwork", () => {
    const custom: ThemeManifest = { ...gardenTheme, id: "mechanical-garden", schemaVersion: 2, captureStyle: "cable" };
    expect(unpackThemePackage("motion.pgtheme", serializeThemePackage(custom)).theme).toEqual(custom);
    expect(validateThemeManifest({ ...custom, captureStyle: "unknown" })).toBe(false);
    expect(validateThemeManifest({ ...custom, schemaVersion: 1 })).toBe(false);
    expect(validateThemeManifest({ ...theme, assets: { capture: path } })).toBe(true);
    expect(buildThemePrompt("Mechanical garden", "garden", false, "cable")).toContain("Exit animation module: cable");
    expect(buildThemePrompt("", "garden", true)).toContain("capture-atlas.png");
  });
  it("round trips packaged artwork without embedding image data in settings", () => {
    const bytes = header();
    const pack = serializeThemePackage(theme, { [path]: bytes });
    const result = unpackThemePackage("theme.pgtheme", pack);
    expect(result.theme).toEqual(theme);
    expect(result.files[path]).toEqual(bytes);
    expect(validateThemeManifest(result.theme)).toBe(true);
  });
  it("rejects missing, undeclared and remotely referenced artwork", () => {
    expect(() => serializeThemePackage(theme)).toThrow("missingImage");
    expect(() => parseThemePackage("theme.json", strToU8(JSON.stringify(theme)))).toThrow("missingImage");
    const files = { "manifest.json": strToU8(JSON.stringify({ ...gardenTheme, id: "custom" })), [path]: header() };
    expect(() => unpackThemePackage("bad.pgtheme", zipSync(files))).toThrow("undeclared");
    expect(validateThemeManifest({ ...theme, assets: { core: "https://example.com/core.png" } })).toBe(false);
    expect(validateThemeManifest({ ...theme, assets: { script: path } })).toBe(false);
    expect(validateThemeManifest({ ...theme, schemaVersion: 1 })).toBe(false);
  });
  it("rejects traversal, disguised files and unsupported archive paths", () => {
    for (const unsafe of ["assets/../x.png", "C:/x.png", "assets\\x.png", "install.js"]) {
      expect(() => unpackThemePackage("bad.pgtheme", zipSync({ "manifest.json": strToU8(JSON.stringify(theme)), [unsafe]: header() }))).toThrow();
    }
    expect(() => pngDimensions(strToU8("<svg></svg>"), "core")).toThrow("invalidImage");
  });
  it("bounds decoded pixels and enforces the renderer's atlas shape", () => {
    expect(pngDimensions(header(2560, 1440), "background")).toEqual({ width: 2560, height: 1440 });
    expect(() => pngDimensions(header(4096, 4096), "core")).toThrow("imageDimensions");
    expect(() => pngDimensions(header(257, 257), "agent")).toThrow("imageShape");
    expect(() => pngDimensions(header(256, 128), "process1")).toThrow("imageShape");
    expect(() => pngDimensions(header(), "background")).toThrow("imageShape");
  });
  it("generates a complete prompt matching the upload slots and selected behavior", () => {
    const garden = buildThemePrompt("Moon garden", "garden", false);
    expect(garden).toContain("Theme brief: Moon garden");
    expect(garden).toContain("process-atlas-v4.png");
    expect(garden).toContain("agent-growth-atlas.png");
    expect(garden).not.toContain("core-maw.png");
    expect(buildThemePrompt("", "eldritch", true)).toContain("core-maw.png");
  });
});
