import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RasterRequest, RasterResponse } from "./sceneRaster";

let workers: FakeWorker[];
const bitmap = () => ({ width: 4, height: 4, close: vi.fn() }) as unknown as ImageBitmap;
class FakeWorker {
  onmessage?: (event: MessageEvent<RasterResponse>) => void;
  onerror?: (event: ErrorEvent) => void;
  onmessageerror?: () => void;
  requests: RasterRequest[] = [];
  terminate = vi.fn();
  constructor() { workers.push(this); }
  postMessage(request: RasterRequest) { this.requests.push(request); }
  reply(id: number, bitmaps: ImageBitmap[]) { this.onmessage?.({ data: { id, bitmaps } } as MessageEvent<RasterResponse>); }
}
beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers(); workers = [];
  vi.stubGlobal("Worker", FakeWorker);
  vi.stubGlobal("OffscreenCanvas", class {});
  vi.stubGlobal("createImageBitmap", vi.fn(async () => bitmap()));
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("off-thread artwork preparation", () => {
  it("ignores retired worker errors without interrupting a new theme preparation", async () => {
    const { prepareSceneOffThread } = await import("./sceneRasterClient");
    const first = prepareSceneOffThread(new Image(), "core");
    const retired = workers[0];
    retired.reply(retired.requests[0].id, [bitmap()]);
    await first;
    await vi.advanceTimersByTimeAsync(1_000);
    const next = prepareSceneOffThread(new Image(), "maw");
    const current = workers[1];
    retired.onerror?.(new ErrorEvent("error"));
    retired.onmessageerror?.();
    expect(current.terminate).not.toHaveBeenCalled();
    const stale = bitmap();
    retired.reply(current.requests[0].id, [stale]);
    expect(stale.close).toHaveBeenCalledOnce();
    const output = bitmap();
    current.reply(current.requests[0].id, [output]);
    expect(await next).toHaveLength(1);
    expect(output.close).toHaveBeenCalledOnce();
  });

  it("shares a worker, routes out-of-order replies and releases transferred output bitmaps", async () => {
    const { prepareSceneOffThread } = await import("./sceneRasterClient");
    const first = prepareSceneOffThread(new Image(), "core"), second = prepareSceneOffThread(new Image(), "atlas");
    await Promise.resolve();
    expect(workers).toHaveLength(1);
    const worker = workers[0], a = bitmap(), b = bitmap();
    expect(worker.requests[0].mode).toBe("core");
    expect(createImageBitmap).not.toHaveBeenCalled();
    worker.reply(worker.requests[1].id, [b]); worker.reply(worker.requests[0].id, [a]);
    const [core, atlas] = await Promise.all([first, second]);
    expect(core![0].width).toBe(4); expect(atlas![0].height).toBe(4);
    expect(a.close).toHaveBeenCalledOnce(); expect(b.close).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("does not terminate a worker while another asset is pending", async () => {
    const { prepareSceneOffThread } = await import("./sceneRasterClient");
    const first = prepareSceneOffThread(new Image(), "core"); await Promise.resolve();
    workers[0].reply(workers[0].requests[0].id, [bitmap()]); await first;
    await vi.advanceTimersByTimeAsync(900);
    const next = prepareSceneOffThread(new Image(), "maw"); await Promise.resolve();
    await vi.advanceTimersByTimeAsync(500);
    expect(workers[0].terminate).not.toHaveBeenCalled();
    workers[0].reply(workers[0].requests[1].id, [bitmap()]); await next;
  });

  it("settles every pending asset on crash, disables retries and closes stale replies", async () => {
    const { prepareSceneOffThread } = await import("./sceneRasterClient");
    const jobs = [prepareSceneOffThread(new Image(), "core"), prepareSceneOffThread(new Image(), "atlas")];
    await Promise.resolve();
    const worker = workers[0];
    worker.onerror?.(new ErrorEvent("error"));
    expect(await Promise.all(jobs)).toEqual([null, null]);
    expect(await prepareSceneOffThread(new Image(), "core")).toBeNull();
    expect(workers).toHaveLength(1);
    const stale = bitmap(); worker.reply(worker.requests[0].id, [stale]);
    expect(stale.close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("falls back when the worker reports a preparation failure or stops answering", async () => {
    const { prepareSceneOffThread } = await import("./sceneRasterClient");
    const pending = prepareSceneOffThread(new Image(), "core"); await Promise.resolve();
    workers[0].onmessage?.({ data: { id: workers[0].requests[0].id, error: "no canvas" } } as MessageEvent<RasterResponse>);
    expect(await pending).toBeNull();
    vi.resetModules();
    const fresh = await import("./sceneRasterClient");
    const stalled = fresh.prepareSceneOffThread(new Image(), "core"); await Promise.resolve();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await stalled).toBeNull(); expect(workers[1].terminate).toHaveBeenCalledOnce();
  });

  it("falls back without allocating decoded sources if worker creation is blocked", async () => {
    vi.stubGlobal("Worker", class { constructor() { throw new Error("CSP"); } });
    const { prepareSceneOffThread } = await import("./sceneRasterClient");
    expect(await prepareSceneOffThread(new Image(), "core")).toBeNull();
    expect(createImageBitmap).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });

  it("falls back without constructing a worker when required APIs are unavailable", async () => {
    const { prepareSceneOffThread } = await import("./sceneRasterClient");
    vi.stubGlobal("OffscreenCanvas", undefined);
    expect(await prepareSceneOffThread(new Image(), "core")).toBeNull();
    vi.stubGlobal("OffscreenCanvas", class {});
    vi.stubGlobal("createImageBitmap", undefined);
    expect(await prepareSceneOffThread(new Image(), "core")).toBeNull();
    expect(workers).toHaveLength(0);
  });

  it("releases all output bitmaps even if retaining the Canvas fails", async () => {
    const { prepareSceneOffThread } = await import("./sceneRasterClient");
    const pending = prepareSceneOffThread(new Image(), "atlas"); await Promise.resolve();
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
    const images = [bitmap(), bitmap()]; workers[0].reply(workers[0].requests[0].id, images);
    expect(await pending).toBeNull();
    images.forEach((image) => expect(image.close).toHaveBeenCalledOnce());
  });

  it("transfers bitmap ownership directly when the browser supports a bitmap receiver", async () => {
    const receiver = { transferFromImageBitmap: vi.fn() };
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(receiver as unknown as ImageBitmapRenderingContext);
    const { prepareSceneOffThread } = await import("./sceneRasterClient");
    const pending = prepareSceneOffThread(new Image(), "core"); await Promise.resolve();
    const image = bitmap(); workers[0].reply(workers[0].requests[0].id, [image]);
    expect(await pending).toHaveLength(1);
    expect(receiver.transferFromImageBitmap).toHaveBeenCalledWith(image);
  });
});
