import { useProcessIo } from "../hooks/useProcessIo";
import { useAppStore } from "../stores/appStore";
import { Sparkline } from "./Sparkline";

export function ProcessIo({ pid, startedAt }: { pid: number; startedAt: number }) {
  const io = useProcessIo(pid, startedAt);
  const locale = useAppStore(s => s.locale);
  const zh = locale === "zh-CN";
  const status = {
    unavailable: zh ? "仅在原生实时模式下提供" : "Available in native live mode only",
    paused: zh ? "已暂停" : "Paused",
    baseline: zh ? "正在建立采样基线" : "Establishing a baseline",
    live: zh ? "实时进程 I/O · 非物理磁盘吞吐量" : "Live process I/O · not physical disk throughput",
    error: zh ? "读数不可用，正在重试" : "Reading unavailable; retrying",
  }[io.status];
  const format = (value: number) => {
    const unit = value >= 1048576 ? 1048576 : value >= 1024 ? 1024 : 1;
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value / unit)} ${unit === 1048576 ? "MiB" : unit === 1024 ? "KiB" : "B"}/s`;
  };
  return <section className="resource-chart" aria-label={zh ? "进程 I/O" : "Process I/O"}>
    <div className="resource-chart-title"><span>{zh ? "进程 I/O" : "Process I/O"}</span></div>
    <p className="metric-detail">{status}</p>
    {(["readBytesPerSecond", "writtenBytesPerSecond"] as const).map((field, index) => <div key={field}>
      <div className="resource-chart-title"><span>{index === 0 ? zh ? "读取" : "Read" : zh ? "写入" : "Write"}</span><strong>{io.rates ? format(io.rates[field]) : "—"}</strong></div>
      {io.history.length > 0 && <Sparkline values={io.history.map(sample => sample[field])} height={32} color={index === 0 ? "var(--color-primary)" : "var(--color-tertiary)"} />}
    </div>)}
  </section>;
}
