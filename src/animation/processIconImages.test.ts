import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProcessIconImages } from "./processIconImages";

let images: HTMLImageElement[];
beforeEach(() => {
  images = [];
  vi.stubGlobal("Image", class {
    src = "";
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor() { images.push(this as unknown as HTMLImageElement); }
  });
});
afterEach(() => vi.unstubAllGlobals());
const loaded = (image: HTMLImageElement) => image.onload?.call(image, new Event("load"));

it("keeps the fallback until the replacement native icon is ready", () => {
  const cache = new ProcessIconImages(), ready = vi.fn();
  cache.update("app", "fallback", ready);
  expect(cache.get("app")).toBeUndefined();
  loaded(images[0]);
  cache.update("app", "native", ready);
  expect(cache.get("app")).toBe(images[0]);
  loaded(images[1]);
  expect(cache.get("app")).toBe(images[1]);
  expect(ready).toHaveBeenCalledTimes(2);
  cache.update("app", "native", ready);
  expect(images).toHaveLength(2);
});

it("ignores an obsolete decode even if its callback was already queued", () => {
  const cache = new ProcessIconImages(), ready = vi.fn();
  cache.update("app", "first", ready);
  const stale = images[0].onload!;
  cache.update("app", "second", ready);
  loaded(images[1]);
  stale.call(images[0], new Event("load"));
  expect(cache.get("app")).toBe(images[1]);
  expect(ready).toHaveBeenCalledTimes(1);
});

it("preserves the previous image on decode failure and permits a later replacement", () => {
  const cache = new ProcessIconImages(), ready = vi.fn();
  cache.update("app", "fallback", ready); loaded(images[0]);
  cache.update("app", "broken", ready);
  images[1].onerror?.call(images[1], new Event("error"));
  expect(cache.get("app")).toBe(images[0]);
  cache.update("app", "recovered", ready); loaded(images[2]);
  expect(cache.get("app")).toBe(images[2]);
});

it("invalidates pending callbacks when removed or unmounted", () => {
  const cache = new ProcessIconImages(), ready = vi.fn();
  cache.update("app", "fallback", ready); loaded(images[0]);
  cache.update("app", null, ready);
  expect(cache.get("app")).toBeUndefined();
  cache.update("app", "pending", ready);
  const stale = images[1].onload!;
  cache.clear(); stale.call(images[1], new Event("load"));
  expect(cache.get("app")).toBeUndefined();
  expect(images[1].onload).toBeNull();
  expect(ready).toHaveBeenCalledTimes(2);
});
