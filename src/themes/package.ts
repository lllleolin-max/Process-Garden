import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { normalizeThemeManifest, validateThemeManifest } from "../design-system/themes/builtIn";
import type { ThemeManifest } from "../types/theme";

export const MAX_THEME_PACKAGE_BYTES = 2 * 1024 * 1024;
export const MAX_THEME_MANIFEST_BYTES = 256 * 1024;

export function serializeThemePackage(theme: ThemeManifest) {
  if (!validateThemeManifest(theme)) throw new Error("invalid theme manifest");
  return zipSync({ "manifest.json": strToU8(JSON.stringify(theme, null, 2)) }, { level: 6 });
}

export function parseThemePackage(fileName: string, bytes: Uint8Array): ThemeManifest {
  if (bytes.byteLength > MAX_THEME_PACKAGE_BYTES) throw new Error("theme package too large");
  let text: string;
  if (fileName.toLowerCase().endsWith(".json")) {
    if (bytes.byteLength > MAX_THEME_MANIFEST_BYTES) throw new Error("manifest too large");
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } else {
    const archive = unzipSync(bytes, {
      filter: (entry) => {
        const path = entry.name.replaceAll("\\", "/");
        if (path.startsWith("/") || path.split("/").includes("..")) throw new Error("unsafe theme path");
        if (path === "manifest.json") {
          if (entry.originalSize > MAX_THEME_MANIFEST_BYTES) throw new Error("manifest too large");
          return true;
        }
        if (!path.endsWith("/")) throw new Error("unsupported theme asset");
        return false;
      }
    });
    const manifest = archive["manifest.json"];
    if (!manifest) throw new Error("manifest missing");
    text = strFromU8(manifest);
  }
  const parsed = normalizeThemeManifest(JSON.parse(text));
  if (!validateThemeManifest(parsed)) throw new Error("invalid theme manifest");
  return parsed;
}
