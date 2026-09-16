import { Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatWatts } from "../i18n/formatters";
import { useAppStore } from "../stores/appStore";
import { useFeedHealth } from "../stores/feedHealth";
import type { PowerSnapshot } from "../types/system";
import { MetricCard } from "./MetricCard";

function hasReading(power: PowerSnapshot | undefined): power is PowerSnapshot & { watts: number } {
  return power != null && power.source !== "unavailable" && power.watts != null && Number.isFinite(power.watts) && power.watts >= 0;
}

export function PowerMetric({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const snapshot = useAppStore((state) => state.snapshot);
  const history = useAppStore((state) => state.history);
  const locale = useAppStore((state) => state.locale);
  const collector = useAppStore((state) => state.collector);
  const samplingFailed = useFeedHealth((state) => state.failed);
  const demoMode = useAppStore((state) => state.demoMode);
  const paused = useAppStore((state) => state.paused);
  const samplingMs = useAppStore((state) => state.samplingMs);
  const displayMode = useAppStore((state) => state.displayMode);
  const invalidTimestamp = !Number.isFinite(snapshot.timestamp) || snapshot.timestamp <= 0 || snapshot.timestamp > Date.now();
  const [expiredTimestamp, setExpiredTimestamp] = useState<number | null>(null);
  useEffect(() => {
    if (paused || invalidTimestamp) return;
    const interval = displayMode === "wallpaper" ? Math.max(2000, samplingMs) : samplingMs;
    const expiresIn = snapshot.timestamp + Math.max(5000, interval * 3) - Date.now();
    const timer = window.setTimeout(() => setExpiredTimestamp(snapshot.timestamp), Math.max(0, expiresIn));
    return () => window.clearTimeout(timer);
  }, [snapshot.timestamp, paused, samplingMs, displayMode, invalidTimestamp]);
  // Requested and observed sources can differ while switching modes. Never
  // present synthetic data as a native reading during that transition.
  const matchesMode = demoMode ? collector === "demo" : collector === "native";
  const power = snapshot.power;
  const stale = invalidTimestamp || expiredTimestamp === snapshot.timestamp || (collector === "native" && samplingFailed);
  const source = matchesMode && !stale && hasReading(power) && (demoMode ? power.source === "demo" : power.source !== "demo") ? power.source : "unavailable";
  const label = t(`power.labels.${source}`);
  const value = formatWatts(source === "unavailable" ? null : power.watts, locale);
  const unavailable = !matchesMode ? "waiting" : stale ? "stale" : "unavailable";
  const description = t(`power.details.${source === "unavailable" ? unavailable : source}`);
  const detail = paused ? `${description} · ${t("status.paused")}` : description;
  const hint = t(`power.hints.${source === "unavailable" ? unavailable : source}`);
  const values: number[] = [];
  if (source !== "unavailable") {
    // Only chart the uninterrupted tail of the current measurement source.
    // This avoids joining battery, package and missing samples into one curve.
    for (let index = history.length - 1; index >= Math.max(0, history.length - 36); index--) {
      const item = history[index].power;
      if (!hasReading(item) || item.source !== source) break;
      values.unshift(item.watts);
    }
  }

  if (compact) {
    return <span className="power-hud" title={`${detail}. ${hint}`} aria-label={`${label}: ${value}. ${detail}`}><Zap size={14} />{label} {value}</span>;
  }
  return <MetricCard key={source} label={label} value={value} detail={detail} hint={hint} icon={Zap} values={values} color="var(--color-warning)" />;
}
