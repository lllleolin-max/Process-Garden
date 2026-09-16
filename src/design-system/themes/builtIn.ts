import type { ThemeManifest } from "../../types/theme";
import { assetUrl, validateAssetMap } from "../../themes/assets";
import { builtinArtwork } from "../../themes/builtinArtwork";

export const gardenTheme: ThemeManifest = {
  schemaVersion: 1,
  id: "garden",
  name: { "en-US": "Garden", "zh-CN": "生态花园" },
  version: "1.0.0",
  author: "Process Garden",
  colors: {
    background: "#050a09",
    backgroundElevated: "#08110f",
    panel: "rgba(8, 20, 17, 0.76)",
    panelStrong: "rgba(10, 25, 21, 0.94)",
    border: "rgba(125, 219, 178, 0.17)",
    borderStrong: "rgba(119, 238, 166, 0.42)",
    text: "#e8f4ee",
    textMuted: "#8fa59b",
    primary: "#72ef9b",
    secondary: "#36cfe4",
    tertiary: "#9872f3",
    warning: "#f0ae4f",
    danger: "#f15e78",
    success: "#69ed8d"
  },
  typography: {
    display: "Space Grotesk Variable",
    body: "Inter Variable",
    editorial: "Inter Variable",
    mono: "JetBrains Mono Variable",
    cjkDisplay: "Noto Sans SC",
    cjkBody: "Noto Sans SC"
  },
  effects: { glow: 0.82, particles: 0.78, vignette: 0.62, grain: 0.08 },
  motion: { drift: 0.72, pulse: 0.8, tendril: 0.62 }
};

export const eldritchTheme: ThemeManifest = {
  schemaVersion: 1,
  id: "eldritch",
  name: { "en-US": "Deep Sea Cthulhu", "zh-CN": "深海克苏鲁" },
  version: "1.0.0",
  author: "Process Garden",
  colors: {
    background: "#020808",
    backgroundElevated: "#06100f",
    panel: "rgba(3, 15, 14, 0.80)",
    panelStrong: "rgba(5, 20, 18, 0.95)",
    border: "rgba(113, 208, 159, 0.18)",
    borderStrong: "rgba(124, 232, 164, 0.46)",
    text: "#e0eee6",
    textMuted: "#849b91",
    primary: "#7bdc91",
    secondary: "#62d6d0",
    tertiary: "#8a68ce",
    warning: "#d7a650",
    danger: "#e16371",
    success: "#6ed98b"
  },
  typography: {
    display: "Grenze Gotisch",
    body: "Inter Variable",
    editorial: "Spectral",
    mono: "JetBrains Mono Variable",
    cjkDisplay: "Noto Serif SC",
    cjkBody: "Noto Sans SC"
  },
  effects: { glow: 0.66, particles: 0.54, vignette: 0.92, grain: 0.18 },
  motion: { drift: 0.54, pulse: 0.68, tendril: 0.9 }
};

export const cyberpunkTheme: ThemeManifest = {
  ...gardenTheme,
  id: "cyberpunk",
  name: { "en-US": "Neon Matrix", "zh-CN": "霓虹矩阵" },
  colors: {
    background: "#040711", backgroundElevated: "#090f20",
    panel: "rgba(8, 15, 32, 0.82)", panelStrong: "rgba(10, 19, 39, 0.96)",
    border: "rgba(67, 214, 245, 0.22)", borderStrong: "rgba(67, 230, 255, 0.52)",
    text: "#e5f7ff", textMuted: "#93abc3", primary: "#43e6ff",
    secondary: "#f36bdc", tertiary: "#a18aff", warning: "#ffd166",
    danger: "#ff597e", success: "#57efba"
  },
  typography: { ...gardenTheme.typography, display: "JetBrains Mono Variable" },
  effects: { glow: 0.86, particles: 0.62, vignette: 0.7, grain: 0.04 },
  motion: { drift: 0.6, pulse: 0.85, tendril: 0.35 }
};

