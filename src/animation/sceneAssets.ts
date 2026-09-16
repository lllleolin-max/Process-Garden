import type { ThemeAssetRole, ThemeManifest } from "../types/theme";
import { assetUrl, hydrateArtwork } from "../themes/assets";
import { themeFamily } from "../design-system/themes/builtIn";
import { removeBlackMatte } from "./spriteAlpha";
import { captureStyleFor } from "../themes/lifecycle";
import { builtinArtwork, hasMaw } from "../themes/builtinArtwork";

export interface SceneAssets {
  core: HTMLCanvasElement;
  maw: HTMLCanvasElement | null;
  creatureVariants: HTMLCanvasElement[][];
  habitats: HTMLCanvasElement[];
  pollinators: HTMLCanvasElement[];
  agents: HTMLCanvasElement[];
  celestial: HTMLCanvasElement[];
  capture?: HTMLCanvasElement[];
}

export function sceneAssetFamily(theme: ThemeManifest) {
  return themeFamily(theme);
}

export function sceneBackground(theme: ThemeManifest) {
  if (sceneAssetFamily(theme) === "minimal") return "";
  const custom = assetUrl(theme, "background");
  if (custom) return custom;
  const family = sceneAssetFamily(theme);
  return builtinArtwork(family, "background");
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

function prepareCore(image: HTMLImageElement) {
  const { canvas, context } = surface(image.naturalWidth, image.naturalHeight, true);
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  removeBlackMatte(pixels.data);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.putImageData(pixels, 0, 0);
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
function prepareCaptureAtlas(image: HTMLImageElement) {
  return prepareAtlas(image).map((cell) => {
    const context = cell.getContext("2d", { willReadFrequently: true })!;
    const { data } = context.getImageData(0, 0, cell.width, cell.height);
    let left = cell.width, top = cell.height, right = 0, bottom = 0;
    for (let y = 0; y < cell.height; y++) for (let x = 0; x < cell.width; x++) {
      if (data[(y * cell.width + x) * 4 + 3] > 24) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
    }
    if (left > right || top > bottom) return cell;
    const { canvas, context: target } = surface(right - left + 1, bottom - top + 1);
    target.drawImage(cell, left, top, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    return canvas;
  });
}
const mawAsset = assetCache<HTMLCanvasElement>();
const atlasAsset = assetCache<HTMLCanvasElement[]>();
const backgroundAsset = assetCache<boolean>();
const bundles = new Map<string, SceneAssets>();
const pendingBundles = new Map<string, Promise<SceneAssets>>();

export const sceneAssetKey = (theme: ThemeManifest) => theme.assets || theme.captureStyle ? `${sceneAssetFamily(theme)}:${JSON.stringify([theme.assets, theme.captureStyle])}` : sceneAssetFamily(theme);
export const getCachedSceneAssets = (theme: ThemeManifest) => bundles.get(sceneAssetKey(theme));

export function loadSceneAssets(theme: ThemeManifest): Promise<SceneAssets> {
  if (theme.assets) return hydrateArtwork(theme).then(() => loadPreparedSceneAssets(theme));
  return loadPreparedSceneAssets(theme);
}

function loadPreparedSceneAssets(theme: ThemeManifest): Promise<SceneAssets> {
  const family = sceneAssetFamily(theme);
  const key = sceneAssetKey(theme);
  const cached = bundles.get(key);
  if (cached) return Promise.resolve(cached);
  const pending = pendingBundles.get(key);
  if (pending) return pending;
  if (family === "minimal") {
    const ready = coreAsset(assetUrl(theme, "core") ?? builtinArtwork(family, "core"), prepareCore).then((core) => {
      const bundle: SceneAssets = { core, maw: null, creatureVariants: [], habitats: [], pollinators: [], agents: [], celestial: [], capture: [] };
      bundles.set(key, bundle);
      return bundle;
    });
    pendingBundles.set(key, ready);
    void ready.then(() => pendingBundles.delete(key), () => pendingBundles.delete(key));
    return ready;
  }
  const variants = [[1, 0], ...(family === "garden" || theme.assets?.process3 ? [[3, 0]] : []), [2, 4], ...(family === "garden" || theme.assets?.process4 ? [[4, 4]] : [])];
  const source = (role: ThemeAssetRole) => assetUrl(theme, role) ?? builtinArtwork(family, role);
  const ready = Promise.all([
    coreAsset(source("core"), prepareCore),
    hasMaw(family) ? mawAsset(source("maw"), prepareCore) : Promise.resolve(null),
    Promise.all(variants.map(([version]) => atlasAsset(source(`process${version}` as ThemeAssetRole), prepareAtlas))),
    atlasAsset(source("habitat"), prepareAtlas),
    atlasAsset(source("pollinator"), prepareAtlas),
    atlasAsset(source("agent"), prepareAtlas),
    atlasAsset(source("celestial"), prepareAtlas),
    backgroundAsset(sceneBackground(theme), () => true),
    atlasAsset(assetUrl(theme, "capture") ?? (theme.captureStyle && theme.captureStyle !== captureStyleFor({ id: family }) ? theme.captureStyle === "spear" ? builtinArtwork("olympus", "capture") : theme.captureStyle === "laurel" ? "/assets/generated/refined/olympus/capture.png" : theme.captureStyle === "wing" ? builtinArtwork("angel", "capture") : `/assets/generated/lifecycle/${theme.captureStyle}-capture-atlas-v1.png` : builtinArtwork(family, "capture")), prepareCaptureAtlas)
  ]).then(([core, maw, atlases, habitats, pollinators, agents, celestial, , capture]) => {
    const creatureVariants: HTMLCanvasElement[][] = Array.from({ length: 8 }, () => []);
    // Resolve in manifest order, never in network arrival order: a process keeps
    // the same generated variant after a cold load or a cached theme switch.
    atlases.forEach((sprites, atlas) => sprites.forEach((sprite, cell) => creatureVariants[variants[atlas][1] + cell].push(sprite)));
    const bundle = { core, maw, creatureVariants, habitats, pollinators, agents, celestial, capture };
    bundles.set(key, bundle);
    return bundle;
  });
  pendingBundles.set(key, ready);
  void ready.then(() => pendingBundles.delete(key), () => pendingBundles.delete(key));
  return ready;
}
