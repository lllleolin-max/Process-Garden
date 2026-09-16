import { Expand, Languages, Leaf, List, Maximize2, MonitorUp, Pause, Play, Plus, Search, Settings, Sparkles, X } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { builtInThemes } from "../design-system/themes/builtIn";
import { useDisplayMode } from "../hooks/useDisplayMode";
import { useOverlay } from "../hooks/useOverlay";
import i18n from "../i18n/config";
import { useAppStore } from "../stores/appStore";
import "../styles/overlays.css";
import { ProcessExplorer } from "./ProcessExplorer";
import { FeedHealthNotice } from "./FeedHealthNotice";

export function TopBar() {
  const { t } = useTranslation();
  const state = useAppStore(useShallow(({ snapshot: _snapshot, history: _history, events: _events, ...controls }) => controls));
  const setMode = useDisplayMode();
  const [displayError, setDisplayError] = useState(false);
  const [processListOpen, setProcessListOpen] = useState(false);
  const [changingDisplay, setChangingDisplay] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const menuId = useId();
  const themeMenu = useOverlay<HTMLDivElement>(state.themeMenuOpen, () => state.setThemeMenuOpen(false), {
    modal: false, restoreFocusSelector: "[data-theme-trigger]", initialFocusSelector: '.theme-option[aria-pressed="true"]'
  });
  const themes = useMemo(() => [...builtInThemes, ...state.customThemes], [state.customThemes]);

  const changeLocale = async () => {
    const locale = state.locale === "en-US" ? "zh-CN" : "en-US";
    state.setLocale(locale);
    await i18n.changeLanguage(locale);
  };

  const changeDisplay = async (mode: "windowed" | "fullscreen" | "wallpaper") => {
    setDisplayError(false);
    setChangingDisplay(true);
    setDisplayError(!(await setMode(mode)));
    setChangingDisplay(false);
  };

  return (
    <><header className="topbar">
      <div className="brand-lockup">
        <FeedHealthNotice />
        <span className="brand-mark"><Leaf size={20} /></span>
        <div>
          <strong>{t("app.name")}</strong>
          <small>{t("app.tagline")}</small>
        </div>
      </div>

      <div className="topbar-center">
        <div className="search-control">
          <Search size={16} />
          <input
            ref={searchRef}
            value={state.searchQuery}
            onChange={(event) => state.setSearchQuery(event.target.value)}
            placeholder={t("nav.search")}
            aria-label={t("nav.search")}
            onKeyDown={(event) => {
              if (event.key === "Escape" && state.searchQuery) {
                event.preventDefault();
                event.stopPropagation();
                state.setSearchQuery("");
              }
            }}
          />
          {state.searchQuery && <button className="icon-button search-clear" onClick={() => { state.setSearchQuery(""); searchRef.current?.focus(); }} aria-label={t("a11y.clearSearch")}><X size={13} /></button>}
          <kbd>Ctrl/⌘ K</kbd>
        </div>
      </div>

      <nav className="topbar-actions" aria-label={t("a11y.appControls")}>
        <button className="icon-button" data-process-list-trigger aria-label={t("processList.title")} title={t("processList.title")} aria-haspopup="dialog" aria-expanded={processListOpen} onClick={() => { state.setThemeMenuOpen(false); setProcessListOpen(true); }}><List size={18} /></button>
        <button className={`live-pill ${state.paused ? "paused" : ""}`} onClick={() => state.setPaused(!state.paused)} aria-pressed={state.paused} aria-label={state.paused ? t("nav.resume") : t("nav.pause")} title={state.paused ? t("nav.resume") : t("nav.pause")}>
          <span className="live-dot" />
          {state.paused ? <Play size={13} /> : <Pause size={13} />}
          {state.paused ? t("nav.resume") : t("common.live")}
        </button>

        <button className="icon-button text-button" onClick={() => state.setDemoMode(!state.demoMode)} aria-pressed={state.demoMode} aria-label={t("a11y.toggleData")}>
          <Sparkles size={16} /> {state.demoMode ? t("common.demo") : t("common.live")}
        </button>

        <div className="popover-anchor">
          <button className={`icon-button ${state.themeMenuOpen ? "active" : ""}`} data-theme-trigger onClick={() => state.setThemeMenuOpen(!state.themeMenuOpen)} aria-label={t("a11y.switchTheme")} aria-haspopup="dialog" aria-expanded={state.themeMenuOpen} aria-controls={themeMenu.present ? menuId : undefined}>
            <span className="theme-swatch" />
          </button>
          {themeMenu.present && (
            <div ref={themeMenu.surfaceRef} id={menuId} role="dialog" aria-label={t("theme.title")} aria-hidden={!state.themeMenuOpen} inert={!state.themeMenuOpen} tabIndex={-1} data-overlay-root="popover" data-state={themeMenu.state} className="theme-popover popover-card">
              <div className="popover-title"><span>{t("theme.title")}</span><small>{t("theme.current")}</small></div>
              <div className="theme-grid">
                {themes.map((theme) => (
                  <button key={theme.id} className={`theme-option ${state.themeId === theme.id ? "active" : ""}`} aria-pressed={state.themeId === theme.id} onClick={() => state.setTheme(theme.id)}>
                    <span className="theme-preview" style={{ background: `radial-gradient(circle at 35% 38%, ${theme.colors.primary}, transparent 18%), radial-gradient(circle at 68% 62%, ${theme.colors.tertiary}, transparent 16%), ${theme.colors.background}` }} />
                    <span>{theme.name[state.locale]}</span>
                    <small>{builtInThemes.some((item) => item.id === theme.id) ? t("theme.builtIn") : t("theme.custom")}</small>
                  </button>
                ))}
                <button className="theme-option add-theme-option" onClick={() => { state.setThemeMenuOpen(false); state.setThemeStudioOpen(true); }}>
                  <span className="theme-preview"><Plus size={21} /></span>
                  <span>{t("theme.add")}</span>
                  <small>{t("theme.create")}</small>
                </button>
              </div>
            </div>
          )}
        </div>

        <button className="icon-button" onClick={() => void changeLocale()} aria-label={t("a11y.switchLanguage")} title={t("settings.language")}>
          <Languages size={17} /><span className="language-code">{state.locale === "zh-CN" ? "中" : "EN"}</span>
        </button>
        <button className={`icon-button ${state.displayMode === "wallpaper" ? "active" : ""}`} disabled={changingDisplay} aria-pressed={state.displayMode === "wallpaper"} aria-label={t("nav.wallpaper")} onClick={() => void changeDisplay(state.displayMode === "wallpaper" ? "windowed" : "wallpaper")} title={t("nav.wallpaper")}>
          <MonitorUp size={17} />
        </button>
        <button className={`icon-button ${state.displayMode === "fullscreen" ? "active" : ""}`} disabled={changingDisplay} aria-pressed={state.displayMode === "fullscreen"} aria-label={state.displayMode === "fullscreen" ? t("nav.windowed") : t("nav.fullscreen")} onClick={() => void changeDisplay(state.displayMode === "fullscreen" ? "windowed" : "fullscreen")} title={t("nav.fullscreen")}>
          {state.displayMode === "fullscreen" ? <Expand size={17} /> : <Maximize2 size={17} />}
        </button>
        <button className="icon-button" data-settings-trigger aria-haspopup="dialog" aria-expanded={state.settingsOpen} onClick={() => { state.setThemeMenuOpen(false); state.setSettingsOpen(true); }} aria-label={t("a11y.openSettings")}>
          <Settings size={17} />
        </button>
      </nav>
      {displayError && <p className="display-mode-error" role="alert">{t("modes.changeFailed")}</p>}
    </header><ProcessExplorer open={processListOpen} onClose={() => setProcessListOpen(false)} /></>
  );
}
