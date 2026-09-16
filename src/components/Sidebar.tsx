import { Activity, Cpu, MemoryStick, Network, Workflow } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatBytes, formatDuration, formatPercent } from "../i18n/formatters";
import { useAppStore } from "../stores/appStore";
import { MetricCard } from "./MetricCard";
import { PowerMetric } from "./PowerMetric";
import { useSnapshotStatus } from "../hooks/useSnapshotStatus";

export function Sidebar() {
  const snapshotStatus = useSnapshotStatus();
  const { t } = useTranslation();
  const snapshot = useAppStore((state) => state.snapshot);
  const history = useAppStore((state) => state.history);
  const locale = useAppStore((state) => state.locale);
  const memoryPercent = snapshot.memoryTotalBytes ? (snapshot.memoryUsedBytes / snapshot.memoryTotalBytes) * 100 : 0;

  return (
    <aside className="sidebar panel-surface">
      <MetricCard
        label={t("metrics.cpu")}
        value={formatPercent(snapshot.cpuPercent, locale)}
        detail={`${snapshot.logicalCpuCount} ${t("metrics.cores")}`}
        icon={Cpu}
        values={history.slice(-36).map((item) => item.cpuPercent)}
        color="var(--color-primary)"
      />
      <MetricCard
        label={t("metrics.memory")}
        value={formatBytes(snapshot.memoryUsedBytes, locale)}
        detail={`${formatPercent(memoryPercent, locale)} ${t("metrics.used")}`}
        icon={MemoryStick}
        values={history.slice(-36).map((item) => item.memoryUsedBytes)}
        progress={memoryPercent}
        color="linear-gradient(90deg, var(--color-tertiary), var(--color-secondary))"
      />
      <PowerMetric />
      <MetricCard
        label={t("metrics.processes")}
        value={new Intl.NumberFormat(locale).format(snapshot.processCount)}
        detail={snapshotStatus}
        icon={Activity}
        values={history.slice(-36).map((item) => item.processCount)}
        color="var(--color-secondary)"
      />
      <MetricCard
        label={t("metrics.threads")}
        value={new Intl.NumberFormat(locale).format(snapshot.threadCount)}
        detail={snapshotStatus}
        icon={Workflow}
        values={history.slice(-36).map((item) => item.threadCount)}
        color="var(--color-warning)"
      />
      <div className="uptime-card">
        <div className="metric-heading"><Network size={15} /> {t("metrics.uptime")}</div>
        <strong>{formatDuration(snapshot.uptimeSeconds, locale)}</strong>
      </div>
    </aside>
  );
}
