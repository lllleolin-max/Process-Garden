import { useAppStore } from "../stores/appStore";
import { useFeedHealth } from "../stores/feedHealth";

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
  return snapshotStatusLabel(collector, paused, failed, locale);
}
