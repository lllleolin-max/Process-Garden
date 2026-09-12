import { processIconKey, useProcessIconStore } from "../stores/processIconStore";
import type { ProcessSnapshot } from "../types/system";

export function ProcessIcon({ process, className = "" }: { process: ProcessSnapshot; className?: string }) {
  const dataUrl = useProcessIconStore((state) => state.icons[processIconKey(process)]);
  const initials = process.name.replace(/\.exe$/i, "").slice(0, 2).toUpperCase();
  return (
    <span className={`process-icon ${className}`.trim()} aria-hidden="true">
      {dataUrl ? <img src={dataUrl} alt="" draggable={false} /> : <span>{initials}</span>}
    </span>
  );
}
