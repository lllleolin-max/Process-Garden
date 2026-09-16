import { useEffect, useId, useMemo, useState } from "react";
import { useServiceReadings } from "../hooks/useServiceReadings";
import { serviceStateLabel } from "../data/serviceReadings";
import { useAppStore } from "../stores/appStore";
import "./ServicePanel.css";

const PAGE_SIZE = 12;
function ServiceReadings() {
  const state = useServiceReadings();
  const locale = useAppStore(s => s.locale);
  const zh = locale === "zh-CN";
  const statusId = useId();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState("name");
  const [stateFilter, setStateFilter] = useState("all");
  const rows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
    return state.rows.filter(row => (stateFilter === "all" || String(row.state) === stateFilter)
      && (!needle || [row.name, row.displayName, String(row.processId ?? "")]
      .some(text => text.toLocaleLowerCase(locale).includes(needle))))
      .sort((a, b) => (sort === "state" ? a.state - b.state : 0) || collator.compare(a.name, b.name));
  }, [state.rows, query, sort, stateFilter, locale]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  useEffect(() => { setPage(previous => Math.min(previous, pages - 1)); }, [pages]);
  const status = {
    unavailable: zh ? "请在原生桌面版关闭演示数据" : "Use the native desktop app with demo data off",
    baseline: zh ? "正在读取服务" : "Reading services",
    paused: zh ? "已暂停" : "Paused",
    live: zh ? "当前权限可见的 Win32 服务" : "Win32 services visible to current permissions",
    empty: zh ? "未返回可见服务" : "No visible services returned",
    error: zh ? "服务查询不可用，正在重试" : "Service query unavailable; retrying",
  }[state.status];
  return <div className="service-readings">
    <p id={statusId} role="status">{status}{state.stale && <> · {zh ? "上次采样，非实时" : "Last sample, not live"}</>}</p>
    <p>{zh ? "只读；无权限的服务可能被省略。不含驱动程序，PID 不代表进程生命周期。" : "Read only. Inaccessible services may be omitted. Drivers excluded; PID is not a process lifetime."}</p>
    <label>{zh ? "筛选服务" : "Filter services"}<input value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} placeholder={zh ? "名称或 PID" : "Name or PID"} /></label>
    <label>{zh ? "服务排序" : "Service order"}<select value={sort} onChange={event => { setSort(event.target.value); setPage(0); }}>
      <option value="name">{zh ? "名称" : "Name"}</option><option value="state">{zh ? "状态，再按名称" : "State, then name"}</option>
    </select></label>
    <label>{zh ? "服务状态" : "Service state"}<select value={stateFilter} onChange={event => { setStateFilter(event.target.value); setPage(0); }}>
      <option value="all">{zh ? "全部状态" : "All states"}</option>
      {[1, 2, 3, 4, 5, 6, 7].map(state => <option key={state} value={state}>{serviceStateLabel(state, locale)}</option>)}
    </select></label>
    <p>{zh ? `匹配 ${rows.length} / 已收到 ${state.rows.length}` : `${rows.length} matches / ${state.rows.length} received`}</p>
    <ul aria-label={zh ? "服务记录" : "Service records"} aria-describedby={statusId}>
      {rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE).map(row => <li key={row.name.toLowerCase()}>
        <strong>{row.displayName || row.name}</strong><code>{row.name}</code>
        <span>{serviceStateLabel(row.state, locale)} · PID {row.processId ?? "—"}</span>
      </li>)}
    </ul>
    {!rows.length && state.rows.length > 0 && <p>{zh ? "没有匹配的服务" : "No matching services"}</p>}
    <nav aria-label={zh ? "服务分页" : "Service pages"}>
      <button aria-disabled={current === 0} onClick={() => { if (current > 0) setPage(current - 1); }}>{zh ? "上一页" : "Previous"}</button>
      <span>{current + 1} / {pages}</span>
      <button aria-disabled={current + 1 === pages} onClick={() => { if (current + 1 < pages) setPage(current + 1); }}>{zh ? "下一页" : "Next"}</button>
    </nav>
  </div>;
}

export function ServicePanel() {
  const locale = useAppStore(s => s.locale);
  const windowed = useAppStore(s => s.displayMode === "windowed");
  const [open, setOpen] = useState(false);
  return <details className="service-panel" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>{locale === "zh-CN" ? "Windows 服务" : "Windows services"}</summary>
    {open && windowed && <ServiceReadings />}
  </details>;
}
