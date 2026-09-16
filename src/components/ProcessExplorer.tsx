import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useOverlay } from "../hooks/useOverlay";
import { useSnapshotStatus } from "../hooks/useSnapshotStatus";
import { useAppStore } from "../stores/appStore";
import { isObservedCount, isObservedMetric, isObservedPercent, queryProcesses, type ProcessSort } from "../data/processTable";
import { processIdentity } from "../animation/processIdentity";
import { formatBytes, formatPercent } from "../i18n/formatters";
import { ProcessIcon } from "./ProcessIcon";
import { AnimatedMetric } from "./AnimatedMetric";
import type { ProcessSnapshot } from "../types/system";
import "./ProcessExplorer.css";

const PAGE_SIZE = 50;
export function ProcessExplorer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const snapshotStatus = useSnapshotStatus();
  const { t } = useTranslation();
  const overlay = useOverlay(open, onClose, { restoreFocusSelector: "[data-process-list-trigger]", initialFocusSelector: "[data-process-filter]" });
  const state = useAppStore(useShallow(s => ({ snapshot: overlay.present ? s.snapshot : null, locale: s.locale, selectedPid: s.selectedPid, setSelectedPid: s.setSelectedPid, paused: s.paused, setPaused: s.setPaused, collector: s.collector })));
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ProcessSort>("cpuPercent");
  const [ascending, setAscending] = useState(false);
  const [page, setPage] = useState(0);
  const [heldOrder, setHeldOrder] = useState<{ collector: string; ids: string[] } | null>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const formatCpu = useCallback((value: number) => formatPercent(value, state.locale, 1), [state.locale]);
  const formatMemory = useCallback((value: number) => formatBytes(value, state.locale), [state.locale]);
  const sortedRows = useMemo(() => state.snapshot ? queryProcesses(state.snapshot.processes, query, sort, ascending, state.locale) : [], [state.snapshot, query, sort, ascending, state.locale]);
  const orderHeld = heldOrder !== null && heldOrder.collector === state.collector;
  const rows = useMemo(() => {
    if (!orderHeld || !heldOrder) return sortedRows;
    const remaining = new Map(sortedRows.map(process => [processIdentity(process), process]));
    const stable: ProcessSnapshot[] = [];
    for (const id of heldOrder.ids) {
      const process = remaining.get(id);
      if (process) { stable.push(process); remaining.delete(id); }
    }
    // New lifetimes append; departed lifetimes are discarded, never cached.
    return stable.concat([...remaining.values()]);
  }, [sortedRows, heldOrder, orderHeld]);
  useEffect(() => {
    if (!overlay.present || !state.snapshot || !orderHeld) {
      setHeldOrder(null);
      return;
    }
    const ids = rows.map(processIdentity);
    setHeldOrder(previous => previous && previous.ids.length === ids.length
      && previous.ids.every((id, index) => id === ids[index])
      ? previous : { collector: state.collector, ids });
  }, [rows, orderHeld, state.collector, overlay.present, state.snapshot]);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  useEffect(() => {
    // Commit the visible clamp so a later sample cannot resurrect a stale page.
    if (state.snapshot) setPage(previous => Math.min(previous, pageCount - 1));
  }, [pageCount, state.snapshot]);
  if (!overlay.present || !state.snapshot) return null;
  const currentPage = Math.min(page, pageCount - 1);
  const shown = rows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const missing = Math.max(0, state.snapshot.processCount - state.snapshot.processes.length);
  const columns: { key: ProcessSort; label: string }[] = [
    { key: "name", label: t("processList.name") }, { key: "pid", label: "PID" },
    { key: "cpuPercent", label: "CPU" }, { key: "memoryBytes", label: t("metrics.memory") },
    { key: "threadCount", label: t("metrics.threads") }
  ];
  const turnPage = (next: number) => { setPage(next); if (scroll.current) scroll.current.scrollTop = 0; };
  const inspectProcess = (rendered: ProcessSnapshot) => {
    const current = useAppStore.getState();
    // PID/start-time identities are only meaningful within one data source.
    // A demo row must never target a native process after a source handover.
    if (current.collector !== state.collector) return;
    const live = current.snapshot.processes.find(process => process.pid === rendered.pid);
    if (!live || processIdentity(live) !== processIdentity(rendered)) return;
    current.setSelectedPid(live.pid);
    onClose();
  };
  return <div className="modal-backdrop process-list-backdrop" data-overlay-root="modal" data-state={overlay.state} aria-hidden={!open} inert={!open}>
    <section className="process-explorer" ref={overlay.surfaceRef} role="dialog" aria-modal="true" aria-labelledby="process-list-title" tabIndex={-1}>
      <header><div><small>{snapshotStatus}</small><h2 id="process-list-title">{t("processList.title")}</h2></div><button className="icon-button" aria-label={t("a11y.closePanel")} onClick={onClose}><X size={18} /></button></header>
      <div className="process-list-tools"><label>{t("processList.filter")}<input data-process-filter value={query} onChange={event => { setQuery(event.target.value); setHeldOrder(null); turnPage(0); }} placeholder={t("processList.filterHint")} /></label><button className="process-list-control" aria-pressed={orderHeld} aria-describedby={orderHeld ? "process-order-hint" : undefined} onClick={() => setHeldOrder(orderHeld ? null : { collector: state.collector, ids: rows.map(processIdentity) })}>{state.locale === "zh-CN" ? "固定行顺序" : "Keep row order"}</button><button className="process-list-control" aria-pressed={state.paused} onClick={() => state.setPaused(!state.paused)}>{t(state.paused ? "nav.resume" : "nav.pause")}</button></div>
      {orderHeld && <p id="process-order-hint" className="process-list-summary">{state.locale === "zh-CN" ? "数值继续更新，新进程追加到末尾。更改筛选或排序将解除固定。" : "Readings still update; new processes append. Changing the filter or sort releases the order."}</p>}
      <p className="process-list-summary">{t("processList.count", { count: rows.length, received: state.snapshot.processes.length, total: state.snapshot.processCount })}</p>
      {missing > 0 && <p className="process-list-warning" role="status">{t("processList.partial", { count: missing })}</p>}
      <div className="process-list-scroll" ref={scroll} tabIndex={0} aria-label={t("processList.title")}>
        <table><caption className="sr-only">{t("processList.title")}</caption><thead><tr>{columns.map(column => <th key={column.key} scope="col" aria-sort={!orderHeld && sort === column.key ? ascending ? "ascending" : "descending" : "none"}><button onClick={() => { setHeldOrder(null); setSort(column.key); setAscending(sort === column.key ? !ascending : column.key === "name" || column.key === "pid"); turnPage(0); }}>{column.label}<span aria-hidden="true">{!orderHeld && sort === column.key ? ascending ? " ↑" : " ↓" : ""}</span></button></th>)}<th scope="col">{t("inspector.path")}</th></tr></thead>
          <tbody>{shown.map(process => <tr key={`${state.collector}:${processIdentity(process)}`} className={process.pid === state.selectedPid ? "selected" : undefined}><td><button className="process-list-select" aria-label={t("processList.inspect", { name: process.name, pid: process.pid })} onClick={() => inspectProcess(process)}><ProcessIcon process={process} /><span>{process.name}</span></button></td><td>{process.pid}</td><td><AnimatedMetric active={open} value={isObservedPercent(process.cpuPercent) ? process.cpuPercent : NaN} format={formatCpu} /></td><td><AnimatedMetric active={open} value={isObservedMetric(process.memoryBytes) ? process.memoryBytes : NaN} format={formatMemory} /></td><td>{isObservedCount(process.threadCount) ? process.threadCount : "—"}</td><td className="process-list-path" title={process.executablePath}>{process.executablePath || "—"}</td></tr>)}</tbody>
        </table>{!rows.length && <p className="process-list-empty">{t(query.trim() ? "processList.noMatches" : "processList.noData")}</p>}
      </div>
      <footer><button className="process-list-control" disabled={currentPage === 0} onClick={() => turnPage(currentPage - 1)}>{t("processList.previous")}</button><span>{t("processList.page", { page: currentPage + 1, pages: pageCount })}</span><button className="process-list-control" disabled={currentPage + 1 >= pageCount} onClick={() => turnPage(currentPage + 1)}>{t("processList.next")}</button></footer>
    </section>
  </div>;
}
