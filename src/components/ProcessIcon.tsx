import { useState } from "react";
import { processIconKey, useProcessIconStore } from "../stores/processIconStore";
import type { ProcessSnapshot } from "../types/system";
import { useAppStore } from "../stores/appStore";
import "./ProcessIcon.css";

export function ProcessIcon({ process, className = "" }: { process: ProcessSnapshot; className?: string }) {
  const dataUrl = useProcessIconStore((state) => state.icons[processIconKey(process)]);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  const motionDisabled = useAppStore(state => state.reducedMotion || state.paused);
  const ready = Boolean(dataUrl && dataUrl !== failedSource && dataUrl === loadedSource);
  const initials = process.name.replace(/\.exe$/i, "").slice(0, 2).toUpperCase();
  return (
    <span className={`process-icon ${className} ${ready ? "process-icon-ready" : ""} ${motionDisabled ? "process-icon-static" : ""}`.trim()} aria-hidden="true">
      <span className="process-icon-fallback">{initials}</span>
      {dataUrl && dataUrl !== failedSource && <img key={dataUrl} src={dataUrl} alt="" draggable={false} onLoad={() => setLoadedSource(dataUrl)} onError={() => setFailedSource(dataUrl)} />}
    </span>
  );
}
