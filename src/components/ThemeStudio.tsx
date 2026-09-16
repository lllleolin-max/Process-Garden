import { hasMaw } from "../themes/builtinArtwork";
import { Download, FileUp, Palette, Plus, Trash2, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { builtInThemes } from "../design-system/themes/builtIn";
import { useAppStore } from "../stores/appStore";
import { useOverlay } from "../hooks/useOverlay";
import { MAX_THEME_PACKAGE_BYTES, unpackThemePackage, serializeThemePackage, validatePackageArtwork } from "../themes/package";
import { artworkFiles, hydrateArtwork, saveArtwork } from "../themes/assets";
import { ThemeArtwork, type DraftArtwork } from "./ThemeArtwork";
import { captureStyles, type BuiltInThemeId, type CaptureStyle, type ThemeManifest } from "../types/theme";
import { captureProfiles } from "../themes/lifecycle";
import "../styles/overlays.css";

type FontPreset = "theme" | "modern" | "gothic";

function typographyFor(preset: FontPreset, base: ThemeManifest): ThemeManifest["typography"] {
  if (preset === "modern") return { ...base.typography, display: "Space Grotesk Variable", body: "Inter Variable", editorial: "Inter Variable", cjkDisplay: "Noto Sans SC", cjkBody: "Noto Sans SC" };
  if (preset === "gothic") return { ...base.typography, display: "Grenze Gotisch", body: "Inter Variable", editorial: "Spectral", cjkDisplay: "Noto Serif SC", cjkBody: "Noto Sans SC" };
  return structuredClone(base.typography);
}

async function downloadTheme(theme: ThemeManifest) {
  const archive = serializeThemePackage(theme, await artworkFiles(theme));
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
  const [draftArtwork, setDraftArtwork] = useState<DraftArtwork>({});
  const draftRef = useRef(draftArtwork);
  draftRef.current = draftArtwork;
  const [pendingImport, setPendingImport] = useState<{ theme: ThemeManifest; files: Record<string, Uint8Array> } | null>(null);
  const [baseId, setBaseId] = useState<BuiltInThemeId>("garden");
  const [backgroundBase, setBackgroundBase] = useState<BuiltInThemeId>("garden");
  const [fontPreset, setFontPreset] = useState<FontPreset>("theme");
  const [name, setName] = useState("");
  const [primary, setPrimary] = useState("#72ef9b");
  const [secondary, setSecondary] = useState("#36cfe4");
  const [glow, setGlow] = useState(0.75);
  const [particles, setParticles] = useState(0.7);
  const [captureStyle, setCaptureStyle] = useState<CaptureStyle | "">("");
  const [error, setError] = useState<"" | "invalid" | "nameExists" | "exportFailed" | "storageFailed">("");
  const themes = useMemo(() => [...builtInThemes, ...state.customThemes], [state.customThemes]);
  useEffect(() => {
    if (!state.themeStudioOpen) {
      importVersion.current += 1;
      setImporting(false);
      setError("");
      Object.values(draftRef.current).forEach((image) => URL.revokeObjectURL(image.url));
      setDraftArtwork({});
      setPendingImport(null);
    }
  }, [state.themeStudioOpen]);
  useEffect(() => () => { Object.values(draftRef.current).forEach((image) => URL.revokeObjectURL(image.url)); }, []);
  if (!overlay.present) return null;

  const baseTheme = builtInThemes.find((theme) => theme.id === baseId) ?? builtInThemes[0];
  const backdropTheme = builtInThemes.find((theme) => theme.id === backgroundBase) ?? builtInThemes[0];
  const previewTypography = typographyFor(fontPreset, baseTheme);

  const createTheme = () => {
    setError("");
    const base = baseTheme;
    const rawSlug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 49) || `custom-${Date.now()}`;
    const slug = rawSlug.length < 2 ? `${rawSlug}-theme` : rawSlug;
    if (themes.some((theme) => theme.id === slug || Object.values(theme.name).some((title) => title.toLowerCase() === name.trim().toLowerCase()))) {
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
    const entries = Object.entries(draftArtwork).filter(([role]) => role !== "maw" || hasMaw(backgroundBase));
    if (captureStyle) { theme.schemaVersion = 2; theme.captureStyle = captureStyle; }
    if (entries.length) {
      theme.schemaVersion = 2;
      theme.assets = Object.fromEntries(entries.map(([role, image]) => [role, image.path]));
      void commitTheme(theme, Object.fromEntries(entries.map(([, image]) => [image.path, image.bytes])));
    } else if (!state.installTheme(theme)) setError("storageFailed");
  };

  const commitTheme = async (theme: ThemeManifest, files: Record<string, Uint8Array>) => {
    const version = ++importVersion.current;
    setImporting(true); setError("");
    try {
      await saveArtwork(files);
      await hydrateArtwork(theme);
      if (version !== importVersion.current || !useAppStore.getState().themeStudioOpen) return;
      if (!useAppStore.getState().installTheme(theme)) throw new Error("storage");
    } catch { if (version === importVersion.current) setError("storageFailed"); }
    finally { if (version === importVersion.current) setImporting(false); }
  };

  const importTheme = async (file: File) => {
    const version = ++importVersion.current;
    setImporting(true);
    setError("");
    setPendingImport(null);
    try {
      if (file.size > MAX_THEME_PACKAGE_BYTES) throw new Error("theme package too large");
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (version !== importVersion.current || !useAppStore.getState().themeStudioOpen) return;
      const parsed = unpackThemePackage(file.name, bytes);
      if (builtInThemes.some((theme) => theme.id === parsed.theme.id)) throw new Error("reserved theme id");
      await validatePackageArtwork(parsed.theme, parsed.files);
      if (version !== importVersion.current || !useAppStore.getState().themeStudioOpen) return;
      setPendingImport(parsed);
    } catch {
      if (version === importVersion.current) setError("invalid");
    } finally {
      if (version === importVersion.current) setImporting(false);
    }
  };

  const exportTheme = async (theme: ThemeManifest) => {
    try { await downloadTheme(theme); }
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
            {backgroundBase !== "minimal" && <label><span>{t("artwork.captureStyle")}</span><select value={captureStyle} onChange={(event) => setCaptureStyle(event.target.value as CaptureStyle | "")}><option value="">{t("artwork.captureAuto")}</option>{captureStyles.map((style) => <option key={style} value={style}>{state.locale === "zh-CN" ? captureProfiles[style].zh : captureProfiles[style].en}</option>)}</select></label>}
            <small className="capture-module-note">{t("artwork.captureNote")}</small>
            {state.themeStudioOpen && <ThemeArtwork family={backgroundBase} captureStyle={captureStyle || undefined} draft={draftArtwork} onChange={setDraftArtwork} busy={importing} onBusy={setImporting} />}
            {error && <p id={`${studioId}-error`} className="form-error" role="alert">{t(`${error === "storageFailed" ? "artwork" : "theme"}.${error}`)}</p>}
            <div className="studio-actions"><input ref={fileRef} type="file" accept=".json,.pgtheme,application/json,application/zip" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void importTheme(file); }} /><button type="button" className="secondary-button" disabled={importing} onClick={() => fileRef.current?.click()}><FileUp size={15} />{t(importing ? "theme.importing" : "theme.import")}</button><button type="submit" className="primary-button" disabled={importing}><Plus size={15} />{t("common.save")}</button></div>
          </form>
          <div className="studio-preview" style={{ backgroundImage: draftArtwork.background ? `linear-gradient(#0003,#0009),url("${draftArtwork.background.url}")` : undefined, backgroundSize: "cover", backgroundPosition: "center", "--preview-primary": primary, "--preview-secondary": secondary, "--preview-background": backdropTheme.colors.background, "--preview-glow": 0.78 + glow * .28, "--preview-particles": particles, "--preview-font": state.locale === "zh-CN" ? previewTypography.cjkDisplay : previewTypography.display } as React.CSSProperties}>
            <div className="preview-orbit"><span /><span /><span /><div className={`preview-core${draftArtwork.core ? " with-artwork" : ""}`}>{draftArtwork.core ? <img className="preview-artwork-core" src={draftArtwork.core.url} alt={t("artwork.corePreview")} /> : <Palette size={28} />}</div></div>
            <small>{t("theme.preview")}</small><strong>{name || t(`theme.${baseId}`)}</strong>
          </div>
        </div>
        {pendingImport && <ImportPreview value={pendingImport} busy={importing} replacing={state.customThemes.some((theme) => theme.id === pendingImport.theme.id)} onCancel={() => setPendingImport(null)} onApply={() => void commitTheme(pendingImport.theme, pendingImport.files)} locale={state.locale} />}
        <div className="installed-themes">
          {themes.map((theme) => <div key={theme.id} className="installed-theme" aria-current={state.themeId === theme.id ? "true" : undefined}><span className="mini-swatch" style={{ background: theme.colors.primary }} /><span><strong>{theme.name[state.locale]}</strong><small>{theme.id} · v{theme.version}</small></span><button disabled={importing} onClick={() => state.setTheme(theme.id)} aria-label={`${t("artwork.apply")} · ${theme.name[state.locale]}`} title={t("artwork.apply")}><Palette size={15} /></button><button disabled={importing} onClick={() => void exportTheme(theme)} aria-label={`${t("common.export")} · ${theme.name[state.locale]}`} title={t("common.export")}><Download size={15} /></button>{!builtInThemes.some((item) => item.id === theme.id) && <button disabled={importing} onClick={() => state.deleteTheme(theme.id)} aria-label={`${t("common.delete")} · ${theme.name[state.locale]}`} title={t("common.delete")}><Trash2 size={15} /></button>}</div>)}
        </div>
      </section>
    </div>
  );
}

