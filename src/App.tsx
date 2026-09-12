import { Leaf, MemoryStick, MonitorUp } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { GardenCanvas } from "./components/GardenCanvas";
import { Inspector } from "./components/Inspector";
import { SettingsDrawer } from "./components/SettingsDrawer";
import { Sidebar } from "./components/Sidebar";
import { ThemeStudio } from "./components/ThemeStudio";
import { Timeline } from "./components/Timeline";
import { TopBar } from "./components/TopBar";
import { applyTheme, builtInThemes } from "./design-system/themes/builtIn";
import { useSystemFeed } from "./hooks/useSystemFeed";
import { useProcessIcons } from "./hooks/useProcessIcons";
import { formatBytes, formatPercent } from "./i18n/formatters";
import { useAppStore } from "./stores/appStore";
import { syncBrowserFullscreenExit, useDisplayMode } from "./hooks/useDisplayMode";

export default function App() {
  const { t } = useTranslation();
  const state = useAppStore(useShallow(({ snapshot: _snapshot, history: _history, events: _events, ...shell }) => shell));
  const themes = useMemo(() => [...builtInThemes, ...state.customThemes], [state.customThemes]);
  const activeTheme = themes.find((theme) => theme.id === state.themeId) ?? builtInThemes[0];
  const visualTheme = activeTheme.id === "eldritch" || activeTheme.basedOn === "eldritch" ? "eldritch" : "garden";
  const setDisplayMode = useDisplayMode();
  const [displayError, setDisplayError] = useState(false);
  const restoreWindowed = useCallback(async () => {
    setDisplayError(false);
    setDisplayError(!(await setDisplayMode("windowed")));
  }, [setDisplayMode]);

  useEffect(() => applyTheme(activeTheme, state.locale), [activeTheme, state.locale]);
  useLayoutEffect(() => {
    document.documentElement.dataset.reducedMotion = String(state.reducedMotion);
    document.documentElement.dataset.paused = String(state.paused);
  }, [state.reducedMotion, state.paused]);
  useEffect(() => {
    document.documentElement.lang = state.locale;
    const keyHandler = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        if (state.settingsOpen || state.themeStudioOpen || state.displayMode === "wallpaper") return;
        event.preventDefault();
        document.querySelector<HTMLInputElement>(".search-control input")?.focus();
      }
      if (event.key === "Escape") {
        if (state.themeStudioOpen) { state.setThemeStudioOpen(false); return; }
        if (state.settingsOpen) { state.setSettingsOpen(false); return; }
        if (state.themeMenuOpen) { state.setThemeMenuOpen(false); return; }
        // Also cancels an entering mode whose platform operation is still pending.
        void restoreWindowed();
      }
    };
    window.addEventListener("keydown", keyHandler);
    return () => window.removeEventListener("keydown", keyHandler);
  }, [state.displayMode, state.locale, state.settingsOpen, state.themeMenuOpen, state.themeStudioOpen, state.setSettingsOpen, state.setThemeMenuOpen, state.setThemeStudioOpen, restoreWindowed]);
  useEffect(() => {
    if ("__TAURI_INTERNALS__" in window) return;
    const syncFullscreen = () => { void syncBrowserFullscreenExit().then((ok) => { if (!ok) setDisplayError(true); }); };
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);
  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void import("@tauri-apps/api/event").then(({ listen }) => listen("process-garden://restore-windowed", () => { void restoreWindowed(); })).then((dispose) => {
      if (disposed) dispose();
      else unlisten = dispose;
    }).catch((error: unknown) => console.warn("Could not subscribe to window restore events", error));
    return () => { disposed = true; unlisten?.(); };
  }, [restoreWindowed]);

  return (
    <div className={`app-shell mode-${state.displayMode} theme-${visualTheme} theme-id-${state.themeId}`}>
      <SystemFeed />
      <div className="ambient-layer" />
      <a className="skip-link" href="#main-content">{t("a11y.skipToGarden")}</a>
      <TopBar />
      <main id="main-content" className="workspace" tabIndex={-1}>
        <Sidebar />
        <GardenCanvas />
        <Inspector />
        <Timeline />
      </main>
      {state.displayMode === "wallpaper" && <WallpaperHud />}
      <SettingsDrawer />
      <ThemeStudio />
      {displayError && <p className="display-mode-error app-display-mode-error" role="alert">{t("modes.changeFailed")}</p>}
    </div>
  );
}

function SystemFeed() {
  const processes = useAppStore((state) => state.snapshot.processes);
  useSystemFeed();
  useProcessIcons(processes);
  return null;
}

function WallpaperHud() {
  const { t } = useTranslation();
  const snapshot = useAppStore((state) => state.snapshot);
  const locale = useAppStore((state) => state.locale);
  return (
    <div className="wallpaper-hud">
      <div className="wallpaper-brand"><Leaf size={16} /><span>{t("app.name")}</span><i /></div>
      <div className="wallpaper-metrics"><span><MonitorUp size={14} />{formatPercent(snapshot.cpuPercent, locale)}</span><span><MemoryStick size={14} />{formatBytes(snapshot.memoryUsedBytes, locale)}</span><span>{snapshot.processCount} {t("metrics.processes")}</span></div>
      <small>{t("modes.ambientHint")}</small>
    </div>
  );
}
