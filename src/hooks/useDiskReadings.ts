import { useEffect, useState } from "react";
import { useAppStore } from "../stores/appStore";
import { diskFields, parseDiskReadings, type DiskReading } from "../data/diskReadings";

type Status = "unavailable" | "paused" | "baseline" | "live" | "error" | "empty";
export interface DiskState { status: Status; rows: DiskReading[]; history: DiskReading[][]; session: string }
const empty = (status: Status, session = ""): DiskState => ({ status, rows: [], history: [], session });
let pending: Promise<unknown> | null = null;

/** Demand-driven: mounted only while the disk panel is expanded and windowed. */
export function useDiskReadings(): DiskState {
  const paused = useAppStore(s => s.paused);
  const native = useAppStore(s => !s.demoMode && s.collector === "native");
  const windowed = useAppStore(s => s.displayMode === "windowed");
  const [state, setState] = useState<DiskState>(() => empty(
    !native || !("__TAURI_INTERNALS__" in window) ? "unavailable"
      : paused || !windowed || document.hidden ? "paused" : "baseline"));
  useEffect(() => {
    let generation = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      const run = ++generation;
      clearTimeout(timer); clearTimeout(watchdog);
      if (!native || !("__TAURI_INTERNALS__" in window)) { setState(empty("unavailable")); return; }
      if (paused || !windowed || document.hidden) { setState(empty("paused")); return; }
      let session = crypto.randomUUID();
      setState(empty("baseline", session));
      const poll = async () => {
        let expired = false;
        watchdog = setTimeout(() => {
          expired = true;
          if (generation === run) { session = crypto.randomUUID(); setState(empty("error", session)); }
        }, 5000);
        try {
          while (pending) {
            await pending.catch(() => undefined);
            if (generation !== run || expired) return;
          }
          if (generation !== run || expired) return;
          const task = import("@tauri-apps/api/core").then(({ invoke }) => {
            if (generation !== run || expired || document.hidden) return null;
            return invoke<unknown>("sample_disks", { session });
          });
          pending = task;
          let response: unknown;
          try { response = await task; } finally { if (pending === task) pending = null; }
          if (generation !== run || expired) return;
          const rows = parseDiskReadings(response);
          const status: Status = !rows.length ? "empty" : rows.some(row => diskFields.some(field => row[field] !== null)) ? "live" : "baseline";
          setState(previous => ({ status, rows, session, history: [...previous.history, rows].slice(-36) }));
        } catch {
          // Keep the session after ordinary errors: a PDH rate's first invalid
          // sample needs a subsequent collection, not perpetual reinitialization.
          if (generation === run && !expired) setState(empty("error", session));
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
}
