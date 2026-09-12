import type { ThemeManifest } from "../../types/theme";

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
  name: { "en-US": "Eldritch", "zh-CN": "深渊低语" },
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

export const builtInThemes: ThemeManifest[] = [gardenTheme, eldritchTheme];

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
  if (!hasOnlyKeys(value, ["schemaVersion", "id", "name", "version", "author", "basedOn", "colors", "typography", "effects", "motion"])) return false;
  if (value.schemaVersion !== 1 || typeof value.id !== "string" || !/^[a-z0-9][a-z0-9-_]{1,48}$/i.test(value.id)) return false;
  if (!value.name || !hasOnlyKeys(value.name, ["en-US", "zh-CN"])) return false;
  if (![value.name["en-US"], value.name["zh-CN"]].every((name) => typeof name === "string" && name.trim().length > 0 && name.length <= 64)) return false;
  if (typeof value.version !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value.version)) return false;
  if (value.author !== undefined && (typeof value.author !== "string" || value.author.length > 96)) return false;
  if (value.basedOn !== undefined && value.basedOn !== "garden" && value.basedOn !== "eldritch") return false;
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
  const visualBase = theme.id === "eldritch" || theme.basedOn === "eldritch" ? "eldritch" : "garden";
  const backgroundVersion = visualBase === "garden" ? "v2" : "v1";
  root.style.setProperty("--theme-background-image", `url('/assets/generated/${visualBase}/backgrounds/${visualBase}-canvas-bg-${backgroundVersion}.png')`);
  root.style.setProperty("--effect-glow", String(theme.effects.glow));
  root.style.setProperty("--effect-particles", String(theme.effects.particles));
  root.style.setProperty("--effect-vignette", String(theme.effects.vignette));
}
