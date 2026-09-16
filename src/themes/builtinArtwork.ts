import type { ThemeAssetRole } from "../types/theme";

/** Logical slots stay stable; each family supplies its own art direction. */
export function builtinArtwork(family: string, role: ThemeAssetRole) {
  if (family === "cyberpunk" && role === "capture") return "/assets/generated/lifecycle/beam-capture-atlas-v1.png";
  if (role === "capture" && (family === "angel" || family === "olympus")) return `/assets/generated/refined/${family}/capture-v2.png`;
  const owner = role === "celestial" && (family === "garden" || family === "eldritch") ? "shared" : family === "eldritch" ? "eldritch-blue" : family;
  return `/assets/generated/refined/${owner}/${role}.png`;
}

export const hasMaw = (family: string) => family === "eldritch" || family === "crimson";
