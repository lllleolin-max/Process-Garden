import type { CaptureStyle, ThemeManifest } from "../types/theme";

export const captureProfiles: Record<CaptureStyle, { width: number; wave: number; coils: number; zh: string; en: string }> = {
  laurel: { width: 0.85, wave: 0.12, coils: 1, zh: "月桂加冕", en: "Laurel ascension" },
  spear: { width: 1, wave: 0, coils: 0, zh: "雷霆之矛", en: "Thunder spear" },
  wing: { width: 1.1, wave: 0.35, coils: 1, zh: "圣光归怀", en: "Holy embrace" },
  vine: { width: 0.8, wave: 1, coils: 2.25, zh: "枝桠汲养", en: "Branch absorption" },
  tentacle: { width: 1.35, wave: 1.2, coils: 2.25, zh: "触手捕获", en: "Tentacle capture" },
  beam: { width: 1.8, wave: 0, coils: 0, zh: "接引光束", en: "Tractor beam" },
  cable: { width: 0.85, wave: 0.18, coils: 1.75, zh: "机械缆索", en: "Mechanical cable" }
};

export function captureStyleFor(theme: Pick<ThemeManifest, "id" | "basedOn" | "captureStyle">): CaptureStyle {
  if (theme.captureStyle) return theme.captureStyle;
  const family = theme.basedOn ?? theme.id;
  if (family === "olympus") return "spear";
  if (family === "angel") return "wing";
  return family === "eldritch" || family === "crimson" ? "tentacle" : family === "cyberpunk" ? "beam" : "vine";
}
