import { create } from "zustand";
import { builtInThemes, normalizeThemeManifest, validateThemeManifest } from "../design-system/themes/builtIn";
import { demoEvents, makeDemoSnapshot } from "../data/demo";
import { deriveDemoEvent, deriveProcessEvents } from "../data/events";
import { normalizeProcessName, sanitizeOrganismStyleOverrides, type OrganismStyleId } from "../ecology/organisms";
import type { AppLocale } from "../i18n/config";
import type { ProcessEvent, SystemSnapshot, SystemObservation } from "../types/system";
import { toObservation } from "../data/observation";
import { processIdentity } from "../animation/processIdentity";
import type { ThemeId, ThemeManifest } from "../types/theme";

export type DisplayMode = "windowed" | "fullscreen" | "wallpaper";
export type PopulationMode = "ecological" | "exact";
export type AnimationFps = 30 | 60 | 120;

interface Preferences {
  themeId: ThemeId;
  locale: AppLocale;
  demoMode: boolean;
  populationMode: PopulationMode;
  reducedMotion: boolean;
  labelsAlwaysVisible: boolean;
  particlesEnabled: boolean;
  celestialCycleEnabled: boolean;
  nodeDensity: number;
  samplingMs: number;
  animationFps: AnimationFps;
  processStyleOverrides: Record<string, OrganismStyleId>;
}

interface AppState extends Preferences {
  displayMode: DisplayMode;
  paused: boolean;
  selectedPid: number | null;
  searchQuery: string;
  settingsOpen: boolean;
  themeMenuOpen: boolean;
  themeStudioOpen: boolean;
  customThemes: ThemeManifest[];
  snapshot: SystemSnapshot;
  history: SystemObservation[];
  events: ProcessEvent[];
  collector: "native" | "demo";
  setTheme: (id: ThemeId) => void;
  setLocale: (locale: AppLocale) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  setPopulationMode: (mode: PopulationMode) => void;
  setDemoMode: (demo: boolean) => void;
  setPaused: (paused: boolean) => void;
  setSelectedPid: (pid: number | null) => void;
  setSearchQuery: (query: string) => void;
  setSettingsOpen: (open: boolean) => void;
  setThemeMenuOpen: (open: boolean) => void;
  setThemeStudioOpen: (open: boolean) => void;
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  setProcessStyleOverride: (processName: string, style: OrganismStyleId | null) => void;
  installTheme: (theme: ThemeManifest) => boolean;
  deleteTheme: (id: ThemeId) => void;
  ingestSnapshot: (snapshot: SystemSnapshot, collector: "native" | "demo") => void;
  resetPreferences: () => void;
}

function initialLocale(): AppLocale {
  try {
    const saved = localStorage.getItem("process-garden-locale");
    if (saved === "zh-CN" || saved === "en-US") return saved;
  } catch { /* Storage may be unavailable; the current session remains usable. */ }
  return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US";
}

const defaultPreferences: Preferences = {
  themeId: "garden",
  locale: initialLocale(),
  demoMode: !("__TAURI_INTERNALS__" in window),
  populationMode: "ecological",
  reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  labelsAlwaysVisible: false,
  particlesEnabled: true,
  celestialCycleEnabled: true,
  nodeDensity: 0.82,
  samplingMs: 1000,
  animationFps: 60,
  processStyleOverrides: {}
};

function loadPreferences(): Preferences {
  try {
    const saved = JSON.parse(localStorage.getItem("process-garden-preferences") ?? "{}") as Partial<Preferences>;
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return { ...defaultPreferences };
    const preferences = { ...defaultPreferences };
    for (const key of ["demoMode", "reducedMotion", "labelsAlwaysVisible", "particlesEnabled", "celestialCycleEnabled"] as const) {
      if (typeof saved[key] === "boolean") preferences[key] = saved[key];
    }
    if (typeof saved.themeId === "string" && saved.themeId) preferences.themeId = saved.themeId;
    if (saved.locale === "zh-CN" || saved.locale === "en-US") preferences.locale = saved.locale;
    if (saved.populationMode === "ecological" || saved.populationMode === "exact") preferences.populationMode = saved.populationMode;
    if (saved.animationFps === 30 || saved.animationFps === 60 || saved.animationFps === 120) preferences.animationFps = saved.animationFps;
    if (typeof saved.nodeDensity === "number" && Number.isFinite(saved.nodeDensity)) preferences.nodeDensity = Math.min(1, Math.max(0.35, saved.nodeDensity));
    if (typeof saved.samplingMs === "number" && Number.isFinite(saved.samplingMs)) preferences.samplingMs = Math.min(5_000, Math.max(500, saved.samplingMs));
    preferences.processStyleOverrides = sanitizeOrganismStyleOverrides(saved.processStyleOverrides);
    return preferences;
  } catch {
    return defaultPreferences;
  }
}

function loadCustomThemes(): ThemeManifest[] {
  try {
    const saved = JSON.parse(localStorage.getItem("process-garden-custom-themes") ?? "[]") as unknown;
    if (!Array.isArray(saved)) return [];
    return saved.map(normalizeThemeManifest).filter(validateThemeManifest).filter((theme) => !builtInThemes.some((builtIn) => builtIn.id === theme.id));
  } catch {
    return [];
  }
}

