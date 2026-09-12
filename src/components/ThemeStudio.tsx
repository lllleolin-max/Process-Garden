import { Download, FileUp, Palette, Plus, Trash2, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { builtInThemes } from "../design-system/themes/builtIn";
import { useAppStore } from "../stores/appStore";
import { useOverlay } from "../hooks/useOverlay";
import { MAX_THEME_PACKAGE_BYTES, parseThemePackage, serializeThemePackage } from "../themes/package";
import type { BuiltInThemeId, ThemeManifest } from "../types/theme";
import "../styles/overlays.css";

type FontPreset = "theme" | "modern" | "gothic";

function typographyFor(preset: FontPreset, base: ThemeManifest): ThemeManifest["typography"] {
  if (preset === "modern") return { ...base.typography, display: "Space Grotesk Variable", body: "Inter Variable", editorial: "Inter Variable", cjkDisplay: "Noto Sans SC", cjkBody: "Noto Sans SC" };
  if (preset === "gothic") return { ...base.typography, display: "Grenze Gotisch", body: "Inter Variable", editorial: "Spectral", cjkDisplay: "Noto Serif SC", cjkBody: "Noto Sans SC" };
  return structuredClone(base.typography);
}

function downloadTheme(theme: ThemeManifest) {
  const archive = serializeThemePackage(theme);
  const blob = new Blob([archive as BlobPart], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${theme.id}.pgtheme`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ThemeStudio() {
  const { t } = useTranslation();
  const state = useAppStore();
  const studioId = useId();
  const overlay = useOverlay(state.themeStudioOpen, () => state.setThemeStudioOpen(false), { restoreFocusSelector: "[data-theme-trigger]", initialFocusSelector: "[data-theme-name]" });
  const fileRef = useRef<HTMLInputElement>(null);
  const importVersion = useRef(0);
  const [importing, setImporting] = useState(false);
  const [baseId, setBaseId] = useState<BuiltInThemeId>("garden");
  const [backgroundBase, setBackgroundBase] = useState<BuiltInThemeId>("garden");
  const [fontPreset, setFontPreset] = useState<FontPreset>("theme");
  const [name, setName] = useState("");
  const [primary, setPrimary] = useState("#72ef9b");
  const [secondary, setSecondary] = useState("#36cfe4");
  const [glow, setGlow] = useState(0.75);
  const [particles, setParticles] = useState(0.7);
  const [error, setError] = useState<"" | "invalid" | "nameExists" | "exportFailed">("");
  const themes = useMemo(() => [...builtInThemes, ...state.customThemes], [state.customThemes]);
  useEffect(() => {
    if (!state.themeStudioOpen) {
      importVersion.current += 1;
      setImporting(false);
      setError("");
    }
  }, [state.themeStudioOpen]);
  if (!overlay.present) return null;

  const baseTheme = builtInThemes.find((theme) => theme.id === baseId) ?? builtInThemes[0];
  const backdropTheme = builtInThemes.find((theme) => theme.id === backgroundBase) ?? builtInThemes[0];
  const previewTypography = typographyFor(fontPreset, baseTheme);

  const createTheme = () => {
    setError("");
    const base = baseTheme;
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-|-$/g, "") || `custom-${Date.now()}`;
    if (themes.some((theme) => theme.id === slug)) {
      setError("nameExists");
      overlay.surfaceRef.current?.querySelector<HTMLInputElement>("[data-theme-name]")?.focus();
      return;
    }
    const theme: ThemeManifest = {
      ...structuredClone(base),
      id: slug,
      name: { "en-US": name.trim() || "Custom Garden", "zh-CN": name.trim() || "自定义花园" },
      version: "1.0.0",
      author: "Local user",
      basedOn: backgroundBase,
      colors: { ...base.colors, primary, secondary, borderStrong: `${primary}75` },
      typography: typographyFor(fontPreset, base),
      effects: { ...base.effects, glow, particles }
    };
    if (!state.installTheme(theme)) setError("invalid");
  };

  const importTheme = async (file: File) => {
    const version = ++importVersion.current;
    setImporting(true);
    setError("");
    try {
      if (file.size > MAX_THEME_PACKAGE_BYTES) throw new Error("theme package too large");
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (version !== importVersion.current || !useAppStore.getState().themeStudioOpen) return;
      const parsed = parseThemePackage(file.name, bytes);
      if (builtInThemes.some((theme) => theme.id === parsed.id)) throw new Error("reserved theme id");
      if (!state.installTheme(parsed)) throw new Error("theme storage failed");
    } catch {
      if (version === importVersion.current) setError("invalid");
    } finally {
      if (version === importVersion.current) setImporting(false);
    }
  };

  const exportTheme = (theme: ThemeManifest) => {
    try { downloadTheme(theme); }
    catch { setError("exportFailed"); }
  };

  return (
    <div className="modal-backdrop" data-overlay-root="modal" data-state={overlay.state} aria-hidden={!state.themeStudioOpen} inert={!state.themeStudioOpen}>
      <section ref={overlay.surfaceRef} className="theme-studio" role="dialog" aria-modal="true" aria-labelledby={`${studioId}-title`} tabIndex={-1}>
        <header className="drawer-header"><div><small>{t("theme.title")}</small><h2 id={`${studioId}-title`}>{t("theme.create")}</h2></div><button className="icon-button" onClick={() => state.setThemeStudioOpen(false)} aria-label={t("a11y.closePanel")}><X size={18} /></button></header>
        <div className="studio-layout">
          <form className="studio-form" onSubmit={(event) => { event.preventDefault(); if (!importing) createTheme(); }} aria-busy={importing}>
            <label><span>{t("theme.name")}</span><input data-theme-name value={name} aria-invalid={error === "nameExists"} aria-describedby={error === "nameExists" ? `${studioId}-error` : undefined} onChange={(event) => { setName(event.target.value); if (error === "nameExists") setError(""); }} placeholder={t("theme.namePlaceholder")} maxLength={48} /></label>
            <div className="studio-field" role="group" aria-label={t("theme.base")}><span>{t("theme.base")}</span><div className="segmented-control wide">{builtInThemes.map((theme) => <button type="button" key={theme.id} aria-pressed={baseId === theme.id} className={baseId === theme.id ? "active" : ""} onClick={() => { const id = theme.id as BuiltInThemeId; setBaseId(id); setBackgroundBase(id); setFontPreset("theme"); setPrimary(theme.colors.primary); setSecondary(theme.colors.secondary); setGlow(theme.effects.glow); setParticles(theme.effects.particles); }}>{theme.name[state.locale]}</button>)}</div></div>
            <div className="studio-field" role="group" aria-label={t("theme.background")}><span>{t("theme.background")}</span><div className="segmented-control wide">{builtInThemes.map((theme) => <button type="button" key={theme.id} aria-pressed={backgroundBase === theme.id} className={backgroundBase === theme.id ? "active" : ""} onClick={() => setBackgroundBase(theme.id as BuiltInThemeId)}>{theme.name[state.locale]}</button>)}</div></div>
            <label><span>{t("theme.fontPreset")}</span><select value={fontPreset} onChange={(event) => setFontPreset(event.target.value as FontPreset)}><option value="theme">{t("theme.fontTheme")}</option><option value="modern">{t("theme.fontModern")}</option><option value="gothic">{t("theme.fontGothic")}</option></select></label>
            <div className="color-fields"><label><span>{t("theme.primary")}</span><input type="color" value={primary} onChange={(event) => setPrimary(event.target.value)} /></label><label><span>{t("theme.secondary")}</span><input type="color" value={secondary} onChange={(event) => setSecondary(event.target.value)} /></label></div>
            <label><span>{t("theme.glow")} · {Math.round(glow * 100)}%</span><input type="range" min="0.2" max="1" step="0.05" value={glow} onChange={(event) => setGlow(Number(event.target.value))} /></label>
            <label><span>{t("theme.particles")} · {Math.round(particles * 100)}%</span><input type="range" min="0" max="1" step="0.05" value={particles} onChange={(event) => setParticles(Number(event.target.value))} /></label>
            {error && <p id={`${studioId}-error`} className="form-error" role="alert">{t(`theme.${error}`)}</p>}
            <div className="studio-actions"><input ref={fileRef} type="file" accept=".json,.pgtheme,application/json,application/zip" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void importTheme(file); }} /><button type="button" className="secondary-button" disabled={importing} onClick={() => fileRef.current?.click()}><FileUp size={15} />{t(importing ? "theme.importing" : "theme.import")}</button><button type="submit" className="primary-button" disabled={importing}><Plus size={15} />{t("common.save")}</button></div>
          </form>
          <div className="studio-preview" style={{ "--preview-primary": primary, "--preview-secondary": secondary, "--preview-background": backdropTheme.colors.background, "--preview-glow": 0.78 + glow * .28, "--preview-particles": particles, "--preview-font": state.locale === "zh-CN" ? previewTypography.cjkDisplay : previewTypography.display } as React.CSSProperties}>
            <div className="preview-orbit"><span /><span /><span /><div className="preview-core"><Palette size={28} /></div></div>
            <small>{t("theme.preview")}</small><strong>{name || t(`theme.${baseId}`)}</strong>
          </div>
        </div>
        <div className="installed-themes">
          {themes.map((theme) => <div key={theme.id} className="installed-theme" aria-current={state.themeId === theme.id ? "true" : undefined}><span className="mini-swatch" style={{ background: theme.colors.primary }} /><span><strong>{theme.name[state.locale]}</strong><small>{theme.id} · v{theme.version}</small></span><button onClick={() => exportTheme(theme)} aria-label={`${t("common.export")} · ${theme.name[state.locale]}`} title={t("common.export")}><Download size={15} /></button>{!builtInThemes.some((item) => item.id === theme.id) && <button onClick={() => state.deleteTheme(theme.id)} aria-label={`${t("common.delete")} · ${theme.name[state.locale]}`} title={t("common.delete")}><Trash2 size={15} /></button>}</div>)}
        </div>
      </section>
    </div>
  );
}
