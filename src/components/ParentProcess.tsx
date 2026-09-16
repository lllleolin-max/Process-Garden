import { processIdentity } from "../animation/processIdentity";
import { observedParent } from "../data/processRelations";
import { useAppStore } from "../stores/appStore";
import type { ProcessSnapshot } from "../types/system";
import type { MouseEvent } from "react";

export function ParentProcess({ process, processes, locale }: {
  process: ProcessSnapshot; processes: ProcessSnapshot[]; locale: "zh-CN" | "en-US";
}) {
  const collector = useAppStore(state => state.collector);
  const parent = observedParent(process, processes);
  const zh = locale === "zh-CN";
  const selectParent = (event: MouseEvent<HTMLButtonElement>) => {
    const current = useAppStore.getState();
    if (current.collector !== collector || current.selectedPid !== process.pid) return;
    const child = current.snapshot.processes.find(item => item.pid === process.pid);
    if (!parent || !child || processIdentity(child) !== processIdentity(process)) return;
    const latestParent = observedParent(child, current.snapshot.processes);
    if (latestParent && processIdentity(latestParent) === processIdentity(parent)) {
      event.currentTarget.closest<HTMLElement>(".inspector")?.focus({ preventScroll: true });
      current.setSelectedPid(parent.pid);
    }
  };
  return <section className="path-card">
    <span>{zh ? "父进程 · 当前快照" : "Parent process · current snapshot"}</span>
    {parent ? <button className="icon-button text-button" onClick={selectParent}
      title={zh ? "按父 PID 和启动时间推断，不代表完整历史关系" : "Inferred from parent PID and start time, not a complete historical relationship"}>
      {parent.name} · PID {parent.pid}
    </button> : <code>{process.parentPid === undefined ? (zh ? "未提供父进程信息" : "Parent information unavailable")
      : `PID ${process.parentPid} · ${zh ? "无法确认当前父进程" : "Current parent cannot be confirmed"}`}</code>}
  </section>;
}
