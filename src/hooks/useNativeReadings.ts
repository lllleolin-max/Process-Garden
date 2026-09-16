import { useEffect, useState } from "react";
import { useAppStore } from "../stores/appStore";

export type NativeStatus = "unavailable" | "paused" | "baseline" | "live" | "error" | "empty";
export interface NativeReadingState<T> { status: NativeStatus; reading: T | null; history: T[]; session: string; stale: boolean }

/** One admission channel per provider, shared across mount lifetimes. */
export function createNativeReadings<T>(command: string, parse: (value: unknown) => T, classify: (reading: T) => NativeStatus) {
  const empty = (status: NativeStatus, session = ""): NativeReadingState<T> => ({ status, reading: null, history: [], session, stale: false });
  let pending: Promise<unknown> | null = null;
  return function useNativeReadings(): NativeReadingState<T> {
  const paused = useAppStore(s => s.paused);
  const native = useAppStore(s => !s.demoMode && s.collector === "native");
  const windowed = useAppStore(s => s.displayMode === "windowed");
  const [state, setState] = useState<NativeReadingState<T>>(() => empty(
    !native || !("__TAURI_INTERNALS__" in window) ? "unavailable"
      : paused || !windowed || document.hidden ? "paused" : "baseline"));
  useEffect(() => {
    let generation = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const retain = (status: NativeStatus, session = "") => setState(previous => previous.reading !== null
      ? { ...previous, status, stale: true } : empty(status, session));
    const start = () => {
      const run = ++generation;
      clearTimeout(timer); clearTimeout(watchdog);
      if (!native || !("__TAURI_INTERNALS__" in window)) { setState(empty("unavailable")); return; }
      if (paused || !windowed || document.hidden) { retain("paused"); return; }
      let session = crypto.randomUUID();
      retain("baseline", session);
      const poll = async () => {
        let expired = false;
        watchdog = setTimeout(() => {
          expired = true;
          if (generation === run) { session = crypto.randomUUID(); retain("error", session); }
        }, 5000);
        try {
          while (pending) {
            await pending.catch(() => undefined);
            if (generation !== run || expired) return;
          }
          if (generation !== run || expired) return;
          const task = import("@tauri-apps/api/core").then(({ invoke }) => {
            if (generation !== run || expired || document.hidden) return null;
            return invoke<unknown>(command, { session });
          });
          pending = task;
          let response: unknown;
          try { response = await task; } finally { if (pending === task) pending = null; }
          if (generation !== run || expired) return;
          const reading = parse(response);
          const status = classify(reading);
          setState(previous => ({ status, reading, session, stale: false,
            history: [...(previous.stale || previous.session !== session ? [] : previous.history), reading].slice(-36) }));
        } catch {
          // Keep the session after ordinary errors: a PDH rate's first invalid
          // sample needs a subsequent collection, not perpetual reinitialization.
          if (generation === run && !expired) retain("error", session);
        } finally {
          if (generation === run) { clearTimeout(watchdog); timer = setTimeout(poll, 1000); }
        }
      };
      void poll();
    };
    start();
    document.addEventListener("visibilitychange", start);
    return () => { generation++; clearTimeout(timer); clearTimeout(watchdog); document.removeEventListener("visibilitychange", start); };
  }, [native, paused, windowed]);
  return state;
};
}
