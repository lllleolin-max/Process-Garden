import type { ProcessSnapshot } from "../types/system";

export const organismStyleIds = ["watcher", "neural", "larva", "construct", "spore", "tendril", "wisp", "agent"] as const;
export type OrganismStyleId = typeof organismStyleIds[number];
export type ProcessCategory = "agent" | "browser" | "editor" | "runtime" | "database" | "container" | "media" | "system" | "compute" | "other";

export const organismStyleOptions: ReadonlyArray<{ id: OrganismStyleId; labelKey: string }> = organismStyleIds.map((id) => ({ id, labelKey: `organisms.styles.${id}` }));

const AGENT_NAMES = ["claude", "codex", "trae", "workbuddy", "workbudy", "cursor-agent", "copilot", "gemini", "aider", "roo", "windsurf"];
const CATEGORY_RULES: Array<[ProcessCategory, string[]]> = [
  ["browser", ["chrome", "msedge", "edge", "firefox", "brave", "opera", "safari", "webview"]],
  ["editor", ["code", "vscode", "idea", "pycharm", "webstorm", "rustrover", "sublime", "notepad", "zed"]],
  ["runtime", ["node", "python", "java", "dotnet", "ruby", "php", "deno", "bun", "rust-analyzer", "vite"]],
  ["database", ["postgres", "mysql", "redis", "mongodb", "sqlite", "mariadb", "sqlservr"]],
  ["container", ["docker", "podman", "containerd", "wsl", "qemu", "vmware", "virtualbox"]],
  ["media", ["spotify", "discord", "slack", "teams", "vlc", "obs", "steam"]],
  ["system", ["system", "explorer", "dwm", "svchost", "terminal", "powershell", "cmd", "windowserver", "finder"]]
];

const CATEGORY_STYLE: Record<ProcessCategory, OrganismStyleId> = {
  agent: "agent", browser: "watcher", editor: "neural", runtime: "larva", database: "spore",
  container: "construct", media: "wisp", system: "tendril", compute: "construct", other: "spore"
};

export function normalizeProcessName(name: string) {
  return name.toLowerCase().replace(/\.exe$/i, "").trim();
}

export function isAgentProcess(process: Pick<ProcessSnapshot, "name" | "command" | "executablePath">) {
  const haystack = [process.name, process.command, process.executablePath].filter(Boolean).join(" ").toLowerCase();
  return AGENT_NAMES.some((name) => haystack.includes(name));
}

export function classifyProcess(process: ProcessSnapshot): ProcessCategory {
  if (isAgentProcess(process)) return "agent";
  const name = normalizeProcessName(process.name);
  const matched = CATEGORY_RULES.find(([, needles]) => needles.some((needle) => name.includes(needle)));
  if (matched) return matched[0];
  if (process.cpuPercent >= 18 || (process.threadCount ?? 0) >= 80) return "compute";
  return "other";
}

export function resolveOrganismStyle(process: ProcessSnapshot, overrides: Record<string, OrganismStyleId>) {
  return overrides[normalizeProcessName(process.name)] ?? CATEGORY_STYLE[classifyProcess(process)];
}

export function isOrganismStyleId(value: unknown): value is OrganismStyleId {
  return typeof value === "string" && (organismStyleIds as readonly string[]).includes(value);
}

export function sanitizeOrganismStyleOverrides(input: unknown): Record<string, OrganismStyleId> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return Object.fromEntries(Object.entries(input).filter(([name, style]) => name.length <= 128 && isOrganismStyleId(style)).map(([name, style]) => [normalizeProcessName(name), style]));
}

export function organismVisualIndex(style: OrganismStyleId) {
  return organismStyleIds.indexOf(style);
}

export function organismVariantIndex(process: Pick<ProcessSnapshot, "pid" | "name">, variantCount: number) {
  if (variantCount <= 1) return 0;
  let hash = Math.floor(Math.abs(process.pid) / 4) >>> 0;
  for (const character of normalizeProcessName(process.name)) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  return hash % variantCount;
}

export function agentEmbryoStage(process: ProcessSnapshot, now: number): 0 | 1 | 2 {
  if (!Number.isFinite(process.startedAt) || process.startedAt <= 0 || !Number.isFinite(now)) return 0;
  const startedAtMs = process.startedAt > 10_000_000_000 ? process.startedAt : process.startedAt * 1000;
  const ageSeconds = Math.max(0, (now - startedAtMs) / 1000);
  if (ageSeconds < 45) return 0;
  if (ageSeconds < 240) return 1;
  return 2;
}