export const crimsonTheme: ThemeManifest = {
  ...eldritchTheme,
  id: "crimson",
  name: { "en-US": "Crimson Gaze", "zh-CN": "猩红凝视" },
  colors: {
    background: "#080304", backgroundElevated: "#120608",
    panel: "rgba(19, 5, 8, 0.82)", panelStrong: "rgba(28, 7, 12, 0.96)",
    border: "rgba(203, 69, 83, 0.23)", borderStrong: "rgba(238, 82, 101, 0.5)",
    text: "#f3e5e1", textMuted: "#b5989a", primary: "#ec5265",
    secondary: "#b82948", tertiary: "#d8a69a", warning: "#e9ad75",
    danger: "#ff725b", success: "#e7a7af"
  },
  effects: { glow: 0.7, particles: 0.4, vignette: 0.94, grain: 0.14 },
  motion: { drift: 0.4, pulse: 0.58, tendril: 0.85 }
};

export const angelTheme: ThemeManifest = {
  ...gardenTheme,
  id: "angel",
  name: { "en-US": "Sacred Angel", "zh-CN": "神圣天使" },
  colors: {
    background: "#070c18", backgroundElevated: "#101829",
    panel: "rgba(12, 19, 34, 0.86)", panelStrong: "rgba(18, 27, 45, 0.96)",
    border: "rgba(236, 198, 113, 0.25)", borderStrong: "rgba(255, 215, 133, 0.58)",
    text: "#fff4dc", textMuted: "#b8bdca", primary: "#ffd783",
    secondary: "#69bfff", tertiary: "#e8e0ff", warning: "#ffb95c",
    danger: "#ff7f91", success: "#91dfc9"
  },
  typography: { ...gardenTheme.typography, display: "Spectral", editorial: "Spectral", cjkDisplay: "Noto Serif SC" },
  effects: { glow: 0.78, particles: 0.5, vignette: 0.66, grain: 0.03 },
  motion: { drift: 0.42, pulse: 0.62, tendril: 0.35 }
};

export const olympusTheme: ThemeManifest = {
  ...angelTheme, id: "olympus",
  name: { "en-US": "Olympus", "zh-CN": "奥林匹斯" },
  colors: { ...angelTheme.colors, background: "#080d20", backgroundElevated: "#101a32",
    panel: "rgba(10, 18, 37, 0.86)", panelStrong: "rgba(16, 28, 51, 0.96)",
    primary: "#eec568", secondary: "#528fff", tertiary: "#d78b62", text: "#faf0da" },
  effects: { glow: 0.72, particles: 0.4, vignette: 0.62, grain: 0.025 },
  motion: { drift: 0.32, pulse: 0.5, tendril: 0.3 }
};
export const minimalTheme: ThemeManifest = {
  ...gardenTheme, id: "minimal", name: { "en-US": "Minimal", "zh-CN": "简洁" },
  colors: {
    background: "#101215", backgroundElevated: "#191c21", panel: "#171a1f", panelStrong: "#1d2127",
    border: "#30353d", borderStrong: "#626d7c", text: "#edf0f5", textMuted: "#9ba4b2",
    primary: "#b4c5df", secondary: "#88a7d2", tertiary: "#aaa5c4", warning: "#e3b66c", danger: "#ef8383", success: "#8cbea1"
  },
  effects: { glow: 0, particles: 0, vignette: 0, grain: 0 },
  motion: { drift: 0, pulse: 0, tendril: 0 }
};
export const builtInThemes: ThemeManifest[] = [gardenTheme, eldritchTheme, cyberpunkTheme, crimsonTheme, angelTheme, olympusTheme, minimalTheme];

export function themeFamily(theme: ThemeManifest) {
  return builtInThemes.find((item) => item.id === theme.id)?.id ?? theme.basedOn ?? "garden";
}

