import { useCallback, useEffect, useState } from "react";
import { useAppStore } from "../stores/appStore";
import { useGpuReadings } from "../hooks/useGpuReadings";
import { gpuHistory } from "../data/gpuReadings";
import { formatBytes, formatPercent } from "../i18n/formatters";
import { AnimatedMetric } from "./AnimatedMetric";
import { Sparkline } from "./Sparkline";
import "./DiskPanel.css";

function GpuReadings() {
  const locale = useAppStore(s => s.locale);
  const zh = locale === "zh-CN";
  const state = useGpuReadings();
  const [selectedAdapter, setAdapter] = useState("");
  const [selectedEngine, setEngine] = useState(0);
  const adapter = state.reading?.adapters.find(row => row.id === selectedAdapter) ?? state.reading?.adapters[0];
  const engine = adapter?.engines.find(row => row.id === selectedEngine) ?? adapter?.engines[0];
  useEffect(() => { setAdapter(adapter?.id ?? ""); }, [adapter?.id, state.session]);
  useEffect(() => { setEngine(engine?.id ?? 0); }, [engine?.id, adapter?.id, state.session]);
  const percent = useCallback((value: number) => formatPercent(value, locale, 1), [locale]);
  const bytes = useCallback((value: number) => formatBytes(value, locale), [locale]);
  const message = {
    unavailable: zh ? "请在桌面应用中启用本机数据，查看 GPU。" : "Enable native data in the desktop app to view GPU counters.",
    paused: zh ? "GPU 采样已暂停" : "GPU sampling paused",
    baseline: zh ? "正在建立 GPU 采样基线" : "Establishing GPU sampling baseline",
    live: zh ? "GPU 计数器观测" : "GPU counter observations",
    error: zh ? "GPU 数据暂不可用，正在重试" : "GPU data unavailable; retrying",
    empty: zh ? "未发现 GPU 计数器实例" : "No GPU counter instances found",
  }[state.status];
  const incomplete = state.reading && ([state.reading.engineCoverage, state.reading.dedicatedCoverage, state.reading.sharedCoverage]
    .some(coverage => !coverage.available || coverage.unmappedInstances > 0)
    || !engine || engine.observedPercentSum === null || adapter?.dedicated.bytes === null || adapter?.shared.bytes === null);
  return <div className="disk-readings">
    <p role="status">{message}</p>
    <p>{zh ? "实验性引擎观测，不是总 GPU 占用率。" : "Experimental engine observations, not total GPU utilization."}</p>
    {adapter && <>
      <label>{zh ? "GPU 计数器实例" : "GPU counter instance"}<select title={adapter.device?.name ?? adapter.id} value={adapter.id} onChange={event => setAdapter(event.target.value)}>
        {state.reading!.adapters.map(row => <option key={row.id} value={row.id}>
          {row.device ? `${row.device.name}${row.device.software ? (zh ? " · 软件适配器" : " · Software adapter") : ""} · ${row.id.split("_phys_")[1]}` : row.id}
        </option>)}
      </select></label>
      <p>{adapter.device ? (zh ? "已按适配器身份匹配；末尾数字为物理索引，不是任务管理器的 GPU 序号。" : "Matched by adapter identity; trailing number is the physical index, not Task Manager GPU numbering.")
        : (zh ? "设备名称暂不可用，保留系统计数器标识。" : "Device name unavailable; showing the system counter identity.")}</p>
      {engine && <>
        <label>{zh ? "引擎" : "Engine"}<select value={engine.id} onChange={event => setEngine(Number(event.target.value))}>
          {adapter.engines.map(row => <option key={row.id} value={row.id}>{row.id} · {row.engineType ?? (zh ? "类型未知" : "Unknown type")}</option>)}
        </select></label>
        <section key={`${state.session}:${adapter.id}:${engine.id}`} aria-label={zh ? "引擎观测和" : "Engine observed sum"}>
          <div><span>{zh ? "引擎观测和" : "Engine observed sum"}</span><strong><AnimatedMetric value={engine.observedPercentSum ?? NaN} format={percent} /></strong></div>
          <Sparkline values={gpuHistory(state.history, adapter.id, engine.id)} height={32} scale="percent" color="var(--color-primary)" />
        </section>
      </>}
      {(["dedicated", "shared"] as const).map((field, index) => {
        const label = field === "dedicated" ? (zh ? "专用显存使用量" : "Dedicated memory usage") : (zh ? "共享显存使用量" : "Shared memory usage");
        return <section key={`${state.session}:${adapter.id}:${field}`} aria-label={label}>
          <div><span>{label}</span><strong><AnimatedMetric value={adapter[field].bytes ?? NaN} format={bytes} /></strong></div>
          <Sparkline values={gpuHistory(state.history, adapter.id, field)} height={32} scale="auto" color={index ? "var(--color-tertiary)" : "var(--color-secondary)"} />
        </section>;
      })}
    </>}
    {incomplete && <p>{zh ? "部分数据未识别或不可用；缺失值不补零。" : "Some data is unmapped or unavailable; missing values are not filled with zero."}</p>}
  </div>;
}

export function GpuPanel() {
  const locale = useAppStore(s => s.locale);
  const windowed = useAppStore(s => s.displayMode === "windowed");
  const [open, setOpen] = useState(false);
  return <details className="disk-panel gpu-panel" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>{locale === "zh-CN" ? "GPU 引擎与显存" : "GPU engines & memory"}</summary>
    {open && windowed && <GpuReadings />}
  </details>;
}
