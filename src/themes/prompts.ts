import type { BuiltInThemeId, CaptureStyle, ThemeAssetRole } from "../types/theme";
import { captureStyleFor } from "./lifecycle";
import { hasMaw } from "./builtinArtwork";

export const themeDirections: Record<BuiltInThemeId, string> = {
  minimal: "Minimal system monitor: neutral graphite and silver. Only a centered CPU chip is artwork; processes use actual application logos.",
  olympus: "Greek Olympus: a full-bodied Zeus-like deity with a laurel crown and lightning is the core. Ivory marble, antique gold, saturated lapis cobalt and terracotta. Processes are Athena, owl, lyre, trident, Hermes sandal, amphora and Pegasus. A Doric sanctuary frames the world. Tasks awaken as laurel seeds. The deity casts a thunder spear that flies outward and destroys the stationary target in a lightning burst; it never retrieves the target.",
  angel: "Sacred Angel: ivory layered feathers, rich sacred gold filigree, sapphire crystals and warm halos. Core is a full-bodied human angel with a visible serene face, flowing ivory robes and magnificent feathered wings; processes are winged tomes, shields, spears, celestial wheels, censers and chalices. Tasks unfold from feather-wrapped light seeds. Soft holy light bathes and lifts processes, guiding them along an ascending arc into the human angel's embrace at her chest. Background is a midnight-blue heavenly sanctuary with ivory arches and luminous clouds at the perimeter.",
  garden: "Botanical glasshouse: jade leaves, amber sap, seed pods, moss and delicate leaf insects. Core is a living botanical heart; tasks germinate and blossom; vines retrieve organisms.",
  eldritch: "Deep-sea Cthulhu: preserve the original glossy blue/cyan jewel-like eye organisms, vibrant emerald/violet/amber accents and coiled tentacles; refine existing silhouettes and saturated luminous detail, never substitute desaturated grey-green fauna. Core is an ancient tentacled idol; tasks hatch from abyssal sacs; tentacles retrieve organisms.",
  cyberpunk: "Architectural hardware, NOT recolored animals: triangular drones, optical cubes, cylindrical compute cartridges, robotic manipulators and energy emitters. Core is a reactor; tasks progress through fabrication chambers; cyan tractor beams lock onto and retrieve devices.",
  crimson: "Black-and-red ocular Cthulhu: obsidian eyelids, ruby irises, winged eyes, eye-chain serpents and black veils. Core is a crowned ancient eye; tasks awaken through sealed, opening and mature eyelids; eye-bearing tendons retrieve familiars. Background is an obsidian cathedral, not an ocean."
};

export const assetSpecs: Record<ThemeAssetRole, { file: string; zh: string; en: string; cells: string }> = {
  background: { file: "background.png", zh: "场景背景", en: "Background", cells: "16:9 dark environment, details at perimeter and bottom, central 60% quiet negative space, no central organism" },
  core: { file: "core.png", zh: "中央核心", en: "Central core", cells: "one centered focal core appropriate to this theme, clear silhouette and generous black margins" },
  process1: { file: "process-atlas-v1.png", zh: "生物图集 1", en: "Creatures 1", cells: "four distinct primary process subjects in reading order, silhouettes specific to this theme" },
  process2: { file: "process-atlas-v2.png", zh: "生物图集 2", en: "Creatures 2", cells: "four additional distinct process subjects in reading order, different from atlas 1" },
  process3: { file: "process-atlas-v3.png", zh: "生物图集 3 · 变体", en: "Creatures 3 · variants", cells: "second distinct specimens: four distinct primary process subjects in reading order, silhouettes specific to this theme" },
  process4: { file: "process-atlas-v4.png", zh: "生物图集 4 · 变体", en: "Creatures 4 · variants", cells: "second distinct specimens: four additional distinct process subjects in reading order, different from atlas 1" },
  habitat: { file: "habitat-atlas.png", zh: "环境装饰", en: "Habitat props", cells: "top-left low habitat base, top-right plant or structure cluster, bottom-left tiny liquid or energy pool, bottom-right mineral cluster" },
  pollinator: { file: "pollinator-atlas.png", zh: "飞行生物", en: "Ambient flyers", cells: "four distinct small ambient flyers in reading order, themed insects, micro-drones or ocular familiars" },
  agent: { file: "agent-growth-atlas.png", zh: "Agent 与任务成长", en: "Agent & task growth", cells: "top-left independent AI neural core, top-right early task embryo, bottom-left forming embryo, bottom-right near-hatching embryo; last three share identity and orientation" },
  celestial: { file: "celestial-atlas.png", zh: "昼夜天体", en: "Day & night bodies", cells: "top-left day body, top-right night body, bottom-left eldritch day body, bottom-right eldritch night body; no sky" },
  capture: { file: "capture-atlas.png", zh: "回收动作部件", en: "Capture appendage parts", cells: "for beam use top-left horizontal light column, top-right contact flare, bottom-left projector aperture, bottom-right hollow target halo; for other modules use top-left straight horizontal shaft with consistent diameter, top-right right-pointing gripping tip, bottom-left root socket, bottom-right open elliptical grasping loop; premium detailed materials matching the chosen vine/tentacle/cable/beam/wing/laurel/spear style, pure black background; each part separate, not a complete action scene" },
  maw: { file: "core-maw.png", zh: "核心吞噬状态", en: "Core swallowing state", cells: "the same core in active intake state: open mouth or dilated ocular portal, identical outer silhouette, alignment and scale, no debris or gore" }
};

