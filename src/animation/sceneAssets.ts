import type { ThemeManifest } from "../types/theme";
import { removeBlackMatte } from "./spriteAlpha";

export interface SceneAssets {
  core: HTMLCanvasElement;
  maw: HTMLCanvasElement | null;
  creatureVariants: HTMLCanvasElement[][];
  habitats: HTMLCanvasElement[];
  pollinators: HTMLCanvasElement[];
  agents: HTMLCanvasElement[];
  celestial: HTMLCanvasElement[];
}

export function sceneAssetFamily(theme: ThemeManifest) {
  return theme.id === "eldritch" || theme.basedOn === "eldritch" ? "eldritch" : "garden";
}

export function sceneBackground(theme: ThemeManifest) {
  const family = sceneAssetFamily(theme);
  return `/assets/generated/${family}/backgrounds/${family}-canvas-bg-v${family === "garden" ? 2 : 1}.png`;
}

// Cache prepared pixels, not a second copy of the full source images. Pending
// requests are shared too, so rapid theme changes cannot duplicate decoding.
function assetCache<T>() {
  const cache = new Map<string, Promise<T>>();
  return (path: string, prepare: (image: HTMLImageElement) => T): Promise<T> => {
    const cached = cache.get(path);
    if (cached) return cached;
    const pending = new Promise<T>((resolve, reject) => {
      const image = new Image();
      const clean = () => {
        image.removeEventListener("load", loaded);
        image.removeEventListener("error", failed);
      };
      const failed = () => { clean(); reject(new Error(`Scene asset unavailable: ${path}`)); };
      const loaded = () => {
        clean();
        try {
          if (!image.naturalWidth || !image.naturalHeight) throw new Error(`Empty scene asset: ${path}`);
          resolve(prepare(image));
        } catch (error) { reject(error); }
      };
      image.addEventListener("load", loaded);
      image.addEventListener("error", failed);
      image.src = path;
    });
    cache.set(path, pending);
    void pending.catch(() => { if (cache.get(path) === pending) cache.delete(path); });
    return pending;
  };
}

function surface(width: number, height: number, readable = false) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: readable });
  if (!context) throw new Error("Cannot prepare scene artwork without a 2D canvas");
  return { canvas, context };
}

function prepareCore(image: HTMLImageElement, maw: boolean) {
  const { canvas, context } = surface(image.naturalWidth, image.naturalHeight, maw);
  context.drawImage(image, 0, 0);
  if (maw) {
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    removeBlackMatte(pixels.data);
    context.putImageData(pixels, 0, 0);
  } else {
    context.globalCompositeOperation = "destination-in";
    const edge = context.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width * 0.23, canvas.width / 2, canvas.height / 2, canvas.width * 0.49);
    edge.addColorStop(0, "rgba(0,0,0,1)");
    edge.addColorStop(0.68, "rgba(0,0,0,.95)");
    edge.addColorStop(0.88, "rgba(0,0,0,.42)");
    edge.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = edge;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

function prepareAtlas(image: HTMLImageElement, preserveAlpha = false) {
  const width = Math.floor(image.naturalWidth / 2);
  const height = Math.floor(image.naturalHeight / 2);
  return [0, 1, 2, 3].map((index) => {
    const { canvas, context } = surface(width, height, !preserveAlpha);
    context.drawImage(image, (index % 2) * width, Math.floor(index / 2) * height, width, height, 0, 0, width, height);
    if (!preserveAlpha) {
      const pixels = context.getImageData(0, 0, width, height);
      removeBlackMatte(pixels.data);
      context.clearRect(0, 0, width, height);
      context.putImageData(pixels, 0, 0);
    }
    return canvas;
  });
}

const coreAsset = assetCache<HTMLCanvasElement>();
const atlasAsset = assetCache<HTMLCanvasElement[]>();
const backgroundAsset = assetCache<boolean>();
const bundles = new Map<string, SceneAssets>();
const pendingBundles = new Map<string, Promise<SceneAssets>>();

export const getCachedSceneAssets = (theme: ThemeManifest) => bundles.get(sceneAssetFamily(theme));

export function loadSceneAssets(theme: ThemeManifest): Promise<SceneAssets> {
  const family = sceneAssetFamily(theme);
  const cached = bundles.get(family);
  if (cached) return Promise.resolve(cached);
  const pending = pendingBundles.get(family);
  if (pending) return pending;
  const root = `/assets/generated/${family}`;
  const variants = family === "garden" ? [[1, 0], [3, 0], [2, 4], [4, 4]] : [[1, 0], [2, 4]];
  const ready = Promise.all([
    coreAsset(`${root}/cores/${family}-core-main-v${family === "garden" ? 2 : 1}.png`, (image) => prepareCore(image, false)),
    family === "eldritch" ? coreAsset(`${root}/cores/eldritch-core-maw-v3.png`, (image) => prepareCore(image, true)) : Promise.resolve(null),
    Promise.all(variants.map(([version]) => atlasAsset(`${root}/creatures/${family}-process-atlas-v${version}.png`, prepareAtlas))),
    atlasAsset(`${root}/habitats/${family}-habitat-atlas-v1.png`, prepareAtlas),
    atlasAsset(`${root}/pollinators/${family}-pollinator-atlas-v1.png`, prepareAtlas),
    atlasAsset(`${root}/agents/${family}-agent-growth-atlas-v1.png`, prepareAtlas),
    atlasAsset("/assets/generated/shared/celestial-atlas-v1.png", (image) => prepareAtlas(image, true)),
    backgroundAsset(sceneBackground(theme), () => true)
  ]).then(([core, maw, atlases, habitats, pollinators, agents, celestial]) => {
    const creatureVariants: HTMLCanvasElement[][] = Array.from({ length: 8 }, () => []);
    // Resolve in manifest order, never in network arrival order: a process keeps
    // the same generated variant after a cold load or a cached theme switch.
    atlases.forEach((sprites, atlas) => sprites.forEach((sprite, cell) => creatureVariants[variants[atlas][1] + cell].push(sprite)));
    const bundle = { core, maw, creatureVariants, habitats, pollinators, agents, celestial };
    bundles.set(family, bundle);
    return bundle;
  });
  pendingBundles.set(family, ready);
  void ready.then(() => pendingBundles.delete(family), () => pendingBundles.delete(family));
  return ready;
}
