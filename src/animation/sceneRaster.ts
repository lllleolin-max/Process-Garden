import { removeBlackMatte } from "./spriteAlpha";

export type RasterMode = "core" | "maw" | "atlas" | "transparent-atlas";
type RasterContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Identical pixel preparation on the worker and compatibility paths. */
export function rasterizeScene<C extends HTMLCanvasElement | OffscreenCanvas>(
  image: CanvasImageSource, width: number, height: number, mode: RasterMode,
  surface: (width: number, height: number, readable: boolean) => { canvas: C; context: RasterContext }
): C[] {
  const atlas = mode === "atlas" || mode === "transparent-atlas";
  const cropWidth = atlas ? Math.floor(width / 2) : width;
  const cropHeight = atlas ? Math.floor(height / 2) : height;
  if (cropWidth < 1 || cropHeight < 1) throw new Error("Empty scene artwork");
  return Array.from({ length: atlas ? 4 : 1 }, (_, index) => {
    const matte = mode === "maw" || mode === "atlas";
    const { canvas, context } = surface(cropWidth, cropHeight, matte);
    if (atlas) context.drawImage(image, index % 2 * cropWidth, Math.floor(index / 2) * cropHeight, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    else context.drawImage(image, 0, 0);
    if (matte) {
      const pixels = context.getImageData(0, 0, cropWidth, cropHeight);
      removeBlackMatte(pixels.data);
      context.clearRect(0, 0, cropWidth, cropHeight);
      context.putImageData(pixels, 0, 0);
    } else if (mode === "core") {
      context.globalCompositeOperation = "destination-in";
      const edge = context.createRadialGradient(width / 2, height / 2, width * 0.23, width / 2, height / 2, width * 0.49);
      edge.addColorStop(0, "rgba(0,0,0,1)");
      edge.addColorStop(0.68, "rgba(0,0,0,.95)");
      edge.addColorStop(0.88, "rgba(0,0,0,.42)");
      edge.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = edge;
      context.fillRect(0, 0, width, height);
    }
    return canvas;
  });
}

export interface RasterRequest { id: number; source: string; mode: RasterMode }
export type RasterResponse = { id: number; bitmaps: ImageBitmap[] } | { id: number; error: string };
