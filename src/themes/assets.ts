import { themeAssetRoles, type ThemeAssetRole, type ThemeManifest } from "../types/theme";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_ASSET_BYTES = 64 * 1024 * 1024;
export const assetPathPattern = /^assets\/[a-f0-9]{64}\.png$/;
const urls = new Map<string, string>();
let database: Promise<IDBDatabase> | undefined;

function openDatabase() {
  return database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("process-garden-artwork", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("images");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { database = undefined; reject(request.error); };
    request.onblocked = () => { database = undefined; reject(new Error("Artwork storage is blocked")); };
  });
}

export function validateAssetMap(value: unknown): value is NonNullable<ThemeManifest["assets"]> {
  return !!value && typeof value === "object" && !Array.isArray(value)
    && Object.entries(value).length > 0
    && Object.entries(value).every(([role, path]) => themeAssetRoles.includes(role as ThemeAssetRole) && typeof path === "string" && assetPathPattern.test(path));
}

export function assetUrl(theme: ThemeManifest, role: ThemeAssetRole) {
  const path = theme.assets?.[role];
  return path ? urls.get(path) : undefined;
}

export function pngDimensions(bytes: Uint8Array, role: ThemeAssetRole) {
  if (bytes.length > MAX_IMAGE_BYTES) throw new Error("imageTooLarge");
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 33 || !signature.every((value, i) => bytes[i] === value) || String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR") throw new Error("invalidImage");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16), height = view.getUint32(20);
  if (width < 64 || height < 64 || width > 4096 || height > 4096 || width * height > 9_437_184) throw new Error("imageDimensions");
  if (role === "background" ? width / height < 1.3 || width / height > 2.4 : width !== height || width % 2 !== 0) throw new Error("imageShape");
  return { width, height };
}

export async function validatePng(bytes: Uint8Array, role: ThemeAssetRole) {
  const dimensions = pngDimensions(bytes, role);
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "image/png" }));
  try {
    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => image.naturalWidth === dimensions.width && image.naturalHeight === dimensions.height ? resolve() : reject(new Error("invalidImage"));
      image.onerror = () => reject(new Error("invalidImage"));
      image.src = url;
    });
  } finally { URL.revokeObjectURL(url); }
  return dimensions;
}

export async function imagePath(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return `assets/${Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("")}.png`;
}

export async function saveArtwork(files: Record<string, Uint8Array>) {
  if (!Object.keys(files).length) return;
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("images", "readwrite");
    for (const [path, bytes] of Object.entries(files)) transaction.objectStore("images").put(new Blob([bytes as BlobPart], { type: "image/png" }), path);
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("Artwork storage failed"));
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function readArtwork(path: string): Promise<Blob> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction("images").objectStore("images").get(path);
    request.onsuccess = () => request.result instanceof Blob ? resolve(request.result) : reject(new Error("missingImage"));
    request.onerror = () => reject(request.error);
  });
}

export async function hydrateArtwork(theme: ThemeManifest) {
  await Promise.all(Object.values(theme.assets ?? {}).map(async (path) => {
    if (urls.has(path)) return;
    const blob = await readArtwork(path);
    if (!urls.has(path)) urls.set(path, URL.createObjectURL(blob));
  }));
}

export async function artworkFiles(theme: ThemeManifest) {
  const entries = await Promise.all([...new Set(Object.values(theme.assets ?? {}))].map(async (path) => [path, new Uint8Array(await (await readArtwork(path)).arrayBuffer())] as const));
  return Object.fromEntries(entries);
}

// Run before mounting the application: no upload can race this sweep.
export async function collectUnusedArtwork(themes: ThemeManifest[]) {
  const keep = new Set(themes.flatMap((theme) => Object.values(theme.assets ?? {})));
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("images", "readwrite");
    const request = transaction.objectStore("images").openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      if (!keep.has(String(cursor.key))) cursor.delete();
      cursor.continue();
    };
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}
