import { Check, ChevronRight, Info, Languages, Leaf, MonitorCog, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { classifyProcess, isAgentProcess, normalizeProcessName, organismStyleOptions, resolveOrganismStyle, type OrganismStyleId } from "../ecology/organisms";
import i18n from "../i18n/config";
import { useDisplayMode } from "../hooks/useDisplayMode";
import { useOverlay } from "../hooks/useOverlay";
import { useAppStore } from "../stores/appStore";
import type { AnimationFps } from "../stores/appStore";
import "../styles/overlays.css";

type SettingsTab = "general" | "visual" | "display" | "privacy" | "about";

export function SettingsDrawer() {
  const { t } = useTranslation();
  const state = useAppStore();
  const setDisplayMode = useDisplayMode();
  const [tab, setTab] = useState<SettingsTab>("general");
  const [displayError, setDisplayError] = useState(false);
  const [changingDisplay, setChangingDisplay] = useState(false);
  const panelId = useId();
  const overlay = useOverlay(state.settingsOpen, () => state.setSettingsOpen(false), { restoreFocusSelector: "[data-settings-trigger]" });
  const agentPids = new Set(state.snapshot.processes.filter(isAgentProcess).map((process) => process.pid));
  const processNames = [...new Set(state.snapshot.processes.filter((process) => !agentPids.has(process.parentPid ?? -1)).map((process) => process.name))].sort((left, right) => left.localeCompare(right));
  const [mappedProcess, setMappedProcess] = useState(processNames[0] ?? "");
  if (!overlay.present) return null;

  const setLocale = async (locale: "en-US" | "zh-CN") => {
    state.setLocale(locale);
    await i18n.changeLanguage(locale);
  };

  const tabs: Array<{ id: SettingsTab; icon: typeof SlidersHorizontal; label: string }> = [
    { id: "general", icon: SlidersHorizontal, label: t("settings.general") },
    { id: "visual", icon: Leaf, label: t("settings.visual") },
    { id: "display", icon: MonitorCog, label: t("settings.display") },
    { id: "privacy", icon: ShieldCheck, label: t("settings.privacy") },
    { id: "about", icon: Info, label: t("settings.about") }
  ];

  const navigateTabs = (event: KeyboardEvent<HTMLButtonElement>) => {
    const current = tabs.findIndex((item) => item.id === tab);
    let next = current;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (current + 1) % tabs.length;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = (current + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setTab(tabs[next].id);
    document.getElementById(`${panelId}-tab-${tabs[next].id}`)?.focus();
  };

  const changeDisplay = async (mode: "windowed" | "fullscreen" | "wallpaper") => {
    setDisplayError(false);
    setChangingDisplay(true);
    setDisplayError(!(await setDisplayMode(mode)));
    setChangingDisplay(false);
  };

  return (
    <div className="modal-backdrop" data-overlay-root="modal" data-state={overlay.state} aria-hidden={!state.settingsOpen} inert={!state.settingsOpen}>
      <section ref={overlay.surfaceRef} className="settings-drawer" role="dialog" aria-modal="true" aria-labelledby={`${panelId}-title`} tabIndex={-1}>
        <header className="drawer-header"><div><small>{t("app.name")}</small><h2 id={`${panelId}-title`}>{t("settings.title")}</h2></div><button className="icon-button" onClick={() => state.setSettingsOpen(false)} aria-label={t("a11y.closePanel")}><X size={18} /></button></header>
        <div className="settings-layout">
          <nav className="settings-tabs" role="tablist" aria-label={t("settings.title")} aria-orientation="vertical">
            {tabs.map(({ id, icon: Icon, label }) => <button key={id} id={`${panelId}-tab-${id}`} role="tab" aria-selected={tab === id} aria-controls={`${panelId}-panel-${id}`} tabIndex={tab === id ? 0 : -1} className={tab === id ? "active" : ""} onClick={() => setTab(id)} onKeyDown={navigateTabs}><Icon size={17} />{label}<ChevronRight size={14} /></button>)}
          </nav>
          <div className="settings-content">
            <div key={tab} className="settings-panel" role="tabpanel" id={`${panelId}-panel-${tab}`} aria-labelledby={`${panelId}-tab-${tab}`} tabIndex={0}>
            {tab === "general" && (
              <>
                <SettingsSection title={t("settings.language")} icon={Languages}>
                  <div className="segmented-control wide">
                    <button aria-pressed={state.locale === "en-US"} className={state.locale === "en-US" ? "active" : ""} onClick={() => void setLocale("en-US")}>English {state.locale === "en-US" && <Check size={14} />}</button>
                    <button aria-pressed={state.locale === "zh-CN"} className={state.locale === "zh-CN" ? "active" : ""} onClick={() => void setLocale("zh-CN")}>简体中文 {state.locale === "zh-CN" && <Check size={14} />}</button>
                  </div>
                </SettingsSection>
                <SettingsSection title={t("settings.sampling")}>
                  <div className="segmented-control wide">{[500, 1000, 2000, 5000].map((value) => <button key={value} aria-pressed={state.samplingMs === value} className={state.samplingMs === value ? "active" : ""} onClick={() => state.setPreference("samplingMs", value)}>{value >= 1000 ? `${value / 1000}s` : `${value}ms`}</button>)}</div>
                </SettingsSection>
                <ToggleRow label={t("settings.demoMode")} value={state.demoMode} onChange={(value) => state.setDemoMode(value)} />
              </>
            )}
            {tab === "visual" && (
              <>
                <SettingsSection title={t("settings.density")}><input className="range-control" aria-label={t("settings.density")} aria-valuetext={`${Math.round(state.nodeDensity * 100)}%`} type="range" min="0.35" max="1" step="0.05" value={state.nodeDensity} onChange={(event) => state.setPreference("nodeDensity", Number(event.target.value))} /><output>{Math.round(state.nodeDensity * 100)}%</output></SettingsSection>
                <ToggleRow label={t("settings.labels")} value={state.labelsAlwaysVisible} onChange={(value) => state.setPreference("labelsAlwaysVisible", value)} />
                <ToggleRow label={t("settings.motion")} value={state.reducedMotion} onChange={(value) => state.setPreference("reducedMotion", value)} />
                <ToggleRow label={t("settings.particles")} value={state.particlesEnabled} onChange={(value) => state.setPreference("particlesEnabled", value)} />
                <OrganismMapping processNames={processNames} processName={processNames.includes(mappedProcess) ? mappedProcess : (processNames[0] ?? "")} onProcessChange={setMappedProcess} />
                <button className="settings-link" onClick={() => { state.setSettingsOpen(false); state.setThemeStudioOpen(true); }}>{t("settings.themeAuthoring")}<ChevronRight size={16} /></button>
              </>
            )}
            {tab === "display" && (
              <>
                <SettingsSection title={t("settings.display")}>
                  <div className="mode-cards">{(["windowed", "fullscreen", "wallpaper"] as const).map((mode) => <button key={mode} disabled={changingDisplay} aria-pressed={state.displayMode === mode} className={state.displayMode === mode ? "active" : ""} onClick={() => void changeDisplay(mode)}><span className={`mode-illustration ${mode}`} /><strong>{t(`modes.${mode}`)}</strong></button>)}</div>
                </SettingsSection>
                {displayError && <p className="display-mode-error" role="alert">{t("modes.changeFailed")}</p>}
                <SettingsSection title={t("settings.animationFps")}>
                  <div className="segmented-control wide">{([30, 60, 120] as AnimationFps[]).map((fps) => <button key={fps} aria-pressed={state.animationFps === fps} className={state.animationFps === fps ? "active" : ""} onClick={() => state.setPreference("animationFps", fps)}>{fps} Hz</button>)}</div>
                  <small className="setting-hint">{t("settings.animationFpsHint")}</small>
                </SettingsSection>
                <ToggleRow label={t("settings.celestialCycle")} value={state.celestialCycleEnabled} onChange={(value) => state.setPreference("celestialCycleEnabled", value)} />
                <small className="setting-hint display-setting-hint">{t("settings.celestialCycleHint")}</small>
              </>
            )}
            {tab === "privacy" && (
              <div className="privacy-card"><ShieldCheck size={28} /><h3>{t("settings.privacy")}</h3><p>{t("settings.privacyText")}</p><ul><li>{t("settings.privacyTelemetry")}</li><li>{t("settings.privacyAccount")}</li><li>{t("settings.privacyContent")}</li><li>{t("settings.privacyThemes")}</li></ul></div>
            )}
            {tab === "about" && (
              <div className="about-card"><Leaf size={30} /><h3>{t("app.name")}</h3><strong>v0.1.0</strong><p>{t("settings.aboutText")}</p><h4>{t("settings.fontLicenses")}</h4><ul><li>Inter · SIL OFL 1.1</li><li>Space Grotesk · SIL OFL 1.1</li><li>JetBrains Mono · SIL OFL 1.1</li><li>Grenze Gotisch · SIL OFL 1.1</li><li>Spectral · SIL OFL 1.1</li><li>Noto Sans / Serif SC · SIL OFL 1.1</li></ul><code>THIRD_PARTY_NOTICES.md</code></div>
            )}
            <button className="danger-quiet" onClick={state.resetPreferences}>{t("settings.reset")}</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function OrganismMapping({ processNames, processName, onProcessChange }: { processNames: string[]; processName: string; onProcessChange: (name: string) => void }) {
  const { t } = useTranslation();
  const state = useAppStore();
  const process = state.snapshot.processes.find((item) => item.name === processName);
  if (!process) return null;
  const key = normalizeProcessName(process.name);
  const override = state.processStyleOverrides[key];
  const resolved = resolveOrganismStyle(process, state.processStyleOverrides);
  return (
    <section className="organism-mapping">
      <header><div><strong>{t("settings.organismMapping")}</strong><small>{t("settings.organismMappingHint")}</small></div><span>{t(`organisms.categories.${classifyProcess(process)}`)}</span></header>
      <div className="mapping-fields">
        <label>{t("settings.application")}<select value={processName} onChange={(event) => onProcessChange(event.target.value)}>{processNames.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
        <label>{t("settings.fixedStyle")}<select value={override ?? "auto"} onChange={(event) => state.setProcessStyleOverride(process.name, event.target.value === "auto" ? null : event.target.value as OrganismStyleId)}><option value="auto">{t("settings.autoClassify")} · {t(`organisms.styles.${resolved}`)}</option>{organismStyleOptions.map((option) => <option key={option.id} value={option.id}>{t(option.labelKey)}</option>)}</select></label>
      </div>
    </section>
  );
}

function SettingsSection({ title, icon: Icon, children }: { title: string; icon?: typeof Languages; children: React.ReactNode }) {
  return <section className="settings-section"><div className="section-label">{Icon && <Icon size={15} />}{title}</div><div className="section-control">{children}</div></section>;
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <button className="toggle-row" role="switch" aria-checked={value} onClick={() => onChange(!value)}><span>{label}</span><span className={`toggle ${value ? "on" : ""}`} aria-hidden="true"><span /></span></button>;
}
