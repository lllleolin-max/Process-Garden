import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useAppStore } from "../stores/appStore";
import type { EventKind } from "../types/system";

const kinds: EventKind[] = ["birth", "spawn", "network", "io", "spike", "exit"];

export function Timeline() {
  const { t } = useTranslation();
  const state = useAppStore();
  const [showAll, setShowAll] = useState(false);
  const now = state.snapshot.timestamp;
  const recent = state.events.filter((event) => event.timestamp <= now && now - event.timestamp <= 60_000);
  const lanes = [...new Set(recent.map((event) => event.processName))].slice(0, 5);
  return (
    <section className="timeline panel-surface">
      <div className="timeline-main">
        <header className="timeline-header"><h2>{t("timeline.title")}</h2><div className="timeline-legend">{kinds.slice(0, 5).map((kind) => <span key={kind}><i className={`event-dot ${kind}`} />{t(`timeline.${kind}`)}</span>)}</div></header>
        <div className="timeline-chart">
          {!lanes.length && <p className="timeline-empty">{t("timeline.empty")}</p>}
          {lanes.map((processName) => (
            <div className="timeline-row" key={processName}><span className="timeline-process">{processName}</span><span className="timeline-line" /><div className="timeline-markers">{recent.filter((event) => event.processName === processName).map((event) => <button key={event.id} className={`timeline-point ${event.kind}`} style={{ left: `${Math.max(0, 1 - (now - event.timestamp) / 60_000) * 100}%` }} onClick={() => state.setSelectedPid(event.pid)} aria-label={`${event.processName} ${t(`timeline.${event.kind}`)}`} aria-pressed={state.selectedPid === event.pid} title={`${event.processName} · PID ${event.pid} · ${t(`timeline.${event.kind}`)}`} />)}</div></div>
          ))}
          <div className="timeline-axis"><span>60s</span><span>45s</span><span>30s</span><span>15s</span><span>{t("common.now")}</span></div>
        </div>
      </div>
      <aside className="recent-events"><header><h2>{t("timeline.recent")}</h2><button aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>{showAll ? t("timeline.recent") : t("timeline.all")}</button></header>{!state.events.length && <p className="timeline-empty">{t("timeline.noEvents")}</p>}{state.events.slice(0, showAll ? 20 : 5).map((event) => <button className="recent-event" key={event.id} onClick={() => state.setSelectedPid(event.pid)} aria-pressed={state.selectedPid === event.pid}><span className={`event-icon ${event.kind}`} /><span><strong>{t(event.messageKey, { name: event.processName })}</strong><small>PID {event.pid}</small></span><time>{t("timeline.ago", { count: Math.max(1, Math.round((now - event.timestamp) / 1000)) })}</time></button>)}</aside>
    </section>
  );
}
