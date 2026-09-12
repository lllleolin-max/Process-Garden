import { useEffect } from "react";
import { processIconFallback } from "../icons/processIconFallbacks";
import { processIconKey, useProcessIconStore } from "../stores/processIconStore";
import type { ProcessSnapshot } from "../types/system";

interface IconResult {
  key: string;
  dataUrl: string | null;
}

const pending = new Set<string>();
const nativeResolved = new Set<string>();

export function useProcessIcons(processes: ProcessSnapshot[]) {
  const mergeIcons = useProcessIconStore((state) => state.mergeIcons);

  useEffect(() => {
    const icons = useProcessIconStore.getState().icons;
    const processByKey = new Map(processes.map((process) => [processIconKey(process), process] as const));
    const fallbackEntries = [...processByKey.entries()]
      .filter(([key]) => !(key in icons))
      .map(([key, process]) => ({ key, dataUrl: processIconFallback(process.name) }));
    if (fallbackEntries.length) mergeIcons(fallbackEntries);
    if (!("__TAURI_INTERNALS__" in window)) return;
    const requests = [...processByKey.values()]
      .filter((process) => process.executablePath)
      .map((process) => ({ key: processIconKey(process), executablePath: process.executablePath! }))
      .filter((request) => !nativeResolved.has(request.key) && !pending.has(request.key))
      .slice(0, 48);
    if (!requests.length) return;

    requests.forEach((request) => pending.add(request.key));
    void import("@tauri-apps/api/core")
      .then(({ invoke }) => invoke<IconResult[]>("process_icons", { requests }))
      .then((results) => {
        // This cache is shared by all consumers. A sample rerender or unmount
        // must not discard a valid result and permanently resolve its key.
        results.forEach((result) => nativeResolved.add(result.key));
        mergeIcons(results.map((result) => ({
          ...result,
          dataUrl: result.dataUrl ?? processIconFallback(processByKey.get(result.key)?.name ?? "")
        })));
      })
      .catch(() => { /* Keep fallbacks and retry on the next process sample. */ })
      .finally(() => requests.forEach((request) => {
        pending.delete(request.key);
      }));
  }, [mergeIcons, processes]);
}
