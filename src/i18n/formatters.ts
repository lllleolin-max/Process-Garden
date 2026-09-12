import type { AppLocale } from "./config";

export function formatBytes(bytes: number, locale: AppLocale, precision = 1) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: precision }).format(bytes / 1024 ** index)} ${units[index]}`;
}

export function formatPercent(value: number, locale: AppLocale, precision = 0) {
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: precision }).format(Math.max(0, value) / 100);
}

export function formatWatts(watts: number | null | undefined, locale: AppLocale) {
  if (watts == null || !Number.isFinite(watts) || watts < 0) return "—";
  return `${new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(watts)} W`;
}

export function formatDuration(seconds: number, locale: AppLocale) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (locale === "zh-CN") return `${days ? `${days}天 ` : ""}${hours}小时 ${minutes}分`;
  return `${days ? `${days}d ` : ""}${hours}h ${minutes}m`;
}

export function formatDateTime(timestampSeconds: number, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "medium" }).format(new Date(timestampSeconds * 1000));
}
