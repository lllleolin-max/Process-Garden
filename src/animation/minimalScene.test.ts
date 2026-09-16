import { describe, expect, it, vi } from "vitest";
import { drawCpu } from "./minimalScene";

describe("minimal CPU label", () => {
  function context() {
    return { save: vi.fn(), restore: vi.fn(), fillText: vi.fn(), measureText: (text: string) => ({ width: text.length * 6 }) } as unknown as CanvasRenderingContext2D;
  }
  it("preserves the real model across wrapped lines and retains utilization", () => {
    const canvas = context();
    drawCpu(canvas, null, 100, 100, 48, "23%", "Intel(R) Core(TM) Ultra X7 358H");
    const labels = vi.mocked(canvas.fillText).mock.calls.map(call => call[0]);
    expect(labels.slice(0, -1).join(" ")).toBe("Intel Core Ultra X7 358H");
    expect(labels.at(-1)).toBe("23%");
    expect(labels.length).toBeGreaterThan(2);
  });
  it("uses a generic CPU label when hardware data is unavailable", () => {
    const canvas = context();
    drawCpu(canvas, null, 100, 100, 48, "0%", null);
    expect(vi.mocked(canvas.fillText).mock.calls.map(call => call[0])).toEqual(["CPU", "0%"]);
  });
});
