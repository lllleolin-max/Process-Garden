import { useAppStore } from "../stores/appStore";
import { useFeedHealth } from "../stores/feedHealth";
import "./FeedHealthNotice.css";

export function FeedHealthNotice() {
  const failed = useFeedHealth(state => state.failed);
  const stalled = useFeedHealth(state => state.stalled);
  const lastSuccess = useFeedHealth(state => state.failed ? state.lastSuccess : null);
  const locale = useAppStore(state => state.locale);
  const paused = useAppStore(state => state.paused);
  const demoMode = useAppStore(state => state.demoMode);
  if (!failed || demoMode) return null;
  const zh = locale === "zh-CN";
  const message = stalled
    ? zh ? "采样响应超时 · 正在等待原请求" : "Sampling is taking too long · waiting for the pending request"
    : zh
    ? paused ? "采样失败 · 已暂停重试" : "采样失败 · 正在自动重试"
    : paused ? "Sampling failed · retries paused" : "Sampling failed · retrying automatically";
  const detail = lastSuccess === null
    ? zh ? "尚未取得本机数据，当前显示内容不是实时采样。" : "No native sample received. Displayed data is not live."
    : `${zh ? "数据已过期 · 最后成功采样：" : "Data is stale · last successful sample: "}${new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "medium" }).format(lastSuccess)}`;
  return <aside className="feed-health-notice" role="status" aria-live="polite" aria-atomic="true"><strong>{message}</strong><span>{detail}</span></aside>;
}
