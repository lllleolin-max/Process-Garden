import { useCallback, useEffect, useId, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "../stores/appStore";
import { useSnapshotStatusDetails } from "../hooks/useSnapshotStatus";
import { cpuCoreHistory } from "../data/cpuCoreHistory";
import { formatPercent } from "../i18n/formatters";
import { Sparkline } from "./Sparkline";
import { AnimatedMetric } from "./AnimatedMetric";
import "./CpuCorePanel.css";

const PAGE_SIZE = 8;
function CoreReadings() {
  const { snapshot, history, locale, collector } = useAppStore(useShallow(s => ({ snapshot: s.snapshot, history: s.history, locale: s.locale, collector: s.collector })));
  const status = useSnapshotStatusDetails();
  const statusId = useId();
  const active = status.animationState === "live" || status.animationState === "demo";
  const zh = locale === "zh-CN";
  const formatCore = useCallback((value: number) => formatPercent(value, locale, 1), [locale]);
  const cores = snapshot.cpuCorePercents;
  const supported = cores !== undefined && cores.length > 0 && cores.length === snapshot.logicalCpuCount;
  const [page, setPage] = useState(0);
  const pages = supported ? Math.ceil(cores.length / PAGE_SIZE) : 1;
  const current = Math.min(page, pages - 1);
  useEffect(() => { setPage(previous => Math.min(previous, pages - 1)); }, [pages]);
  return <div className="cpu-core-readings">
    <p className="cpu-core-status" id={statusId} role="status">{status.label} · 0–100%</p>
    {!supported ? <p>{zh ? "当前数据源未提供逻辑处理器读数" : "Logical processor readings are unavailable from this source."}</p> : <>
      <div className="cpu-core-grid">{cores.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE).map((value, offset) => {
        const core = current * PAGE_SIZE + offset;
        const valid = typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
        // A new source or logical topology has no continuous curve identity.
        return <section className="cpu-core-reading" key={`${collector}:${snapshot.logicalCpuCount}:${core}`} aria-describedby={statusId} aria-label={`CPU ${core}`}>
          <div><span>CPU {core}</span><strong><AnimatedMetric active={active} value={valid ? value : NaN} format={formatCore} /></strong></div>
          <Sparkline active={active} values={valid ? cpuCoreHistory(history, core) : []} height={32} scale="percent" />
        </section>;
      })}</div>
      {pages > 1 && <nav aria-label={zh ? "逻辑处理器分页" : "Logical processor pages"}>
        <button className="icon-button text-button" disabled={current === 0} onClick={() => setPage(current - 1)}>{zh ? "上一页" : "Previous"}</button>
        <span>{current + 1} / {pages}</span>
        <button className="icon-button text-button" disabled={current + 1 >= pages} onClick={() => setPage(current + 1)}>{zh ? "下一页" : "Next"}</button>
      </nav>}
    </>}
  </div>;
}

export function CpuCorePanel() {
  const locale = useAppStore(s => s.locale);
  const windowed = useAppStore(s => s.displayMode === "windowed");
  const [open, setOpen] = useState(false);
  return <details className="cpu-core-panel" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>{locale === "zh-CN" ? "逻辑处理器" : "Logical processors"}</summary>
    {open && windowed && <CoreReadings />}
  </details>;
}
