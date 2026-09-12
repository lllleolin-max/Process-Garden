import {
  siClaude,
  siClaudecode,
  siDiscord,
  siDocker,
  siGithubcopilot,
  siGnometerminal,
  siGooglechrome,
  siNodedotjs,
  siPostgresql,
  siPython,
  siRust,
  siSpotify,
  siVite,
  siVscodium,
  type SimpleIcon
} from "simple-icons";

function iconDataUrl(icon: SimpleIcon) {
  const red = parseInt(icon.hex.slice(0, 2), 16);
  const green = parseInt(icon.hex.slice(2, 4), 16);
  const blue = parseInt(icon.hex.slice(4, 6), 16);
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  const fill = luminance < 72 ? "DDF6E8" : icon.hex;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img" aria-label="${icon.title}"><path fill="#${fill}" d="${icon.path}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const iconCatalog: Array<{ names: string[]; icon: SimpleIcon }> = [
  { names: ["chrome", "google chrome", "chrome helper", "webview2"], icon: siGooglechrome },
  { names: ["code", "visual studio code", "vscode", "vscodium"], icon: siVscodium },
  { names: ["node", "nodejs", "node.js", "npm"], icon: siNodedotjs },
  { names: ["spotify"], icon: siSpotify },
  { names: ["postgres", "postgresql"], icon: siPostgresql },
  { names: ["docker", "docker desktop"], icon: siDocker },
  { names: ["python", "python3", "pythonw"], icon: siPython },
  { names: ["discord"], icon: siDiscord },
  { names: ["rust", "rust-analyzer", "cargo", "rustc"], icon: siRust },
  { names: ["vite"], icon: siVite },
  { names: ["codex", "github copilot", "copilot"], icon: siGithubcopilot },
  { names: ["claude"], icon: siClaude },
  { names: ["claude code", "claudecode"], icon: siClaudecode },
  { names: ["terminal", "windows terminal", "powershell", "pwsh", "cmd"], icon: siGnometerminal }
];

const fallbacks = new Map(iconCatalog.flatMap(({ names, icon }) => names.map((name) => [name, iconDataUrl(icon)] as const)));

function customIconDataUrl(label: string, path: string, color = "8EF0BC") {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img" aria-label="${label}"><path fill="none" stroke="#${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="${path}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const agentBrain = customIconDataUrl("AI agent", "M12 4.2c-1.4-1.6-4.4-.7-4.4 1.6-2.5-.5-4 2.5-2.2 4.2-1.8 1.8-.3 4.8 2.2 4.2 0 2.3 3 3.2 4.4 1.6m0-11.6c1.4-1.6 4.4-.7 4.4 1.6 2.5-.5 4 2.5 2.2 4.2 1.8 1.8.3 4.8-2.2 4.2 0 2.3-3 3.2-4.4 1.6m0-11.6v11.6M8.3 8.2l3.7 2.1 3.7-2.1M8.4 13.4l3.6-2 3.6 2");
const explorerFolder = customIconDataUrl("File Explorer", "M3.5 7.2h6l1.7 2h9.3v8.3a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5zM3.5 9.2h17", "F3C85B");
const systemGear = customIconDataUrl("System", "M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6zm0-4.2 1 2.1 2.2.7 2-1 1.9 1.9-1 2 .7 2.2 2.1 1v2.6l-2.1 1-.7 2.2 1 2-1.9 1.9-2-1-2.2.7-1 2.1H9.4l-1-2.1-2.2-.7-2 1-1.9-1.9 1-2-.7-2.2-2.1-1V12l2.1-1 .7-2.2-1-2 1.9-1.9 2 1 2.2-.7 1-2.1z");
for (const name of ["trae", "workbuddy", "workbudy", "agent", "agent-runner"]) fallbacks.set(name, agentBrain);
fallbacks.set("explorer", explorerFolder);
fallbacks.set("explorer.exe", explorerFolder);
fallbacks.set("system", systemGear);

export function processIconFallback(name: string) {
  const normalized = name.toLocaleLowerCase().replace(/\.exe$/, "").trim();
  return fallbacks.get(normalized) ?? null;
}
