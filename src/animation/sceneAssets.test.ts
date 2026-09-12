import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { builtInThemes } from "../design-system/themes/builtIn";

let images: TestImage[];
const sources = new WeakMap<HTMLCanvasElement, string>();
class TestImage extends EventTarget {
  src = ""; naturalWidth = 4; naturalHeight = 4;
  constructor() { super(); images.push(this); }
}
beforeEach(() => {
  vi.resetModules();
  images = [];
  vi.stubGlobal("Image", TestImage);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    const canvas = this;
    return new Proxy({
      drawImage: (image: TestImage) => sources.set(canvas, image.src),
      getImageData: () => ({ data: new Uint8ClampedArray(16) }),
      createRadialGradient: () => ({ addColorStop() {} })
    }, { get: (target, key) => key in target ? target[key as keyof typeof target] : () => {}, set: (target, key, value) => Reflect.set(target, key, value) }) as unknown as CanvasRenderingContext2D;
  });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("atomic generated scene assets", () => {
  it("shares pending work, waits for the backdrop, and preserves manifest variant order", async () => {
    const { loadSceneAssets, getCachedSceneAssets } = await import("./sceneAssets");
    const pending = loadSceneAssets(builtInThemes[0]);
    expect(loadSceneAssets(builtInThemes[0])).toBe(pending);
    const count = images.length;
    const backdrop = images.find((image) => image.src.includes("/backgrounds/"))!;
    [...images].reverse().filter((image) => image !== backdrop).forEach((image) => image.dispatchEvent(new Event("load")));
    await Promise.resolve();
    expect(getCachedSceneAssets(builtInThemes[0])).toBeUndefined();
    backdrop.dispatchEvent(new Event("load"));
    const ready = await pending;
    expect(ready.creatureVariants).toHaveLength(8);
    expect(ready.creatureVariants[0].map((sprite) => sources.get(sprite)?.split("/").at(-1))).toEqual(["garden-process-atlas-v1.png", "garden-process-atlas-v3.png"]);
    expect(ready.creatureVariants[4].map((sprite) => sources.get(sprite)?.split("/").at(-1))).toEqual(["garden-process-atlas-v2.png", "garden-process-atlas-v4.png"]);
    expect(await loadSceneAssets({ ...builtInThemes[0], id: "custom", basedOn: "garden" })).toBe(ready);
    expect(images).toHaveLength(count);
  });

  it("evicts only failed assets for retry, never commits an incomplete scene", async () => {
    const { loadSceneAssets, getCachedSceneAssets } = await import("./sceneAssets");
    const pending = loadSceneAssets(builtInThemes[1]);
    const rejection = expect(pending).rejects.toThrow("Scene asset unavailable");
    const failed = images.find((image) => image.src.includes("maw"))!;
    images.forEach((image) => image.dispatchEvent(new Event(image === failed ? "error" : "load")));
    await rejection;
    expect(getCachedSceneAssets(builtInThemes[1])).toBeUndefined();
    const count = images.length;
    const retry = loadSceneAssets(builtInThemes[1]);
    expect(images).toHaveLength(count + 1);
    expect(images.at(-1)!.src).toBe(failed.src);
    images.at(-1)!.dispatchEvent(new Event("load"));
    expect((await retry).maw).not.toBeNull();
  });

  it("shares the transparent celestial atlas across both families", async () => {
    const { loadSceneAssets } = await import("./sceneAssets");
    const garden = loadSceneAssets(builtInThemes[0]);
    const eldritch = loadSceneAssets(builtInThemes[1]);
    expect(images.filter((image) => image.src.includes("celestial"))).toHaveLength(1);
    images.forEach((image) => image.dispatchEvent(new Event("load")));
    const [first, second] = await Promise.all([garden, eldritch]);
    expect(first.celestial).toBe(second.celestial);
    expect(first.core).not.toBe(second.core);
  });

  it("rejects empty images and preparation errors instead of accepting blank artwork", async () => {
    const { loadSceneAssets } = await import("./sceneAssets");
    const pending = loadSceneAssets(builtInThemes[0]);
    const rejection = expect(pending).rejects.toThrow("Empty scene asset");
    images[0].naturalWidth = 0;
    images.forEach((image) => image.dispatchEvent(new Event("load")));
    await rejection;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const retry = loadSceneAssets(builtInThemes[0]);
    const secondRejection = expect(retry).rejects.toThrow("without a 2D canvas");
    images.at(-1)!.dispatchEvent(new Event("load"));
    await secondRejection;
  });
});
