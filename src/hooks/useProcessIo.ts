import { useEffect, useState } from "react";
import { useAppStore } from "../stores/appStore";

export interface IoRates { readBytesPerSecond: number; writtenBytesPerSecond: number }
type IoState = { status: "unavailable" | "paused" | "baseline" | "live" | "error"; rates: IoRates | null; history: IoRates[] };
const empty = (status: IoState["status"]): IoState => ({ status, rates: null, history: [] });
// Across selection/unmount/remount, at most one native request is outstanding.
let pending: Promise<unknown> | null = null;

export function useProcessIo(pid: number, startedAt: number) {
  const paused = useAppStore(s => s.paused);
  const demo = useAppStore(s => s.demoMode || s.collector !== "native");
  const windowed = useAppStore(s => s.displayMode === "windowed");
  const [state, setState] = useState<IoState>(() => empty("unavailable"));
  useEffect(() => {
    let generation = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const supported = !demo && "__TAURI_INTERNALS__" in window && Number.isInteger(pid) && pid > 0
      && Number.isFinite(startedAt) && startedAt > 0;
    const start = () => {
      const run = ++generation;
      clearTimeout(timer); clearTimeout(watchdog);
      if (!supported) { setState(empty("unavailable")); return; }
      if (paused || !windowed || document.hidden) { setState(empty("paused")); return; }
      setState(empty("baseline"));
      let session = crypto.randomUUID();
      const poll = async () => {
        let expired = false;
        watchdog = setTimeout(() => {
          expired = true;
          if (generation === run) { session = crypto.randomUUID(); setState(empty("error")); }
        }, 5000);
        try {
          // Multiple waiters can wake from the same completed request. Recheck
          // the slot after each await so only one can acquire it next.
          while (pending) {
            await pending.catch(() => undefined);
            if (generation !== run || expired) return;
          }
          if (generation !== run || expired) return;
          const task = import("@tauri-apps/api/core").then(({ invoke }) => {
            // Loading the bridge is asynchronous too. Selection/visibility may
            // have invalidated this poll before a native request even started.
            if (generation !== run || expired || document.hidden) return null;
            return invoke<IoRates | null>("sample_process_io", {
              pid, startedAt: Math.floor(startedAt > 10_000_000_000 ? startedAt / 1000 : startedAt), session,
            });
          });
          pending = task;
          let result: IoRates | null;
          try { result = await task; } finally { if (pending === task) pending = null; }
          if (generation !== run || expired) return;
          if (result === null) { setState(empty("baseline")); return; }
          if (![result.readBytesPerSecond, result.writtenBytesPerSecond].every(value => Number.isFinite(value) && value >= 0)) throw new Error("invalid I/O rates");
          setState(previous => ({ status: "live", rates: result, history: [...previous.history, result].slice(-36) }));
        } catch {
          if (generation === run) setState(empty("error"));
        } finally {
          if (generation === run) {
            clearTimeout(watchdog);
            timer = setTimeout(poll, 1000);
          }
        }
      };
      void poll();
    };
    start();
    document.addEventListener("visibilitychange", start);
    return () => { generation++; clearTimeout(timer); clearTimeout(watchdog); document.removeEventListener("visibilitychange", start); };
  }, [pid, startedAt, paused, demo, windowed]);
  return state;
}
