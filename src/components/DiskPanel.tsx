import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useAppStore } from "../stores/appStore";
import { useDiskReadings } from "../hooks/useDiskReadings";
import { diskFields, diskHistory } from "../data/diskReadings";
import { formatPercent } from "../i18n/formatters";
import { AnimatedMetric } from "./AnimatedMetric";
import { Sparkline } from "./Sparkline";
import "./DiskPanel.css";

function DiskReadings() {
  const locale = useAppStore(s => s.locale);
  const zh = locale === "zh-CN";
  const state = useDiskReadings();
  const statusId = useId();
  const [selected, setSelected] = useState("");
  const disk = state.rows.find(row => row.id === selected) ?? state.rows[0];
  useEffect(() => { setSelected(disk?.id ?? ""); }, [disk?.id, state.session]);
  const formatter = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }), [locale]);
  const formatRate = useCallback((value: number) => {
    const units = ["B/s", "KiB/s", "MiB/s", "GiB/s"];
    const index = value > 0 ? Math.min(3, Math.max(0, Math.floor(Math.log(value) / Math.log(1024)))) : 0;
    return `${formatter.format(value / 1024 ** index)} ${units[index]}`;
  }, [formatter]);
  const formatActivity = useCallback((value: number) => formatPercent(value, locale, 1), [locale]);
  const labels = zh ? ["读取速率", "写入速率", "活动比例"] : ["Read rate", "Write rate", "Active time"];
  const message = {
    unavailable: zh ? "请在桌面应用中启用本机数据，查看物理磁盘。" : "Enable native data in the desktop app to view physical disks.",
    paused: zh ? "磁盘采样已暂停" : "Disk sampling paused",
    baseline: zh ? "等待连续有效采样" : "Waiting for consecutive valid samples",
    live: zh ? "实时物理磁盘读数" : "Live physical disk readings",
    error: zh ? "磁盘数据暂不可用，正在重试" : "Disk data unavailable; retrying",
    empty: zh ? "未发现可用的物理磁盘实例" : "No physical disk instances found",
  }[state.status];
  return <div className="disk-readings" data-stale={state.stale || undefined}>
    <p id={statusId} role="status">{message}{state.stale && (zh ? " · 显示上次采样（非实时）" : " · Showing the last sample (not live)")}</p>
    {disk && <>
      <label>{zh ? "物理磁盘" : "Physical disk"}<select value={disk.id} onChange={event => setSelected(event.target.value)}>
        {state.rows.map(row => <option key={row.id} value={row.id}>{row.id}</option>)}
      </select></label>
      <p>{zh ? "系统计数器实例；非卷容量，也非单个进程 I/O" : "System counter instance; not volume capacity or per-process I/O"}</p>
      <div key={`${state.session}:${disk.id}`}>
        {diskFields.map((field, index) => <section key={field} aria-describedby={statusId} aria-label={labels[index]}>
          <div><span>{labels[index]}</span><strong><AnimatedMetric active={!state.stale} value={disk[field] ?? NaN} format={index === 2 ? formatActivity : formatRate} /></strong></div>
          <Sparkline active={!state.stale} values={diskHistory(state.history, disk.id, field)} height={32} scale={index === 2 ? "percent" : "auto"}
            color={index === 1 ? "var(--color-tertiary)" : "var(--color-primary)"} />
        </section>)}
      </div>
      {state.status === "live" && diskFields.some(field => disk[field] === null)
        && <p>{zh ? "部分指标尚无有效采样" : "Some metrics do not yet have valid samples"}</p>}
    </>}
  </div>;
}

export function DiskPanel() {
  const locale = useAppStore(s => s.locale);
  const windowed = useAppStore(s => s.displayMode === "windowed");
  const [open, setOpen] = useState(false);
  return <details className="disk-panel" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>{locale === "zh-CN" ? "物理磁盘" : "Physical disks"}</summary>
    {open && windowed && <DiskReadings />}
  </details>;
}
