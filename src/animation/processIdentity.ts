import type { ProcessSnapshot } from "../types/system";

/** Collectors may express the same start time in Unix seconds or milliseconds. */
export function processIdentity(process: Pick<ProcessSnapshot, "pid" | "startedAt">) {
  const start = process.startedAt > 10_000_000_000 ? process.startedAt : process.startedAt * 1_000;
  return `${process.pid}:${start}`;
}
