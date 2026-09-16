import { rasterizeScene, type RasterRequest, type RasterResponse } from "./sceneRaster";

self.onmessage = async (event: MessageEvent<RasterRequest>) => {
  const { id, source, mode } = event.data;
  let image: ImageBitmap | undefined;
  const bitmaps: ImageBitmap[] = [];
  try {
    const url = new URL(source, self.location.href);
    if (url.origin !== self.location.origin || !url.pathname.startsWith("/assets/generated/")) throw new Error("Scene artwork must be bundled and same-origin");
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Scene image returned ${response.status}`);
    // Decoding an HTMLImageElement on the window can synchronously stall a
    // frame even though createImageBitmap returns a Promise. Decode the Blob
    // here instead; only prepared bitmap ownership crosses back to the UI.
    image = await createImageBitmap(await response.blob());
    const sprites = rasterizeScene(image, image.width, image.height, mode, (width, height) => {
      const canvas = new OffscreenCanvas(width, height);
      // Software-backed preparation also keeps non-readback cores independent
      // of the worker's GPU context after its idle termination.
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Worker canvas unavailable");
      return { canvas, context };
    });
    for (const sprite of sprites) bitmaps.push(sprite.transferToImageBitmap());
    self.postMessage({ id, bitmaps } satisfies RasterResponse, { transfer: bitmaps });
  } catch (error) {
    bitmaps.forEach((bitmap) => bitmap.close());
    self.postMessage({ id, error: String(error) } satisfies RasterResponse);
  } finally { image?.close(); }
};
