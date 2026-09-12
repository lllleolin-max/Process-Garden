import { create } from "zustand";
import type { ProcessSnapshot } from "../types/system";

interface ProcessIconState {
  icons: Record<string, string | null>;
  mergeIcons: (entries: Array<{ key: string; dataUrl: string | null }>) => void;
}

export function processIconKey(process: Pick<ProcessSnapshot, "name" | "executablePath">) {
  return process.executablePath?.toLowerCase() ?? `name:${process.name.toLowerCase()}`;
}

export const useProcessIconStore = create<ProcessIconState>((set) => ({
  icons: {},
  mergeIcons: (entries) => set((state) => {
    const changed = entries.filter((entry) => !(entry.key in state.icons) || state.icons[entry.key] !== entry.dataUrl);
    if (!changed.length) return state;
    const icons = { ...state.icons };
    for (const entry of changed) icons[entry.key] = entry.dataUrl;
    return { icons };
  })
}));
