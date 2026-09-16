import { strToU8, unzipSync, zipSync } from "fflate";
import { normalizeThemeManifest, validateThemeManifest } from "../design-system/themes/builtIn";
import type { ThemeAssetRole, ThemeManifest } from "../types/theme";
import { assetPathPattern, imagePath, MAX_ASSET_BYTES, MAX_IMAGE_BYTES, pngDimensions, validatePng } from "./assets";

export const MAX_THEME_PACKAGE_BYTES = 66 * 1024 * 1024;
export const MAX_THEME_MANIFEST_BYTES = 256 * 1024;

export function serializeThemePackage(theme: ThemeManifest, files: Record<string, Uint8Array> = {}) {
  if (!validateThemeManifest(theme)) throw new Error("invalid theme manifest");
  const archive: Record<string, Uint8Array> = { "manifest.json": strToU8(JSON.stringify(theme, null, 2)) };
  let total = 0;
  for (const [role, path] of Object.entries(theme.assets ?? {})) {
    if (!files[path]) throw new Error("missingImage");
    pngDimensions(files[path], role as ThemeAssetRole);
    if (!archive[path]) total += files[path].length;
    archive[path] = files[path];
  }
  if (total > MAX_ASSET_BYTES) throw new Error("theme package too large");
  return zipSync(archive, { level: 0 });
}

export function unpackThemePackage(fileName: string, bytes: Uint8Array) {
  if (bytes.byteLength > MAX_THEME_PACKAGE_BYTES) throw new Error("theme package too large");
  let archive: Record<string, Uint8Array>;
  if (fileName.toLowerCase().endsWith(".json")) {
    if (bytes.byteLength > MAX_THEME_MANIFEST_BYTES) throw new Error("manifest too large");
    archive = { "manifest.json": bytes };
  } else {
    let total = 0;
    const seen = new Set<string>();
    archive = unzipSync(bytes, { filter: (entry) => {
      const path = entry.name;
      if (path.includes("\\") || path.startsWith("/") || path.includes(":") || path.split("/").some((part) => part === ".." || part === ".")) throw new Error("unsafe theme path");
      if (seen.has(path)) throw new Error("duplicate theme file");
      seen.add(path);
      if (seen.size > 16) throw new Error("too many theme files");
      if (path === "assets/") return false;
      if (path !== "manifest.json" && !assetPathPattern.test(path)) throw new Error("unsupported theme asset");
      if (entry.originalSize > (path === "manifest.json" ? MAX_THEME_MANIFEST_BYTES : MAX_IMAGE_BYTES)) throw new Error("theme file too large");
      total += entry.originalSize;
      if (total > MAX_ASSET_BYTES + MAX_THEME_MANIFEST_BYTES) throw new Error("theme package too large");
      return true;
    } });
  }
  if (!archive["manifest.json"]) throw new Error("manifest missing");
  const parsed = normalizeThemeManifest(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(archive["manifest.json"])));
  if (!validateThemeManifest(parsed)) throw new Error("invalid theme manifest");
  const files = { ...archive };
  delete files["manifest.json"];
  const declared = new Set(Object.values(parsed.assets ?? {}));
  if (Object.keys(files).some((path) => !declared.has(path))) throw new Error("undeclared theme asset");
  for (const [role, path] of Object.entries(parsed.assets ?? {})) {
    if (!files[path]) throw new Error("missingImage");
    pngDimensions(files[path], role as ThemeAssetRole);
  }
  return { theme: parsed, files };
}

export function parseThemePackage(fileName: string, bytes: Uint8Array): ThemeManifest {
  return unpackThemePackage(fileName, bytes).theme;
}

export async function validatePackageArtwork(theme: ThemeManifest, files: Record<string, Uint8Array>) {
  for (const [role, path] of Object.entries(theme.assets ?? {})) {
    await validatePng(files[path], role as ThemeAssetRole);
    if (await imagePath(files[path]) !== path) throw new Error("invalidImage");
  }
}
