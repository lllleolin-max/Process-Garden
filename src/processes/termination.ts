import type { ProcessSnapshot } from "../types/system";

export type TerminationTarget = { process: ProcessSnapshot; collector: "native" | "demo"; demoMode: boolean };
export const sameProcess = (a: ProcessSnapshot, b: ProcessSnapshot) => a.pid === b.pid && a.startedAt === b.startedAt && a.executablePath === b.executablePath;

export async function terminateNativeProcess(process: ProcessSnapshot) {
  if (!("__TAURI_INTERNALS__" in window)) throw new Error("unsupported");
  if (!process.executablePath || !process.startedAt) throw new Error("identity");
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("terminate_process", { pid: process.pid, startedAt: process.startedAt, executablePath: process.executablePath });
}

export function coreDropTarget(width: number, height: number, eldritch: boolean) {
  return { x: width * 0.5, y: height * 0.47, radius: Math.max(48, Math.min(eldritch ? 82 : 74, Math.min(width, height) * (eldritch ? 0.116 : 0.105))) * 1.2 };
}
export const insideCore = (point: { x: number; y: number }, core: { x: number; y: number; radius: number }) => Math.hypot(point.x - core.x, point.y - core.y) <= core.radius;
