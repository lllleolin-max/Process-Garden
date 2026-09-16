import { describe, expect, it, vi } from "vitest";
import { rasterizeScene, type RasterMode } from "./sceneRaster";

function fixture(mode: RasterMode) {
  const contexts: ReturnType<typeof makeContext>[] = [];
  function makeContext() {
    return {
      drawImage: vi.fn(), clearRect: vi.fn(), putImageData: vi.fn(), fillRect: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray([0, 0, 0, 255, 10, 5, 1, 128]) })),
      gradient: { addColorStop: vi.fn() },
      createRadialGradient: vi.fn(function (this: { gradient: object }) { return this.gradient; })
    };
  }
  const image = {} as CanvasImageSource;
  const result = rasterizeScene(image, 8, 6, mode, (width, height) => {
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const context = makeContext(); contexts.push(context);
    return { canvas, context: context as unknown as CanvasRenderingContext2D };
  });
  return { result, contexts, image };
}
describe("shared worker/compatibility raster semantics", () => {
  it("crops the four atlas cells in deterministic row-major order and preserves partial alpha", () => {
    const { result, contexts, image } = fixture("atlas");
    expect(result.map((canvas) => [canvas.width, canvas.height])).toEqual(Array(4).fill([4, 3]));
    contexts.forEach((context, index) => {
      expect(context.drawImage).toHaveBeenCalledWith(image, index % 2 * 4, Math.floor(index / 2) * 3, 4, 3, 0, 0, 4, 3);
      expect([...context.putImageData.mock.calls[0][0].data]).toEqual([0, 0, 0, 0, 10, 5, 1, 36]);
    });
  });
  it("does not read or replace the existing celestial transparency", () => {
    const { contexts } = fixture("transparent-atlas");
    contexts.forEach((context) => { expect(context.getImageData).not.toHaveBeenCalled(); expect(context.putImageData).not.toHaveBeenCalled(); });
  });
  it("uses the same radial core mask and matte-free maw dimensions", () => {
    const core = fixture("core"), maw = fixture("maw");
    expect(core.result).toHaveLength(1); expect(maw.result).toHaveLength(1);
    expect(core.contexts[0].gradient.addColorStop.mock.calls.map(([stop]) => stop)).toEqual([0, 0.68, 0.88, 1]);
    expect(core.contexts[0].getImageData).not.toHaveBeenCalled();
    expect(maw.contexts[0].getImageData).toHaveBeenCalledWith(0, 0, 8, 6);
  });
});
