import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { processIdentity } from "../animation/processIdentity";
import { observedParent } from "../data/processRelations";
import { useAppStore } from "../stores/appStore";
import type { ProcessSnapshot } from "../types/system";
import { ProcessIcon } from "./ProcessIcon";
import "./ChildProcesses.css";

const PAGE_SIZE = 8;

/** Current snapshot relationships only; never authority for tree termination. */
export function ChildProcesses({ process, processes, locale }: {
  process: ProcessSnapshot; processes: ProcessSnapshot[]; locale: "zh-CN" | "en-US";
}) {
  const collector = useAppStore(state => state.collector);
  const zh = locale === "zh-CN";
  const children = useMemo(() => processes.filter(child => child.status !== "dead"
    && observedParent(child, [process]) !== null).sort((a, b) => a.pid - b.pid), [process, processes]);
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(children.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  useEffect(() => { setPage(previous => Math.min(previous, pages - 1)); }, [pages]);
  const select = (event: MouseEvent<HTMLButtonElement>, child: ProcessSnapshot) => {
    const live = useAppStore.getState();
    if (live.collector !== collector || live.selectedPid !== process.pid) return;
    const parent = live.snapshot.processes.find(item => item.pid === process.pid);
    const target = live.snapshot.processes.find(item => item.pid === child.pid);
    if (!parent || !target || target.status === "dead"
      || processIdentity(parent) !== processIdentity(process)
      || processIdentity(target) !== processIdentity(child)
      || !observedParent(target, [parent])) return;
    event.currentTarget.closest<HTMLElement>(".inspector")?.focus({ preventScroll: true });
    live.setSelectedPid(target.pid);
  };
  return <section className="path-card child-processes" aria-label={zh ? "子进程" : "Child processes"}>
    <span>{zh ? "子进程 · 当前快照" : "Child processes · current snapshot"} · {children.length}</span>
    <small>{zh ? "按父 PID 和启动时间推断，不代表完整历史进程树。" : "Inferred from parent PID and start time, not a complete historical tree."}</small>
    {children.length ? <ul>{children.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE).map(child =>
      <li key={processIdentity(child)}><button className="icon-button text-button" onClick={event => select(event, child)}
        aria-label={zh ? `查看 ${child.name}，PID ${child.pid}` : `Inspect ${child.name}, PID ${child.pid}`}>
        <ProcessIcon process={child} /><span>{child.name}</span><small>PID {child.pid}</small>
      </button></li>)}</ul> : <code>{zh ? "当前快照中没有可确认的子进程" : "No confirmed children in this snapshot"}</code>}
    {pages > 1 && <nav aria-label={zh ? "子进程分页" : "Child process pages"}>
      <button className="icon-button text-button" disabled={current === 0} onClick={() => setPage(current - 1)}>{zh ? "上一页" : "Previous"}</button>
      <small>{current + 1} / {pages}</small>
      <button className="icon-button text-button" disabled={current + 1 === pages} onClick={() => setPage(current + 1)}>{zh ? "下一页" : "Next"}</button>
    </nav>}
  </section>;
}
