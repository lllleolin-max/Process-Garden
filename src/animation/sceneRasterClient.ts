import type { RasterMode, RasterRequest, RasterResponse } from "./sceneRaster";

let worker: Worker | null = null;
let unavailable = false;
let nextId = 0;
let idle: ReturnType<typeof setTimeout> | undefined;
const pending = new Map<number, { resolve: (bitmaps: ImageBitmap[] | null) => void; timeout: ReturnType<typeof setTimeout> }>();

function stop() {
  clearTimeout(idle);
  worker?.terminate();
  worker = null;
}
function fail() {
  unavailable = true;
  stop();
  pending.forEach((job) => { clearTimeout(job.timeout); job.resolve(null); });
  pending.clear();
}
function getWorker() {
  clearTimeout(idle);
  if (worker) return worker;
  worker = new Worker(new URL("./sceneRaster.worker.ts", import.meta.url), { type: "module", name: "scene-artwork" });
  worker.onmessage = (event: MessageEvent<RasterResponse>) => {
    const response = event.data;
    const job = pending.get(response.id);
    if (!job) {
      if ("bitmaps" in response) response.bitmaps.forEach((bitmap) => bitmap.close());
      return;
    }
    if ("error" in response) { fail(); return; }
    pending.delete(response.id);
    clearTimeout(job.timeout);
    job.resolve(response.bitmaps);
    if (!pending.size) idle = setTimeout(stop, 1_000);
  };
  worker.onerror = (event) => { event.preventDefault(); fail(); };
  worker.onmessageerror = fail;
  return worker;
}

/** Null means use the existing local renderer, including restricted WebViews. */
export async function prepareSceneOffThread(image: HTMLImageElement, mode: RasterMode): Promise<HTMLCanvasElement[] | null> {
  if (unavailable || typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined" || typeof createImageBitmap !== "function") return null;
  const bitmaps = await new Promise<ImageBitmap[] | null>((resolve) => {
    const id = ++nextId;
    try {
      const target = getWorker();
      pending.set(id, { resolve, timeout: setTimeout(fail, 20_000) });
      target.postMessage({ id, source: image.currentSrc || image.src, mode } satisfies RasterRequest);
    } catch {
      fail();
      resolve(null);
    }
  });
  if (!bitmaps) return null;
  try {
    return bitmaps.map((bitmap) => {
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const receiver = canvas.getContext("bitmaprenderer");
      if (receiver && typeof receiver.transferFromImageBitmap === "function") receiver.transferFromImageBitmap(bitmap);
      else {
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Cannot retain prepared scene artwork");
        context.drawImage(bitmap, 0, 0);
      }
      return canvas;
    });
  } catch { return null; }
  finally { bitmaps.forEach((bitmap) => bitmap.close()); }
}
