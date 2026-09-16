export interface ServiceReading {
  name: string;
  displayName: string;
  state: number;
  processId: number | null;
  serviceType: number;
}

const u32 = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 0xffffffff;
const boundedText = (value: unknown): value is string => typeof value === "string" && value.length <= 4096 && !value.includes("\0");

/** Strict projection: IPC metadata is not trusted as a valid service snapshot. */
export function parseServiceReadings(input: unknown): ServiceReading[] {
  if (!Array.isArray(input) || input.length > 65536) throw new Error("invalid service table");
  const names = new Set<string>();
  return input.map(value => {
    if (!value || typeof value !== "object") throw new Error("invalid service row");
    const { name, displayName, state, processId, serviceType } = value;
    if (!boundedText(name) || !name.length || !boundedText(displayName) || !u32(state) || !u32(serviceType)) throw new Error("invalid service fields");
    const identity = name.toLowerCase();
    if (names.has(identity)) throw new Error("duplicate service identity");
    names.add(identity);
    if (processId !== null && (!u32(processId) || processId === 0 || state < 4 || state > 7)) throw new Error("invalid service PID");
    return { name, displayName, state, processId, serviceType };
  });
}

export function serviceStateLabel(state: number, locale: "zh-CN" | "en-US"): string {
  const labels = locale === "zh-CN"
    ? ["未知", "已停止", "正在启动", "正在停止", "运行中", "正在恢复", "正在暂停", "已暂停"]
    : ["Unknown", "Stopped", "Starting", "Stopping", "Running", "Resuming", "Pausing", "Paused"];
  return state >= 1 && state <= 7 ? labels[state] : `${labels[0]} (${state})`;
}