function ImportPreview({ value, busy, replacing, locale, onCancel, onApply }: {
  value: { theme: ThemeManifest; files: Record<string, Uint8Array> }; busy: boolean; replacing: boolean;
  locale: "zh-CN" | "en-US"; onCancel: () => void; onApply: () => void;
}) {
  const { t } = useTranslation();
  const [images, setImages] = useState<Record<string, string>>({});
  useEffect(() => {
    const next = Object.fromEntries(Object.entries(value.files).map(([path, bytes]) => [path, URL.createObjectURL(new Blob([bytes as BlobPart], { type: "image/png" }))]));
    setImages(next);
    return () => Object.values(next).forEach((url) => URL.revokeObjectURL(url));
  }, [value]);
  return <section className="theme-import-preview" aria-label={t("artwork.importPreview")}>
    <h3>{t("artwork.importPreview")} · {value.theme.name[locale]}</h3>
    <p>{t(replacing ? "artwork.replaceNotice" : "artwork.importNotice")}</p>
    <div className="artwork-import-images">{Object.entries(value.theme.assets ?? {}).map(([role, path]) => <img key={role} src={images[path]} alt={role} />)}</div>
    <div className="studio-actions"><button className="secondary-button" disabled={busy} onClick={onCancel}>{t("artwork.cancel")}</button><button autoFocus className="primary-button" disabled={busy} onClick={onApply}>{t("artwork.install")}</button></div>
  </section>;
}
