import { useState } from "react";
import { processIconKey, useProcessIconStore } from "../stores/processIconStore";
import type { ProcessSnapshot } from "../types/system";

export function ProcessIcon({ process, className = "" }: { process: ProcessSnapshot; className?: string }) {
  const dataUrl = useProcessIconStore((state) => state.icons[processIconKey(process)]);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const initials = process.name.replace(/\.exe$/i, "").slice(0, 2).toUpperCase();
  return (
    <span className={`process-icon ${className}`.trim()} aria-hidden="true">
      {dataUrl && dataUrl !== failedSource ? <img key={dataUrl} src={dataUrl} alt="" draggable={false} onError={() => setFailedSource(dataUrl)} /> : <span>{initials}</span>}
    </span>
  );
}