export const assetCellLabels: Record<ThemeAssetRole, string> = {
  background: "边缘布景、中央留白", core: "居中单体，边缘渐隐",
  process1: "四种主要进程造型，按所选主题自由设计", process2: "另外四种进程造型，与图集 1 明显区分",
  process3: "图集 1 的四个物种变体", process4: "图集 2 的四个物种变体",
  habitat: "基座 / 竖向结构 / 能量容器 / 矿物结构", pollinator: "四种环境游动单体：昆虫、无人机或眼眷等",
  agent: "Agent 核心 / 早期胚胎 / 中期胚胎 / 临近孵化", celestial: "日 / 夜 / 异化日 / 异化夜", capture: "直杆或光柱 / 抓取末端或接触辉光 / 根部或投射口 / 缠绕环或锁定光环", maw: "与核心同视角、同尺度的张口状态"
};

export function assetSize(role: ThemeAssetRole) {
  return role === "background" ? "2560×1440" : role === "core" || role === "maw" ? "1536×1536" : "2048×2048 · 2×2";
}

export function buildThemePrompt(brief: string, family: BuiltInThemeId, zh: boolean, captureStyle?: CaptureStyle) {
  if (family === "minimal") return "Generate only core.png: a centered top-down silver CPU chip with graphite substrate, clear silhouette, pure black background, no text or logo, 1024x1024 PNG. User direction: " + brief + ". The app overlays CPU utilization. Processes use actual app logos; no creature, background or animation atlases are needed.";
  const intro = zh ? "请为 Process Garden 生成一套可导入的主题图片。" : "Create a cohesive importable artwork set for Process Garden.";
  return `${intro}
Theme brief: ${brief.trim() || (zh ? "雨夜玻璃温室，苔藓、雨滴、青绿和琥珀微光，安静精致" : "Rainy glass greenhouse, moss, dew, teal and amber glow, calm and refined")}
Behavior base: ${family}.
Laurel module: when selected, use a braided golden laurel ribbon, acanthus tip, thunderbolt socket and hollow laurel wreath. Crown the target, lift it, then guide it into the deity.
Spear module: capture cells are a COMPLETE horizontal right-pointing thunder spear, radial lightning impact, casting star and dissolution spark burst. Charge at the deity, throw the spear outward, strike the stationary process and dissolve it in place. No retrieval.
Wing module: capture cells are soft horizontal holy light rays, feather star cluster, welcoming paired-wing embrace glow and airy hollow halo. Light bathes the target and guides it into the angel chest, fading in her embrace. No physical tether or weapon.
Art direction: ${themeDirections[family]}
These slots define runtime roles, not mandatory anatomy. Design each theme with its own silhouettes, materials, world and growth metaphor. For process1 and process2, invent eight distinct subjects appropriate to the art direction above; watcher/neural/larva/construct etc. are semantic categories, not required animal shapes. Process3 and process4 are optional extra variants. Pollinators can be drones or ocular familiars. User brief takes precedence over this suggested direction.
Exit animation module: ${captureStyleFor({ id: family, captureStyle })}. Generate refined artwork for capture-atlas.png, with materials matching this module. For beam: the four cells are a straight horizontal volumetric light column, contact flare, projector aperture, and hollow elliptical target halo; no physical cable. The app projects a straight beam, locks the halo and draws the target directly into the core. For vine, generated leafy branches extend from the core and attach to the stationary organism, luminous sap flows along the branches back to the root, then the drained organism turns brown, shrivels and sheds fragments. The four capture cells are a horizontal living branch shaft, a right-facing leafy branching tip, a luminous root socket and an open vine contact loop. For tentacle and cable modules the app bends these generated parts to reach, coil around and retrieve an exiting organism, including Agent tasks and core drop feedback. Do NOT bake an arm, coils, connections or motion frames into core or organism images. Do not substitute schematic line art for polished materials. The reusable animation timing belongs to the program; the visible appendage parts belong to this image atlas.
Process Garden visualizes computer processes as organisms. The program adds live data, process icons, links and animation. Do not paint UI, text, logos, numbers, process names or connecting lines into artwork.
First define a consistent palette, material, camera and light direction. Generate core.png as the style reference, then generate each remaining PNG separately using that reference. If you cannot generate images, deliver a complete standalone English image prompt for every file; never claim files exist when they do not.
Use original artwork with distinct silhouettes legible at 48px. All sprites use uniform pure black #000000 backgrounds (real alpha is also accepted); no floor, cast shadow, gray haze, labels, grid lines, borders, watermark or checkerboard. Keep subject interiors bright enough to survive black removal. Match style across every file.
Background: 2560x1440 suggested. Core and maw: 1536x1536 suggested. Every other file: 2048x2048 square, exact 2x2 equal-cell atlas. Each cell contains one centered isolated subject with at least 12% margins; appendages and glow stay within their cell. Cell order is top-left, top-right, bottom-left, bottom-right. Never merge the set into a contact sheet or poster.
Files:\n${Object.entries(assetSpecs).filter(([role]) => hasMaw(family) || role !== "maw").map(([, spec]) => `- ${spec.file}: ${spec.cells}.`).join("\n")}
Deliver ${hasMaw(family) ? 12 : 11} actual PNG files for a full set including optional process variants when tools permit, reporting real dimensions and completion status. Each file must be ≤8 MiB, whole set ≤64 MiB, sides 64–4096px and total pixels per image ≤9,437,184. Sprites must be even-sided squares; background must be landscape with aspect ratio 1.3–2.4. Report required resizing or compression honestly if your tool cannot meet these limits.
Keep filename labels outside images. Do not generate a manifest or .pgtheme archive: I will upload the PNGs into Process Garden's artwork slots, preview them, then save. The app creates and exports the theme package. Partial replacement is allowed; missing roles inherit built-in artwork. Record the model and reference sources if known, without inventing licensing claims.`;
}
