import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "../stores/appStore";
import { useSnapshotStatusDetails } from "../hooks/useSnapshotStatus";
import { isObservedMetric } from "../data/processTable";
import { networkHistory } from "../data/networkHistory";
import { AnimatedMetric } from "./AnimatedMetric";
import { Sparkline } from "./Sparkline";
import "./NetworkPanel.css";

function NetworkReadings() {
  const { snapshot, history, locale, collector } = useAppStore(useShallow(s =>
    ({ snapshot: s.snapshot, history: s.history, locale: s.locale, collector: s.collector })));
  const status = useSnapshotStatusDetails();
  const statusId = useId();
  // Retain only a successful table from this source. An empty table is a real
  // observation, not a query failure; never resurrect devices across sources.
  const [last, setLast] = useState({ collector, network: snapshot.network, history });
  if (last.collector !== collector || (snapshot.network !== null &&
    (last.network !== snapshot.network || last.history !== history))) {
    setLast({ collector, network: snapshot.network, history });
  }
  const retained = snapshot.network === null && last.collector === collector;
  const stale = retained || status.animationState === "paused" || status.animationState === "stale";
  const zh = locale === "zh-CN";
  const [selected, setSelected] = useState("");
  const adapters = retained ? last.network : snapshot.network;
  const displayedHistory = retained ? last.history : history;
  const preferred = adapters?.find(row => row.operational && row.interfaceType !== 24) ?? adapters?.[0];
  const adapter = adapters?.find(row => row.id === selected) ?? preferred;
  useEffect(() => { if (adapter) setSelected(adapter.id); }, [adapter?.id]);
  useEffect(() => { setSelected(""); }, [collector]);
  const numberFormat = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }), [locale]);
  const formatRate = useCallback((value: number) => {
    const units = ["B/s", "KiB/s", "MiB/s", "GiB/s"];
    const index = value > 0 ? Math.min(3, Math.max(0, Math.floor(Math.log(value) / Math.log(1024)))) : 0;
    return `${numberFormat.format(value / 1024 ** index)} ${units[index]}`;
  }, [numberFormat]);
  return <div className="network-readings" data-stale={stale || undefined}>
    <p id={statusId} role="status">{snapshot.network === null ? zh ? "接口采样不可用" : "Interface sampling unavailable" : status.label} · {zh ? "按接口统计，非互联网总流量" : "Per interface, not total Internet traffic"}
      {stale && adapters && <> · {zh ? "显示上次采样（非实时）" : "Showing the last sample (not live)"}</>}
      {snapshot.network === null && <> · {zh ? "网络接口数据不可用" : "Network interface data unavailable"}</>}
    </p>
    {!adapters ? null
      : !adapter ? <p>{zh ? "未发现网络接口" : "No network interfaces found"}</p> : <>
        <label>{zh ? "网络适配器" : "Network adapter"}<select value={adapter.id} onChange={event => setSelected(event.target.value)}>
          {adapters.map(row => <option key={row.id} value={row.id}>{row.name || row.id}</option>)}
        </select></label>
        <p>{adapter.operational ? zh ? "接口运行中" : "Interface up" : zh ? "接口未运行" : "Interface down"} · {zh ? "类型" : "Type"} {adapter.interfaceType}</p>
        <div key={`${collector}:${adapter.id}:${adapter.interfaceType}`}>
          {(["receivedBytesPerSecond", "sentBytesPerSecond"] as const).map((field, index) => {
            const valid = adapter.operational && isObservedMetric(adapter[field]);
            return <section key={field} aria-describedby={statusId} aria-label={index === 0 ? zh ? "接收速率" : "Receive rate" : zh ? "发送速率" : "Send rate"}>
              <div><span>{index === 0 ? zh ? "接收" : "Receive" : zh ? "发送" : "Send"}</span>
                <strong><AnimatedMetric active={!stale} value={valid ? adapter[field]! : NaN} format={formatRate} /></strong></div>
              <Sparkline active={!stale} values={valid ? networkHistory(displayedHistory, adapter, field) : []} height={32}
                color={index === 0 ? "var(--color-primary)" : "var(--color-tertiary)"} />
            </section>;
          })}
        </div>
        {adapter.operational && (!isObservedMetric(adapter.receivedBytesPerSecond) || !isObservedMetric(adapter.sentBytesPerSecond))
          && <p>{zh ? "等待连续有效采样" : "Waiting for consecutive valid samples"}</p>}
      </>}
  </div>;
}

export function NetworkPanel() {
  const locale = useAppStore(s => s.locale);
  const windowed = useAppStore(s => s.displayMode === "windowed");
  const [open, setOpen] = useState(false);
  return <details className="network-panel" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>{locale === "zh-CN" ? "网络接口" : "Network interfaces"}</summary>
    {open && windowed && <NetworkReadings />}
  </details>;
}