function persist(state: AppState) {
  const preferences: Preferences = {
    themeId: state.themeId,
    locale: state.locale,
    demoMode: state.demoMode,
    populationMode: state.populationMode,
    reducedMotion: state.reducedMotion,
    labelsAlwaysVisible: state.labelsAlwaysVisible,
    particlesEnabled: state.particlesEnabled,
    celestialCycleEnabled: state.celestialCycleEnabled,
    nodeDensity: state.nodeDensity,
    samplingMs: state.samplingMs,
    animationFps: state.animationFps,
    processStyleOverrides: state.processStyleOverrides
  };
  try {
    localStorage.setItem("process-garden-preferences", JSON.stringify(preferences));
    localStorage.setItem("process-garden-locale", state.locale);
    localStorage.setItem("process-garden-custom-themes", JSON.stringify(state.customThemes));
  } catch { /* Keep settings active for this session if browser storage is full. */ }
}

const initialPreferences = loadPreferences();
const initialSnapshot = makeDemoSnapshot(0);
const initialHistory = Array.from({ length: 48 }, (_, index) => ({
  ...makeDemoSnapshot(index - 47),
  timestamp: initialSnapshot.timestamp - (47 - index) * initialPreferences.samplingMs
}));
initialHistory[initialHistory.length - 1] = initialSnapshot;

export const useAppStore = create<AppState>((set, get) => ({
  ...initialPreferences,
  displayMode: "windowed",
  paused: false,
  selectedPid: 5521,
  searchQuery: "",
  settingsOpen: false,
  themeMenuOpen: false,
  themeStudioOpen: false,
  customThemes: loadCustomThemes(),
  snapshot: initialSnapshot,
  history: initialHistory.map(toObservation),
  events: demoEvents,
  collector: "demo",
  setTheme: (themeId) => set((state) => { const next = { ...state, themeId, themeMenuOpen: false }; queueMicrotask(() => persist(get())); return next; }),
  setLocale: (locale) => set((state) => { const next = { ...state, locale }; queueMicrotask(() => persist(get())); return next; }),
  setDisplayMode: (displayMode) => set({ displayMode }),
  setPopulationMode: (populationMode) => set((state) => { const next = { ...state, populationMode }; queueMicrotask(() => persist(get())); return next; }),
  setDemoMode: (demoMode) => set((state) => { const next = { ...state, demoMode }; queueMicrotask(() => persist(get())); return next; }),
  setPaused: (paused) => set({ paused }),
  setSelectedPid: (selectedPid) => set({ selectedPid }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setThemeMenuOpen: (themeMenuOpen) => set({ themeMenuOpen }),
  setThemeStudioOpen: (themeStudioOpen) => set({ themeStudioOpen }),
  setPreference: (key, value) => set((state) => { const next = { ...state, [key]: value } as AppState; queueMicrotask(() => persist(get())); return next; }),
  setProcessStyleOverride: (processName, style) => set((state) => {
    const key = normalizeProcessName(processName);
    const processStyleOverrides = { ...state.processStyleOverrides };
    if (style) processStyleOverrides[key] = style; else delete processStyleOverrides[key];
    const next = { ...state, processStyleOverrides };
    queueMicrotask(() => persist(get()));
    return next;
  }),
  installTheme: (theme) => {
    let installed = false;
    if (!validateThemeManifest(theme) || builtInThemes.some((builtIn) => builtIn.id === theme.id)) return false;
    set((state) => {
      const customThemes = [...state.customThemes.filter((item) => item.id !== theme.id), theme];
      const next = { ...state, customThemes, themeId: theme.id, themeStudioOpen: false };
      try {
        localStorage.setItem("process-garden-custom-themes", JSON.stringify(customThemes));
        installed = true;
        return next;
      } catch {
        return state;
      }
    });
    if (installed) queueMicrotask(() => persist(get()));
    return installed;
  },
  deleteTheme: (id) => set((state) => {
    if (builtInThemes.some((theme) => theme.id === id)) return state;
    const customThemes = state.customThemes.filter((theme) => theme.id !== id);
    const next = { ...state, customThemes, themeId: state.themeId === id ? "garden" : state.themeId };
    queueMicrotask(() => persist(get()));
    return next;
  }),
  ingestSnapshot: (snapshot, collector) => set((state) => {
    const sameCollector = collector === state.collector;
    if (state.paused || !Number.isFinite(snapshot.timestamp) || snapshot.timestamp < 0
      || (sameCollector && snapshot.timestamp <= state.snapshot.timestamp)) return state;
    const lifecycleEvents = collector === "native" && sameCollector ? deriveProcessEvents(state.snapshot, snapshot) : [];
    const demoEvent = collector === "demo" && sameCollector ? deriveDemoEvent(state.snapshot, snapshot) : null;
    const newEvents = [...lifecycleEvents, ...(demoEvent ? [demoEvent] : [])];
    const previousEvents = sameCollector ? state.events : [];
    const previousSelection = state.snapshot.processes.find(process => process.pid === state.selectedPid);
    const nextSelection = snapshot.processes.find(process => process.pid === state.selectedPid);
    // Selection belongs to a lifetime, not a reusable PID or the next top row.
    const selectedPid = sameCollector && previousSelection && nextSelection
      && processIdentity(previousSelection) === processIdentity(nextSelection) ? nextSelection.pid : null;
    return {
      snapshot,
      collector,
      selectedPid,
      history: sameCollector ? [...state.history.slice(-119), toObservation(snapshot)] : [toObservation(snapshot)],
      events: newEvents.length ? [...newEvents, ...previousEvents].slice(0, 80) : previousEvents
    };
  }),
  resetPreferences: () => set((state) => {
    const next = { ...state, ...defaultPreferences, customThemes: [], themeId: "garden" };
    queueMicrotask(() => persist(get()));
    return next;
  })
}));
