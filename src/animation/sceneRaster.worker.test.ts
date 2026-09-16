import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RasterRequest } from "./sceneRaster";

const input = () => ({ width: 4, height: 4, close: vi.fn() });
let scope: { location: URL; postMessage: ReturnType<typeof vi.fn>; onmessage?: (event: { data: RasterRequest }) => Promise<void> };
let decoded: ReturnType<typeof input>, outputs: ReturnType<typeof input>[], options: unknown[];
beforeEach(async () => {
  vi.resetModules(); decoded = input(); outputs = []; options = [];
  scope = { location: new URL("https://tauri.localhost/assets/scene-worker.js"), postMessage: vi.fn() };
  vi.stubGlobal("self", scope);
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, blob: async () => new Blob(["fixture"]) })));
  vi.stubGlobal("createImageBitmap", vi.fn(async () => decoded));
  vi.stubGlobal("OffscreenCanvas", class {
    getContext(_type: string, config: unknown) {
      options.push(config);
      return { drawImage() {}, clearRect() {}, putImageData() {}, fillRect() {}, getImageData: () => ({ data: new Uint8ClampedArray(16) }), createRadialGradient: () => ({ addColorStop() {} }) };
    }
    transferToImageBitmap() { const bitmap = input(); outputs.push(bitmap); return bitmap; }
  });
  await import("./sceneRaster.worker");
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const message = (mode: RasterRequest["mode"] = "core", source = "https://tauri.localhost/assets/generated/garden/core.png") => ({ data: { id: 4, mode, source } });

describe("worker image ownership and origin boundary", () => {
  it("decodes inside the worker, software-rasterizes cores, and transfers output ownership", async () => {
    await scope.onmessage!(message());
    expect(createImageBitmap).toHaveBeenCalledWith(expect.any(Blob));
    expect(options).toEqual([{ willReadFrequently: true }]);
    expect(scope.postMessage).toHaveBeenCalledWith({ id: 4, bitmaps: outputs }, { transfer: outputs });
    expect(decoded.close).toHaveBeenCalledOnce();
    expect(outputs[0].close).not.toHaveBeenCalled();
  });
  it("rejects external origins and non-artwork paths before making a request", async () => {
    await scope.onmessage!(message("core", "https://example.com/assets/generated/core.png"));
    await scope.onmessage!(message("core", "https://tauri.localhost/private"));
    expect(fetch).not.toHaveBeenCalled();
    expect(scope.postMessage).toHaveBeenCalledWith({ id: 4, error: expect.stringContaining("same-origin") });
  });
  it("reports a failed fetch without attempting to decode an error page", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 404 } as Response);
    await scope.onmessage!(message());
    expect(createImageBitmap).not.toHaveBeenCalled();
    expect(scope.postMessage).toHaveBeenCalledWith({ id: 4, error: expect.stringContaining("404") });
  });
  it("closes inputs and all partially transferred outputs when posting fails", async () => {
    scope.postMessage.mockImplementationOnce(() => { throw new Error("transfer failed"); });
    await scope.onmessage!(message("atlas"));
    expect(outputs).toHaveLength(4);
    outputs.forEach((bitmap) => expect(bitmap.close).toHaveBeenCalledOnce());
    expect(decoded.close).toHaveBeenCalledOnce();
    expect(scope.postMessage).toHaveBeenLastCalledWith({ id: 4, error: expect.stringContaining("transfer failed") });
  });
});
