import { useEffect, useRef } from "react";
import { makeDemoSnapshot } from "../data/demo";
import { useAppStore } from "../stores/appStore";
import type { SystemSnapshot } from "../types/system";

function isTauriRuntime() {
  return "__TAURI_INTERNALS__" in window;
}

export function useSystemFeed() {
  const demoMode = useAppStore((state) => state.demoMode);
  const paused = useAppStore((state) => state.paused);
  const samplingMs = useAppStore((state) => state.samplingMs);
  const displayMode = useAppStore((state) => state.displayMode);
  const ingestSnapshot = useAppStore((state) => state.ingestSnapshot);
  const tick = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (paused) return;
    let active = true;
    let sampling = false;
    let visibilityVersion = 0;
    let timer: number | undefined;
    const interval = displayMode === "wallpaper" ? Math.max(2_000, samplingMs) : samplingMs;

    const sample = async () => {
      if (!active || document.hidden || sampling) return;
      sampling = true;
      // A preference change can restart the effect while a native request is still
      // running. Wait for it to finish before starting the replacement request.
      if (inFlight.current) await inFlight.current;
      if (!active || document.hidden) { sampling = false; return; }
      const startedAt = performance.now();
      const version = visibilityVersion;
      const canIngest = () => active && !document.hidden && version === visibilityVersion && !useAppStore.getState().paused;
      const collect = async () => {
        tick.current += 1;
        if (!demoMode && isTauriRuntime()) {
          try {
            const { invoke } = await import("@tauri-apps/api/core");
            if (!canIngest()) return;
            const snapshot = await invoke<SystemSnapshot>("sample_system");
            if (canIngest()) ingestSnapshot(snapshot, "native");
            return;
          } catch {
            // A restricted process table should never break the visual experience.
          }
        }
        if (canIngest()) ingestSnapshot(makeDemoSnapshot(tick.current), "demo");
      };
      const request = collect();
      inFlight.current = request;
      try {
        await request;
      } finally {
        if (inFlight.current === request) inFlight.current = null;
        sampling = false;
        if (active && !document.hidden) {
          timer = window.setTimeout(() => void sample(), version === visibilityVersion ? Math.max(0, interval - (performance.now() - startedAt)) : 0);
        }
      }
    };

    const onVisibilityChange = () => {
      visibilityVersion += 1;
      window.clearTimeout(timer);
      if (!document.hidden) void sample();
    };

    void sample();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [demoMode, displayMode, ingestSnapshot, paused, samplingMs]);
}
