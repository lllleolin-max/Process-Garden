import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useOverlay } from "../hooks/useOverlay";
import { useAppStore } from "../stores/appStore";
import { sameProcess, terminateNativeProcess, type TerminationTarget } from "../processes/termination";

export function EndProcessDialog({ target, onClose }: { target: TerminationTarget; onClose: () => void }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const overlay = useOverlay(true, () => { if (!inFlight.current) onClose(); }, { initialFocusSelector: "[data-cancel-termination]" });
  const finish = async () => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      const state = useAppStore.getState();
      const current = state.snapshot.processes.find((process) => sameProcess(process, target.process));
      if (!current || state.collector !== target.collector || state.demoMode !== target.demoMode) throw new Error("stale");
      if (target.collector === "native") await terminateNativeProcess(current);
      useAppStore.getState().completeProcessTermination(target.process, target.collector);
      onClose();
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : String(reason);
      setError(["stale", "protected", "identity", "denied", "unsupported", "timeout"].includes(code) ? code : "failed");
    } finally { inFlight.current = false; setBusy(false); }
  };
  return createPortal(<div className="modal-backdrop capture-confirm-backdrop" data-overlay-root="modal" data-state="open">
    <section ref={overlay.surfaceRef} className="end-process-dialog" role="alertdialog" aria-modal="true" aria-labelledby="end-process-title" aria-describedby="end-process-description" aria-busy={busy} tabIndex={-1}>
      <h2 id="end-process-title">{t("termination.title", { name: target.process.name })}</h2>
      <p className="end-process-identity">PID {target.process.pid} · {target.process.name}</p>
      <p id="end-process-description">{t(target.collector === "demo" ? "termination.demoNotice" : "termination.nativeNotice")}</p>
      {error && <p className="form-error" role="alert">{t(`termination.${error}`)}</p>}
      <div className="studio-actions"><button data-cancel-termination className="secondary-button" disabled={busy} onClick={onClose}>{t("common.cancel")}</button><button className="primary-button end-process-confirm" disabled={busy} onClick={() => void finish()}>{t(busy ? "termination.ending" : "termination.confirm")}</button></div>
    </section>
  </div>, document.body);
}
