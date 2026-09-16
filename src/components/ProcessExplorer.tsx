import { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useOverlay } from "../hooks/useOverlay";
import { useSnapshotStatus } from "../hooks/useSnapshotStatus";
import { useAppStore } from "../stores/appStore";
import { isObservedMetric, queryProcesses, type ProcessSort } from "../data/processTable";
import { processIdentity } from "../animation/processIdentity";
import { formatBytes, formatPercent } from "../i18n/formatters";
import { ProcessIcon } from "./ProcessIcon";
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
  const scroll = useRef<HTMLDivElement>(null);
  const rows = useMemo(() => state.snapshot ? queryProcesses(state.snapshot.processes, query, sort, ascending, state.locale) : [], [state.snapshot, query, sort, ascending, state.locale]);
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
      <div className="process-list-tools"><label>{t("processList.filter")}<input data-process-filter value={query} onChange={event => { setQuery(event.target.value); turnPage(0); }} placeholder={t("processList.filterHint")} /></label><button className="process-list-control" aria-pressed={state.paused} onClick={() => state.setPaused(!state.paused)}>{t(state.paused ? "nav.resume" : "nav.pause")}</button></div>
      <p className="process-list-summary">{t("processList.count", { count: rows.length, received: state.snapshot.processes.length, total: state.snapshot.processCount })}</p>
      {missing > 0 && <p className="process-list-warning" role="status">{t("processList.partial", { count: missing })}</p>}
      <div className="process-list-scroll" ref={scroll} tabIndex={0} aria-label={t("processList.title")}>
        <table><caption className="sr-only">{t("processList.title")}</caption><thead><tr>{columns.map(column => <th key={column.key} scope="col" aria-sort={sort === column.key ? ascending ? "ascending" : "descending" : "none"}><button onClick={() => { setSort(column.key); setAscending(sort === column.key ? !ascending : column.key === "name" || column.key === "pid"); turnPage(0); }}>{column.label}<span aria-hidden="true">{sort === column.key ? ascending ? " ↑" : " ↓" : ""}</span></button></th>)}<th scope="col">{t("inspector.path")}</th></tr></thead>
          <tbody>{shown.map(process => <tr key={processIdentity(process)} className={process.pid === state.selectedPid ? "selected" : undefined}><td><button className="process-list-select" aria-label={t("processList.inspect", { name: process.name, pid: process.pid })} onClick={() => inspectProcess(process)}><ProcessIcon process={process} /><span>{process.name}</span></button></td><td>{process.pid}</td><td>{isObservedMetric(process.cpuPercent) ? formatPercent(process.cpuPercent, state.locale, 1) : "—"}</td><td>{isObservedMetric(process.memoryBytes) ? formatBytes(process.memoryBytes, state.locale) : "—"}</td><td>{isObservedMetric(process.threadCount) ? process.threadCount : "—"}</td><td className="process-list-path" title={process.executablePath}>{process.executablePath || "—"}</td></tr>)}</tbody>
        </table>{!rows.length && <p className="process-list-empty">{t(query.trim() ? "processList.noMatches" : "processList.noData")}</p>}
      </div>
      <footer><button className="process-list-control" disabled={currentPage === 0} onClick={() => turnPage(currentPage - 1)}>{t("processList.previous")}</button><span>{t("processList.page", { page: currentPage + 1, pages: pageCount })}</span><button className="process-list-control" disabled={currentPage + 1 >= pageCount} onClick={() => turnPage(currentPage + 1)}>{t("processList.next")}</button></footer>
    </section>
  </div>;
}
