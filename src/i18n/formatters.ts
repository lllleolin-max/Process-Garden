import type { AppLocale } from "./config";

// Animation draws reuse these expensive locale objects. Bound the cache because
// precision is a public argument; do not retain every possible caller setting.
const numberFormats = new Map<string, Intl.NumberFormat>();
function numberFormat(locale: AppLocale, kind: "bytes" | "percent" | "watts", precision: number) {
  const key = `${locale}:${kind}:${precision}`;
  const cached = numberFormats.get(key);
  if (cached) return cached;
  const format = new Intl.NumberFormat(locale, {
    ...(kind === "percent" ? { style: "percent" as const } : {}),
    ...(kind === "watts" ? { minimumFractionDigits: 1 } : {}),
    maximumFractionDigits: precision,
  });
  if (numberFormats.size >= 16) numberFormats.delete(numberFormats.keys().next().value!);
  numberFormats.set(key, format);
  return format;
}

export function formatBytes(bytes: number, locale: AppLocale, precision = 1) {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.max(0, Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1));
  return `${numberFormat(locale, "bytes", precision).format(bytes / 1024 ** index)} ${units[index]}`;
}

export function formatPercent(value: number, locale: AppLocale, precision = 0) {
  if (!Number.isFinite(value) || value < 0) return "—";
  return numberFormat(locale, "percent", precision).format(value / 100);
}

export function formatWatts(watts: number | null | undefined, locale: AppLocale) {
  if (watts == null || !Number.isFinite(watts) || watts < 0) return "—";
  return `${numberFormat(locale, "watts", 1).format(watts)} W`;
}

export function formatDuration(seconds: number, locale: AppLocale) {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (locale === "zh-CN") return `${days ? `${days}天 ` : ""}${hours}小时 ${minutes}分`;
  return `${days ? `${days}d ` : ""}${hours}h ${minutes}m`;
}

export function formatDateTime(timestamp: number, locale: AppLocale) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "—";
  const date = new Date(timestamp > 10_000_000_000 ? timestamp : timestamp * 1000);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "medium" }).format(date);
}