const COLOR_PATTERN = /^(#[0-9a-f]{3,8}|rgba?\([^()]{1,96}\)|hsla?\([^()]{1,96}\))$/i;
const FONT_FAMILIES = new Set([
  "Space Grotesk Variable",
  "Inter Variable",
  "JetBrains Mono Variable",
  "Grenze Gotisch",
  "Spectral",
  "Noto Sans SC",
  "Noto Serif SC"
]);

function hasOnlyKeys(value: object, allowed: readonly string[]) {
  return Object.keys(value).every((key) => allowed.includes(key));
}

export function normalizeThemeManifest(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const value = input as Partial<ThemeManifest> & { typography?: Partial<ThemeManifest["typography"]> };
  if (value.schemaVersion !== 1 || !value.typography || value.typography.editorial) return input;
  if (typeof value.typography.body !== "string") return input;
  return { ...value, typography: { ...value.typography, editorial: value.typography.body } };
}

export function validateThemeManifest(input: unknown): input is ThemeManifest {
  if (!input || typeof input !== "object") return false;
  const value = input as Partial<ThemeManifest>;
  if (!hasOnlyKeys(value, ["schemaVersion", "id", "name", "version", "author", "basedOn", "colors", "typography", "effects", "motion", "assets", "captureStyle"])) return false;
  if (![1, 2].includes(value.schemaVersion ?? 0) || typeof value.id !== "string" || !/^[a-z0-9][a-z0-9_-]{1,48}$/i.test(value.id)) return false;
  if (value.assets !== undefined && (value.schemaVersion !== 2 || !validateAssetMap(value.assets))) return false;
  if (value.captureStyle !== undefined && (value.schemaVersion !== 2 || !["vine", "tentacle", "cable", "beam", "wing", "laurel", "spear"].includes(value.captureStyle))) return false;
  if (value.schemaVersion === 2 && value.assets === undefined && value.captureStyle === undefined) return false;
  if (!value.name || !hasOnlyKeys(value.name, ["en-US", "zh-CN"])) return false;
  if (![value.name["en-US"], value.name["zh-CN"]].every((name) => typeof name === "string" && name.trim().length > 0 && name.length <= 64)) return false;
  if (typeof value.version !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value.version)) return false;
  if (value.author !== undefined && (typeof value.author !== "string" || value.author.length > 96)) return false;
  if (value.basedOn !== undefined && !builtInThemes.some((theme) => theme.id === value.basedOn)) return false;
  if (!value.colors || !value.typography || !value.effects || !value.motion) return false;
  const requiredColors = ["background", "backgroundElevated", "panel", "panelStrong", "border", "borderStrong", "text", "textMuted", "primary", "secondary", "tertiary", "warning", "danger", "success"] as const;
  const typographyKeys = ["display", "body", "editorial", "mono", "cjkDisplay", "cjkBody"] as const;
  const effectKeys = ["glow", "particles", "vignette", "grain"] as const;
  const motionKeys = ["drift", "pulse", "tendril"] as const;
  if (!hasOnlyKeys(value.colors, requiredColors) || !requiredColors.every((key) => typeof value.colors?.[key] === "string" && COLOR_PATTERN.test(value.colors[key]))) return false;
  if (!hasOnlyKeys(value.typography, typographyKeys) || !typographyKeys.every((key) => typeof value.typography?.[key] === "string" && FONT_FAMILIES.has(value.typography[key]))) return false;
  if (!hasOnlyKeys(value.effects, effectKeys) || !effectKeys.every((key) => typeof value.effects?.[key] === "number" && Number.isFinite(value.effects[key]) && value.effects[key] >= 0 && value.effects[key] <= 1)) return false;
  return hasOnlyKeys(value.motion, motionKeys) && motionKeys.every((key) => typeof value.motion?.[key] === "number" && Number.isFinite(value.motion[key]) && value.motion[key] >= 0 && value.motion[key] <= 2);
}

export function applyTheme(theme: ThemeManifest, locale: "en-US" | "zh-CN") {
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  root.dataset.locale = locale;
  Object.entries(theme.colors).forEach(([key, value]) => {
    const cssKey = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    root.style.setProperty(`--color-${cssKey}`, value);
  });
  root.style.setProperty("--font-display", locale === "zh-CN" ? theme.typography.cjkDisplay : theme.typography.display);
  root.style.setProperty("--font-body", locale === "zh-CN" ? theme.typography.cjkBody : theme.typography.body);
  root.style.setProperty("--font-editorial", locale === "zh-CN" ? theme.typography.cjkDisplay : (theme.typography.editorial ?? theme.typography.body));
  root.style.setProperty("--font-mono", theme.typography.mono);
  const visualBase = themeFamily(theme);
  root.style.setProperty("--theme-background-image", visualBase === "minimal" ? "none" : `url('${assetUrl(theme, "background") ?? builtinArtwork(visualBase, "background")}')`);
  root.style.setProperty("--effect-glow", String(theme.effects.glow));
  root.style.setProperty("--effect-particles", String(theme.effects.particles));
  root.style.setProperty("--effect-vignette", String(theme.effects.vignette));
}
