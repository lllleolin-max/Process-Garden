export type BuiltInThemeId = "garden" | "eldritch";
export type ThemeId = string;

export interface ThemeTypography {
  display: string;
  body: string;
  editorial: string;
  mono: string;
  cjkDisplay: string;
  cjkBody: string;
}

export interface ThemeColors {
  background: string;
  backgroundElevated: string;
  panel: string;
  panelStrong: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  primary: string;
  secondary: string;
  tertiary: string;
  warning: string;
  danger: string;
  success: string;
}

export interface ThemeEffects {
  glow: number;
  particles: number;
  vignette: number;
  grain: number;
}

export interface ThemeMotion {
  drift: number;
  pulse: number;
  tendril: number;
}

export interface ThemeManifest {
  schemaVersion: 1;
  id: ThemeId;
  name: { "en-US": string; "zh-CN": string };
  version: string;
  author?: string;
  basedOn?: BuiltInThemeId;
  colors: ThemeColors;
  typography: ThemeTypography;
  effects: ThemeEffects;
  motion: ThemeMotion;
}
