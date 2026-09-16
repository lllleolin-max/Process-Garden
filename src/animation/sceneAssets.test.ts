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
  it("loads only the CPU core for minimal themes, without unused scene atlases", async () => {
    const { loadSceneAssets, sceneBackground } = await import("./sceneAssets");
    const theme = builtInThemes.find((item) => item.id === "minimal")!;
    const pending = loadSceneAssets(theme);
    expect(images).toHaveLength(1);
    expect(images[0].src).toBe("/assets/generated/refined/minimal/core.png");
    images[0].dispatchEvent(new Event("load"));
    const bundle = await pending;
    expect(bundle.creatureVariants).toEqual([]);
    expect(bundle.agents).toEqual([]);
    expect(bundle.habitats).toEqual([]);
    expect(bundle.capture).toEqual([]);
    expect(sceneBackground(theme)).toBe("");
    expect(await loadSceneAssets({ ...theme, id: "custom-minimal", basedOn: "minimal" })).toBe(bundle);
  });
  it("keeps ocular artwork independent from the deep-sea theme, including capture and maw", async () => {
    const { loadSceneAssets } = await import("./sceneAssets");
    const theme = builtInThemes.find((item) => item.id === "crimson")!;
    const pending = loadSceneAssets(theme);
    expect(images).toHaveLength(10);
    expect(images.every((image) => image.src.startsWith("/assets/generated/refined/crimson/"))).toBe(true);
    images.forEach((image) => image.dispatchEvent(new Event("load")));
    const bundle = await pending;
    expect(bundle.maw).not.toBeNull();
    expect(bundle.capture).toHaveLength(4);
    expect(await loadSceneAssets({ ...theme, id: "custom-eye", basedOn: "crimson" })).toBe(bundle);
  });
  it("keeps custom image bundles distinct from their base and supports extra variants", async () => {
    const artwork = await import("../themes/assets");
    vi.spyOn(artwork, "hydrateArtwork").mockResolvedValue(undefined);
    vi.spyOn(artwork, "assetUrl").mockImplementation((theme, role) => theme.assets?.[role] ? `blob:${theme.assets[role]}` : undefined);
    const { loadSceneAssets, getCachedSceneAssets, sceneBackground } = await import("./sceneAssets");
    const base = builtInThemes.find((theme) => theme.id === "cyberpunk")!;
    const first = { ...base, schemaVersion: 2 as const, id: "first-custom", basedOn: "cyberpunk" as const, assets: { core: "assets/first.png", background: "assets/backdrop.png", process3: "assets/variant.png" } };
    const second = { ...first, id: "second-custom", assets: { core: "assets/second.png" } };
    const promises = [loadSceneAssets(base), loadSceneAssets(first), loadSceneAssets(second)];
    await Promise.resolve();
    images.forEach((image) => image.dispatchEvent(new Event("load")));
    const [original, a, b] = await Promise.all(promises);
    expect(a.core).not.toBe(original.core);
    expect(a.core).not.toBe(b.core);
    expect(a.creatureVariants[0]).toHaveLength(2);
    expect(b.creatureVariants[0]).toHaveLength(1);
    expect(getCachedSceneAssets(first)).toBe(a);
    expect(getCachedSceneAssets(second)).toBe(b);
    expect(sceneBackground(first)).toBe("blob:assets/backdrop.png");
  });
  it("loads an independent cyberpunk bundle and reuses it for derived themes", async () => {
    const { loadSceneAssets, sceneBackground } = await import("./sceneAssets");
    const theme = builtInThemes.find((item) => item.id === "cyberpunk")!;
    const pending = loadSceneAssets(theme);
    expect(images).toHaveLength(9);
    expect(images.filter((image) => !image.src.includes("/lifecycle/")).every((image) => image.src.startsWith("/assets/generated/refined/cyberpunk/"))).toBe(true);
    expect(images.some((image) => image.src.endsWith("beam-capture-atlas-v1.png"))).toBe(true);
    images.forEach((image) => image.dispatchEvent(new Event("load")));
    const bundle = await pending;
    expect(bundle.creatureVariants.every((variants) => variants.length === 1)).toBe(true);
    expect(bundle.celestial).toHaveLength(4);
    expect(bundle.capture).toHaveLength(4);
    expect(bundle.maw).toBeNull();
    const custom = { ...theme, id: "custom-neon", basedOn: "cyberpunk" as const };
    expect(await loadSceneAssets(custom)).toBe(bundle);
    expect(sceneBackground(custom)).toBe(sceneBackground(theme));
  });
  it("shares pending work, waits for the backdrop, and preserves manifest variant order", async () => {
    const { loadSceneAssets, getCachedSceneAssets } = await import("./sceneAssets");
    const pending = loadSceneAssets(builtInThemes[0]);
    expect(loadSceneAssets(builtInThemes[0])).toBe(pending);
    const count = images.length;
    const backdrop = images.find((image) => image.src.includes("/background.png"))!;
    [...images].reverse().filter((image) => image !== backdrop).forEach((image) => image.dispatchEvent(new Event("load")));
    await Promise.resolve();
    expect(getCachedSceneAssets(builtInThemes[0])).toBeUndefined();
    backdrop.dispatchEvent(new Event("load"));
    const ready = await pending;
    expect(ready.creatureVariants).toHaveLength(8);
    expect(ready.creatureVariants[0].map((sprite) => sources.get(sprite)?.split("/").at(-1))).toEqual(["process1.png", "process3.png"]);
    expect(ready.creatureVariants[4].map((sprite) => sources.get(sprite)?.split("/").at(-1))).toEqual(["process2.png", "process4.png"]);
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
