import type { ProcessSnapshot } from "../types/system";

const startMilliseconds = (value: number) => value > 10_000_000_000 ? value : value * 1000;

/** Best-effort relationship from the current snapshot, not a historical tree. */
export function observedParent(child: ProcessSnapshot, processes: ProcessSnapshot[]) {
  if (child.parentPid === undefined || child.parentPid === child.pid) return null;
  const parent = processes.find(process => process.pid === child.parentPid);
  if (!parent || !Number.isFinite(parent.startedAt) || !Number.isFinite(child.startedAt)
    || parent.startedAt <= 0 || child.startedAt <= 0
    || startMilliseconds(parent.startedAt) > startMilliseconds(child.startedAt)) return null;
  return parent;
}
