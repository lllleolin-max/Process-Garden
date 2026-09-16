import { useEffect, useRef } from "react";
import { makeDemoSnapshot } from "../data/demo";
import { useAppStore } from "../stores/appStore";
import { useFeedHealth } from "../stores/feedHealth";
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
    if (demoMode) useFeedHealth.setState({ failed: false, stalled: false, lastSuccess: null });
    if (paused) return;
    let active = true;
    let sampling = false;
    let visibilityVersion = 0;
    let timer: number | undefined;
    let watchdog: number | undefined;
    const interval = displayMode === "wallpaper" ? Math.max(2_000, samplingMs) : samplingMs;
    const watchPending = () => {
      window.clearTimeout(watchdog);
      if (demoMode || !isTauriRuntime()) return;
      watchdog = window.setTimeout(() => {
        if (active && sampling && !document.hidden && !useAppStore.getState().paused) {
          useFeedHealth.setState({ failed: true, stalled: true });
        }
      }, Math.max(5_000, interval * 3));
    };

    const sample = async () => {
      if (!active || document.hidden || sampling) return;
      sampling = true;
      watchPending();
      // A preference change can restart the effect while a native request is still
      // running. Wait for it to finish before starting the replacement request.
      if (inFlight.current) await inFlight.current;
      if (!active || document.hidden) { sampling = false; window.clearTimeout(watchdog); return; }
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
            if (canIngest()) {
              ingestSnapshot(snapshot, "native");
              useFeedHealth.setState({ failed: false, stalled: false, lastSuccess: snapshot.timestamp });
            }
            return;
          } catch {
            // A native collection failure must not replace real processes with
            // simulated ones. Keep the last observation and retry on schedule.
            if (canIngest()) useFeedHealth.setState({ failed: true, stalled: false });
            return;
          }
        }
        if (canIngest()) ingestSnapshot(makeDemoSnapshot(tick.current), "demo");
      };
      const request = collect();
      inFlight.current = request;
      try {
        await request;
      } finally {
        window.clearTimeout(watchdog);
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
      window.clearTimeout(watchdog);
      if (!document.hidden) {
        if (sampling) watchPending();
        else void sample();
      }
    };

    void sample();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      window.clearTimeout(timer);
      window.clearTimeout(watchdog);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [demoMode, displayMode, ingestSnapshot, paused, samplingMs]);
}
