import { processIdentity } from "../animation/processIdentity";
import type { ProcessEvent, SystemSnapshot } from "../types/system";

export function eventTarget(event: ProcessEvent, snapshot: SystemSnapshot): number | null {
  if (!event.processKey) return null;
  const process = snapshot.processes.find(item => item.pid === event.pid);
  return process && processIdentity(process) === event.processKey ? process.pid : null;
}
