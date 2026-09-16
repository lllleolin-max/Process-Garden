import { useAppStore } from "../stores/appStore";
import { useFeedHealth } from "../stores/feedHealth";
import { useEffect, useState } from "react";

export function snapshotStatusLabel(collector: "demo" | "native", paused: boolean, failed: boolean, locale: "zh-CN" | "en-US") {
  const zh = locale === "zh-CN";
  if (collector === "demo") return paused ? zh ? "演示 · 已暂停" : "Demo · paused" : zh ? "演示" : "Demo";
  if (failed) return zh ? "数据已过期" : "Stale data";
  if (paused) return zh ? "已暂停" : "Paused";
  return zh ? "实时" : "Live";
}

/** Label the displayed observation, not merely the user's requested source. */
export function useSnapshotStatus() {
  const collector = useAppStore(state => state.collector);
  const paused = useAppStore(state => state.paused);
  const locale = useAppStore(state => state.locale);
  const failed = useFeedHealth(state => state.failed);
  const lastSuccess = useFeedHealth(state => state.lastSuccess);
  const samplingMs = useAppStore(state => state.samplingMs);
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (collector !== "native" || paused || lastSuccess === null) { setExpired(false); return; }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      clearTimeout(timer);
      const age = Date.now() - lastSuccess;
      const threshold = Number.isFinite(samplingMs) ? Math.max(5000, samplingMs * 3) : 5000;
      const remaining = threshold - age;
      // A clock rollback makes the previous wall-clock observation ambiguous;
      // do not extend its apparent freshness or overflow the browser timer.
      const stale = !Number.isFinite(age) || age < 0 || remaining <= 0;
      setExpired(stale);
      if (!stale && !document.hidden) timer = setTimeout(check, Math.min(remaining, 2_147_483_647));
    };
    check();
    document.addEventListener("visibilitychange", check);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", check); };
  }, [collector, paused, lastSuccess, samplingMs]);
  return snapshotStatusLabel(collector, paused, failed || expired, locale);
}
