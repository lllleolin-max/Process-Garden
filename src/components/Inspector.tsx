import { Activity, Binary, BrainCircuit, Check, CircleDot, Clock3, Copy, Cpu, FolderCog, Network, Workflow } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useTranslation } from "react-i18next";
import { formatBytes, formatDateTime, formatPercent } from "../i18n/formatters";
import { agentEmbryoStage, isAgentProcess } from "../ecology/organisms";
import { useAppStore } from "../stores/appStore";
import { Sparkline } from "./Sparkline";
import { ProcessIcon } from "./ProcessIcon";
import { processHistory } from "../data/processHistory";
import { processIdentity } from "../animation/processIdentity";
import { ParentProcess } from "./ParentProcess";
import { ProcessIo } from "./ProcessIo";
import { isObservedMetric } from "../data/processTable";
import { AnimatedMetric } from "./AnimatedMetric";

export function Inspector() {
  const { t } = useTranslation();
  const state = useAppStore(useShallow(({ snapshot, history, selectedPid, locale, setSelectedPid }) =>
    ({ snapshot, history, selectedPid, locale, setSelectedPid })));
  const [tab, setTab] = useState<"overview" | "threads" | "connections">("overview");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "copyFailed">("idle");
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const copyRequest = useRef(0);
  const process = state.snapshot.processes.find((item) => item.pid === state.selectedPid);
  const history = useMemo(() => process && tab === "overview" ? processHistory(state.history, process, 42) : [], [state.history, process, tab]);
  const selectedLifetime = process ? processIdentity(process) : null;
  const formatCpu = useCallback((value: number) => formatPercent(value, state.locale, 1), [state.locale]);
  const formatMemory = useCallback((value: number) => formatBytes(value, state.locale), [state.locale]);
  useEffect(() => {
    setCopyStatus("idle");
    return () => { clearTimeout(copyTimer.current); copyRequest.current += 1; };
  }, [state.selectedPid, selectedLifetime]);
  if (!process) return <aside className="inspector panel-surface empty-inspector"><CircleDot size={28} /><p>{t("inspector.selectHint")}</p></aside>;
  const statusKey = process.status === "stressed" ? "stressed" : process.status === "idle" ? "idle" : "running";
  const cpuLabel = Number.isFinite(process.cpuPercent) && process.cpuPercent >= 0 && process.cpuPercent <= 100
    ? formatPercent(process.cpuPercent, state.locale, 1) : "—";
  const memoryLabel = isObservedMetric(process.memoryBytes) ? formatBytes(process.memoryBytes, state.locale) : "—";
  const agentTasks = isAgentProcess(process) ? state.snapshot.processes.filter((item) => item.parentPid === process.pid && item.status !== "dead") : [];
  const copyDetails = async () => {
    const request = ++copyRequest.current;
    clearTimeout(copyTimer.current);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(`${process.name} · PID ${process.pid} · CPU ${cpuLabel} · ${memoryLabel}`);
      if (request !== copyRequest.current) return;
      setCopyStatus("copied");
    } catch {
      if (request !== copyRequest.current) return;
      setCopyStatus("copyFailed");
    }
    copyTimer.current = setTimeout(() => setCopyStatus("idle"), 2500);
  };

  return (
    <aside className="inspector panel-surface" tabIndex={-1} aria-label={t("inspector.title")}>
      <header className="inspector-header"><div className="inspector-identity" key={process.pid}><ProcessIcon process={process} /><div><small>{t("inspector.title")}</small><h2>{process.name}</h2><span className={`status-chip ${process.status}`}><span />{t(`inspector.${statusKey}`)}</span></div></div><button className="icon-button" onClick={() => void copyDetails()} aria-label={t("inspector.copyDetails")} title={t("inspector.copyDetails")}>{copyStatus === "copied" ? <Check size={15} /> : <Copy size={15} />}</button></header>
      <div className={`copy-feedback ${copyStatus === "copyFailed" ? "error" : ""}`} role="status">{copyStatus !== "idle" && t(`inspector.${copyStatus}`)}</div>
      <div className="inspector-tabs" role="tablist" aria-label={t("inspector.title")}>
        {(["overview", "threads", "connections"] as const).map((item, index, tabs) => <button key={item} id={`inspector-tab-${item}`} role="tab" aria-selected={tab === item} aria-controls="inspector-tabpanel" tabIndex={tab === item ? 0 : -1} className={tab === item ? "active" : ""} onClick={() => setTab(item)} onKeyDown={(event) => {
          const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
          if (next < 0) return;
          event.preventDefault();
          setTab(tabs[next]);
          document.getElementById(`inspector-tab-${tabs[next]}`)?.focus();
        }}>{t(`nav.${item}`)}</button>)}
      </div>
      <div id="inspector-tabpanel" className="inspector-tabpanel" role="tabpanel" aria-labelledby={`inspector-tab-${tab}`} tabIndex={0} key={`${process.pid}-${tab}`}>
      {tab === "overview" && <>
        <section className="resource-chart" title={state.locale === "zh-CN" ? "全机 CPU 容量 · 固定 0–100% 刻度" : "Whole-machine CPU capacity · fixed 0–100% scale"}><div className="resource-chart-title"><span><Cpu size={14} />{t("inspector.cpuUsage")}</span><strong><AnimatedMetric key={`${selectedLifetime}-cpu-value`} value={cpuLabel === "—" ? NaN : process.cpuPercent} format={formatCpu} /></strong></div><Sparkline key={`${selectedLifetime}-cpu`} values={history.map((item) => item.cpuPercent).slice(-42)} height={50} scale="percent" /></section>
        <section className="resource-chart"><div className="resource-chart-title"><span><Activity size={14} />{t("inspector.memoryUsage")}</span><strong><AnimatedMetric key={`${selectedLifetime}-memory-value`} value={isObservedMetric(process.memoryBytes) ? process.memoryBytes : NaN} format={formatMemory} /></strong></div><Sparkline key={`${selectedLifetime}-memory`} values={history.map((item) => isObservedMetric(item.memoryBytes) ? item.memoryBytes : NaN).slice(-42)} color="var(--color-tertiary)" height={44} /></section>
        <ProcessIo key={`${selectedLifetime}-io`} pid={process.pid} startedAt={process.startedAt} />
      </>}
      {tab === "threads" && <section className="inspector-tab-summary"><Workflow size={24} /><strong>{process.threadCount ?? t("common.unavailable")}</strong><p>{t("inspector.threadSummary")}</p></section>}
      {tab === "connections" && <section className="inspector-tab-summary"><Network size={24} /><strong>{process.connections ?? t("common.unavailable")}</strong><p>{t("inspector.connectionPrivacy")}</p></section>}
      </div>
      {isAgentProcess(process) && <section className="agent-lifecycle-card"><header><BrainCircuit size={16} /><div><strong>{t("inspector.agentCore")}</strong><small>{t("inspector.agentTasks", { count: agentTasks.length })}</small></div></header><p>{t("inspector.agentStageHint")}</p>{agentTasks.length ? agentTasks.map((task) => { const stage = agentEmbryoStage(task, state.snapshot.timestamp); return <button className={`agent-task-stage stage-${stage}`} key={`${task.pid}:${task.startedAt}`} onClick={() => state.setSelectedPid(task.pid)} aria-label={t("a11y.selectProcess", { name: task.name })}><ProcessIcon process={task} /><span><strong>{task.name}</strong><small>{t(`inspector.embryoStage${stage}`)}</small></span><i>{stage + 1}/3</i></button>; }) : <p>{t("inspector.noAgentTasks")}</p>}</section>}
      <div className="detail-grid">
        <Detail icon={Binary} label={t("inspector.pid")} value={String(process.pid)} />
        <Detail icon={Workflow} label={t("metrics.threads")} value={String(process.threadCount ?? "—")} />
        <Detail icon={Network} label={t("nav.connections")} value={String(process.connections ?? "—")} />
        <Detail icon={Clock3} label={t("inspector.started")} value={formatDateTime(process.startedAt, state.locale)} />
      </div>
      <ParentProcess process={process} processes={state.snapshot.processes} locale={state.locale} />
      <section className="activity-highlights"><h3>{t("inspector.activity")}</h3><p><span className="event-dot network" />{process.connections ?? "—"} {t("nav.connections").toLowerCase()}</p><p><span className="event-dot spawn" />{process.threadCount ?? "—"} {t("metrics.threads").toLowerCase()}</p><p><span className="event-dot io" />{memoryLabel} {t("metrics.memory").toLowerCase()}</p></section>
      <section className="path-card"><span><FolderCog size={14} />{t("inspector.path")}</span><code>{process.executablePath ?? t("common.unavailable")}</code></section>
    </aside>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof Cpu; label: string; value: string }) {
  return <div className="detail-item"><span><Icon size={13} />{label}</span><strong>{value}</strong></div>;
}
