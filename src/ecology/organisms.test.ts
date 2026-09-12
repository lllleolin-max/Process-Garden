import { describe, expect, it } from "vitest";
import { agentEmbryoStage, classifyProcess, isAgentProcess, organismVariantIndex, resolveOrganismStyle, sanitizeOrganismStyleOverrides } from "./organisms";
import type { ProcessSnapshot } from "../types/system";

const sample = (name: string, extra: Partial<ProcessSnapshot> = {}): ProcessSnapshot => ({
  pid: 42,
  name,
  cpuPercent: 4,
  memoryBytes: 128 * 1024 ** 2,
  startedAt: Math.floor(Date.now() / 1000) - 90,
  status: "active",
  ...extra
});

describe("organism ecology", () => {
  it("classifies common application families", () => {
    expect(classifyProcess(sample("chrome.exe"))).toBe("browser");
    expect(classifyProcess(sample("postgres"))).toBe("database");
    expect(classifyProcess(sample("docker desktop"))).toBe("container");
    expect(resolveOrganismStyle(sample("node"), {})).toBe("larva");
  });

  it("recognizes named agent products from name, command or path", () => {
    expect(isAgentProcess(sample("codex"))).toBe(true);
    expect(isAgentProcess(sample("runner", { command: "claude agent" }))).toBe(true);
    expect(isAgentProcess(sample("trae.exe"))).toBe(true);
    expect(isAgentProcess(sample("workbudy"))).toBe(true);
  });

  it("applies safe, normalized user overrides", () => {
    const overrides = sanitizeOrganismStyleOverrides({ "Chrome.EXE": "construct", bad: "script" });
    expect(overrides).toEqual({ chrome: "construct" });
    expect(resolveOrganismStyle(sample("chrome.exe"), overrides)).toBe("construct");
  });

  it("maps task age to three embryo stages", () => {
    const now = Date.now();
    expect(agentEmbryoStage(sample("task", { startedAt: Math.floor((now - 10_000) / 1000) }), now)).toBe(0);
    expect(agentEmbryoStage(sample("task", { startedAt: Math.floor((now - 90_000) / 1000) }), now)).toBe(1);
    expect(agentEmbryoStage(sample("task", { startedAt: Math.floor((now - 400_000) / 1000) }), now)).toBe(2);
  });

  it("does not invent a mature stage from an unavailable process start time", () => {
    for (const startedAt of [0, NaN, Infinity]) expect(agentEmbryoStage(sample("task", { startedAt }), Date.now())).toBe(0);
  });

  it("selects a deterministic atlas variant without relying on even Windows PIDs", () => {
    const process = sample("chrome", { pid: 5520 });
    expect(organismVariantIndex(process, 2)).toBe(organismVariantIndex(process, 2));
    expect(organismVariantIndex(process, 0)).toBe(0);
    expect(new Set(["chrome", "node", "postgres", "code"].map((name) => organismVariantIndex(sample(name, { pid: 5520 }), 2))).size).toBe(2);
  });
});
