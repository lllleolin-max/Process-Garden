import { hasMaw } from "../themes/builtinArtwork";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { assetSpecs, assetSize, assetCellLabels, buildThemePrompt } from "../themes/prompts";
import { imagePath, MAX_ASSET_BYTES, MAX_IMAGE_BYTES, validatePng } from "../themes/assets";
import { themeAssetRoles, type BuiltInThemeId, type ThemeAssetRole, type CaptureStyle } from "../types/theme";

export interface DraftImage { path: string; bytes: Uint8Array; url: string; width: number; height: number }
export type DraftArtwork = Partial<Record<ThemeAssetRole, DraftImage>>;

export function ThemeArtwork({ family, captureStyle, draft, onChange, busy, onBusy }: {
  captureStyle?: CaptureStyle;
  family: BuiltInThemeId; draft: DraftArtwork; onChange: (draft: DraftArtwork) => void; busy: boolean; onBusy: (busy: boolean) => void;
}) {
  const { t, i18n } = useTranslation();
  const zh = i18n.language === "zh-CN";
  const [brief, setBrief] = useState("");
  const [promptOpen, setPromptOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);
  const prompt = buildThemePrompt(brief, family, zh, captureStyle);
  const upload = async (role: ThemeAssetRole, file: File) => {
    const current = ++generation.current;
    onBusy(true); setError("");
    try {
      if (file.size > MAX_IMAGE_BYTES) throw new Error("imageTooLarge");
      const total = Object.entries(draft).reduce((sum, [key, image]) => sum + (key === role ? 0 : image.bytes.length), file.size);
      if (total > MAX_ASSET_BYTES) throw new Error("setTooLarge");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const size = await validatePng(bytes, role);
      const path = await imagePath(bytes);
      if (current !== generation.current) return;
      if (draft[role]) URL.revokeObjectURL(draft[role]!.url);
      onChange({ ...draft, [role]: { ...size, path, bytes, url: URL.createObjectURL(new Blob([bytes as BlobPart], { type: "image/png" })) } });
    } catch (reason) {
      if (current === generation.current) setError(reason instanceof Error ? reason.message : "invalidImage");
    } finally { if (current === generation.current) onBusy(false); }
  };
  return <details className="artwork-authoring">
    <summary>{t("artwork.entry")}</summary>
    <p>{t("artwork.intro")}</p>
    <details className="asset-checklist"><summary>{t("artwork.checklist")}</summary>
      <p>{t("artwork.animationOwnership")}</p>
      <p>{t("artwork.cellOrder")}</p>
      <table><thead><tr><th>{t("artwork.assetRole")}</th><th>{t("artwork.assetSpec")}</th></tr></thead><tbody>
        {themeAssetRoles.filter((role) => family === "minimal" ? role === "core" : role !== "maw" || hasMaw(family)).map((role) => <tr key={role}><td>{zh ? assetSpecs[role].zh : assetSpecs[role].en}<small>{assetSpecs[role].file}</small></td><td>{assetSize(role)}<small>{zh ? assetCellLabels[role] : assetSpecs[role].cells}</small></td></tr>)}
      </tbody></table>
    </details>
    <label><span>{t("artwork.brief")}</span><textarea value={brief} onChange={(event) => setBrief(event.target.value)} placeholder={t("artwork.briefPlaceholder")} maxLength={1600} rows={3} /></label>
    <div className="studio-actions">
      <button type="button" className="secondary-button" onClick={async () => {
        setPromptOpen(true);
        try { await navigator.clipboard.writeText(prompt); setNotice(t("artwork.copied")); }
        catch { setNotice(t("artwork.copyFallback")); }
      }}>{t("artwork.copyPrompt")}</button>
      <button type="button" className="secondary-button" onClick={() => setPromptOpen(!promptOpen)}>{t("artwork.viewPrompt")}</button>
    </div>
    {notice && <p role="status">{notice}</p>}
    {promptOpen && <textarea className="artwork-prompt" aria-label={t("artwork.prompt")} value={prompt} readOnly rows={8} onFocus={(event) => event.target.select()} />}
    <p>{t("artwork.specs")}</p>
    <div className="artwork-slots">{themeAssetRoles.filter((role) => family === "minimal" ? role === "core" : role !== "maw" || hasMaw(family)).map((role) => {
      const spec = assetSpecs[role], image = draft[role];
      return <div className="artwork-slot" key={role}>
        <label><span>{zh ? spec.zh : spec.en}</span>
          {image ? <img src={image.url} alt={zh ? spec.zh : spec.en} /> : <span className="artwork-inherited">{t("artwork.inherited")}</span>}
          <input type="file" accept="image/png,.png" disabled={busy} aria-label={`${t("artwork.upload")} · ${zh ? spec.zh : spec.en}`} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(role, file); }} />
        </label>
        <small>{image ? `${image.width} × ${image.height}` : spec.file}</small>
        {image && <button type="button" disabled={busy} className="artwork-remove" onClick={() => { const next = { ...draft }; delete next[role]; URL.revokeObjectURL(image.url); onChange(next); }}>{t("artwork.remove")}</button>}
      </div>;
    })}</div>
    {error && <p className="form-error" role="alert">{t(`artwork.${error}`, { defaultValue: t("artwork.invalidImage") })}</p>}
    <p role="status">{t("artwork.progress", { count: Object.keys(draft).filter((role) => role !== "maw" || hasMaw(family)).length })}</p>
  </details>;
}
