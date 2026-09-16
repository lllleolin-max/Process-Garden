import { Activity, Cpu, MemoryStick, Network, Workflow } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatBytes, formatDuration, formatPercent } from "../i18n/formatters";
import { useAppStore } from "../stores/appStore";
import { MetricCard } from "./MetricCard";
import { PowerMetric } from "./PowerMetric";
import { CpuCorePanel } from "./CpuCorePanel";
import { NetworkPanel } from "./NetworkPanel";
import { useSnapshotStatus } from "../hooks/useSnapshotStatus";
import { threadHistory } from "../data/threadHistory";
import { useCallback } from "react";
import { isObservedCount, isObservedMetric, isObservedPercent } from "../data/processTable";

export function Sidebar() {
  const snapshotStatus = useSnapshotStatus();
  const { t } = useTranslation();
  const snapshot = useAppStore((state) => state.snapshot);
  const history = useAppStore((state) => state.history);
  const locale = useAppStore((state) => state.locale);
  const cpuLabel = useCallback((value: number) => formatPercent(value, locale), [locale]);
  const memoryLabel = useCallback((value: number) => formatBytes(value, locale), [locale]);
  const cpuValue = isObservedPercent(snapshot.cpuPercent) ? snapshot.cpuPercent : NaN;
  const memoryValue = isObservedMetric(snapshot.memoryUsedBytes) ? snapshot.memoryUsedBytes : NaN;
  const memoryPercent = isObservedMetric(snapshot.memoryTotalBytes) && snapshot.memoryTotalBytes > 0
    && Number.isFinite(memoryValue) && memoryValue <= snapshot.memoryTotalBytes
    ? (memoryValue / snapshot.memoryTotalBytes) * 100 : NaN;

  return (
    <aside className="sidebar panel-surface">
      <MetricCard
        label={t("metrics.cpu")}
        value={formatPercent(cpuValue, locale)}
        animatedValue={cpuValue}
        formatValue={cpuLabel}
        percentScale
        detail={`${isObservedCount(snapshot.logicalCpuCount) && snapshot.logicalCpuCount > 0 ? snapshot.logicalCpuCount : "—"} ${t("metrics.cores")}`}
        icon={Cpu}
        values={history.slice(-36).map((item) => item.cpuPercent)}
        color="var(--color-primary)"
      />
      <MetricCard
        label={t("metrics.memory")}
        value={formatBytes(memoryValue, locale)}
        animatedValue={memoryValue}
        formatValue={memoryLabel}
        detail={`${formatPercent(memoryPercent, locale)} ${t("metrics.used")}`}
        icon={MemoryStick}
        values={history.slice(-36).map((item) => item.memoryUsedBytes)}
        progress={memoryPercent}
        color="linear-gradient(90deg, var(--color-tertiary), var(--color-secondary))"
      />
      <CpuCorePanel />
      <NetworkPanel />
      <PowerMetric />
      <MetricCard
        label={t("metrics.processes")}
        value={isObservedCount(snapshot.processCount) ? new Intl.NumberFormat(locale).format(snapshot.processCount) : "—"}
        detail={snapshotStatus}
        icon={Activity}
        values={history.slice(-36).map((item) => isObservedCount(item.processCount) ? item.processCount : NaN)}
        color="var(--color-secondary)"
      />
      <MetricCard
        label={t("metrics.threads")}
        value={isObservedCount(snapshot.threadCount) ? new Intl.NumberFormat(locale).format(snapshot.threadCount) : "—"}
        detail={snapshotStatus}
        icon={Workflow}
        values={threadHistory(history)}
        color="var(--color-warning)"
      />
      <div className="uptime-card">
        <div className="metric-heading"><Network size={15} /> {t("metrics.uptime")}</div>
        <strong>{formatDuration(snapshot.uptimeSeconds, locale)}</strong>
      </div>
    </aside>
  );
}
