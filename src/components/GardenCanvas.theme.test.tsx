import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SceneAssets } from "../animation/sceneAssets";
import { useAppStore } from "../stores/appStore";
import { GardenCanvas } from "./GardenCanvas";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const loader = vi.hoisted(() => ({
  cache: new Map<string, SceneAssets>(),
  pending: new Map<string, { promise: Promise<SceneAssets>; resolve: (value: SceneAssets) => void; reject: (error: Error) => void }>()
}));
vi.mock("../animation/sceneAssets", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../animation/sceneAssets")>();
  return {
    ...actual,
    getCachedSceneAssets: (theme: Parameters<typeof actual.sceneAssetFamily>[0]) => loader.cache.get(actual.sceneAssetFamily(theme)),
    loadSceneAssets: (theme: Parameters<typeof actual.sceneAssetFamily>[0]) => {
      const family = actual.sceneAssetFamily(theme);
      if (loader.cache.has(family)) return Promise.resolve(loader.cache.get(family)!);
      if (!loader.pending.has(family)) {
        let resolve!: (assets: SceneAssets) => void, reject!: (error: Error) => void;
        const promise = new Promise<SceneAssets>((yes, no) => { resolve = yes; reject = no; });
        loader.pending.set(family, { promise, resolve, reject });
      }
      return loader.pending.get(family)!.promise;
    }
  };
});

const initial = useAppStore.getState();
const tags = new WeakMap<HTMLCanvasElement, string>();
let callbacks: Map<number, FrameRequestCallback>, nextId: number, now: number;
let paint: { tag: string; alpha: number }[], copies: HTMLCanvasElement[];
let viewportWidth: number;
let resizeCanvas: () => void;
function tick(ms = 20) {
  now += ms; paint = [];
  act(() => { const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach((callback) => callback(now)); });
}
function advance(ms: number) { for (let elapsed = 0; elapsed < ms; elapsed += 20) tick(); }
function art(family: string): SceneAssets {
  const sprite = () => { const canvas = document.createElement("canvas"); canvas.width = canvas.height = 20; tags.set(canvas, family); return canvas; };
  return { core: sprite(), maw: family === "eldritch" ? sprite() : null, creatureVariants: Array.from({ length: 8 }, () => [sprite()]), habitats: [], pollinators: [], agents: [], celestial: [] };
}
async function ready(family: string) {
  await act(async () => {
    const bundle = loader.cache.get(family) ?? art(family);
    loader.cache.set(family, bundle);
    loader.pending.get(family)?.resolve(bundle);
    loader.pending.delete(family);
  });
}
async function request(themeId: string) { await act(async () => useAppStore.setState({ themeId })); }
async function mount() {
  const view = render(<GardenCanvas />);
  await ready("garden"); tick(); advance(2_000);
  return view;
}

beforeEach(() => {
  loader.cache.clear(); loader.pending.clear();
  callbacks = new Map(); nextId = 0; now = 1_000; paint = []; copies = [];
  viewportWidth = 740;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callbacks.set(++nextId, callback); return nextId; });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => callbacks.delete(id));
  vi.stubGlobal("ResizeObserver", class { constructor(callback: () => void) { resizeCanvas = callback; } observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({ x: 0, y: 0, left: 0, top: 0, right: viewportWidth, bottom: 422, width: viewportWidth, height: 422, toJSON: () => ({}) }));
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    const canvas = this, stack: number[] = [];
    const context = {
      globalAlpha: 1,
      save: () => stack.push(context.globalAlpha), restore: () => { context.globalAlpha = stack.pop() ?? 1; },
      drawImage: (source: HTMLCanvasElement) => {
        if (!(source instanceof HTMLCanvasElement)) return;
        if (source.isConnected && !canvas.isConnected) { tags.set(canvas, "snapshot"); copies.push(canvas); }
        if (canvas.isConnected && tags.has(source)) paint.push({ tag: tags.get(source)!, alpha: context.globalAlpha });
      },
      measureText: (text: string) => ({ width: text.length * 6 }),
      createRadialGradient: () => ({ addColorStop() {} })
    };
    return new Proxy(context, { get: (target, key) => key in target ? target[key as keyof typeof target] : () => {}, set: (target, key, value) => Reflect.set(target, key, value) }) as unknown as CanvasRenderingContext2D;
  });
  useAppStore.setState({ ...initial, themeId: "garden", customThemes: [], paused: false, reducedMotion: false, particlesEnabled: false, selectedPid: null, searchQuery: "", snapshot: { ...initial.snapshot, processes: [initial.snapshot.processes[0]] } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); useAppStore.setState(initial); });

describe("ready-to-ready Canvas theme transitions", () => {
  it("keeps the old generated scene and backdrop until all new assets are ready, then crossfades", async () => {
    const view = await mount();
    await request("eldritch");
    for (let index = 0; index < 8; index++) {
      tick(); expect(paint.some((draw) => draw.tag === "garden")).toBe(true);
      expect(paint.some((draw) => draw.tag === "eldritch")).toBe(false);
    }
    const panel = view.container.querySelector("section")!;
    expect(panel.dataset.sceneTheme).toBe("garden");
    expect(panel.style.getPropertyValue("--theme-background-image")).toContain("/garden/");
    const backdrops = [...panel.querySelectorAll<HTMLDivElement>(".canvas-backdrop")];
    expect(backdrops[1].style.backgroundImage).toBe("");
    expect(panel.getAttribute("aria-busy")).toBe("true");
    await ready("eldritch"); tick();
    expect(panel.dataset.sceneTheme).toBe("eldritch");
    expect(paint.at(-1)).toEqual({ tag: "snapshot", alpha: 1 });
    advance(200);
    expect(paint.find((draw) => draw.tag === "snapshot")?.alpha).toBeCloseTo(0.6);
    expect(Number(backdrops[0].style.opacity)).toBeCloseTo(0.46 * 0.6);
    expect(Number(backdrops[1].style.opacity)).toBeCloseTo(0.46 * 0.4);
    advance(400);
    expect(paint.every((draw) => draw.tag === "eldritch")).toBe(true);
    expect(copies).toHaveLength(1); expect(copies[0].width).toBe(0);
    expect(panel.getAttribute("aria-busy")).toBe("false");
  });

  it("ignores a stale theme request and bounds rapid reversals to one live snapshot", async () => {
    const view = await mount();
    await request("eldritch"); await request("garden");
    await ready("eldritch"); tick();
    expect(view.container.querySelector("section")!.dataset.sceneTheme).toBe("garden");
    expect(copies).toHaveLength(0);
    await request("eldritch"); tick(); advance(100);
    expect(paint.some((draw) => draw.tag === "snapshot")).toBe(true);
    await request("garden"); tick();
    expect(copies).toHaveLength(2);
    expect(copies.filter((copy) => copy.width > 0)).toHaveLength(1);
    expect(paint.at(-1)).toEqual({ tag: "snapshot", alpha: 1 });
    view.unmount(); expect(copies.every((copy) => copy.width === 0)).toBe(true);
    expect(callbacks.size).toBe(0);
  });

  it("preserves the scene after asset failure and supports an explicit retry", async () => {
    const view = await mount(); await request("eldritch");
    await act(async () => { const failed = loader.pending.get("eldritch")!; loader.pending.delete("eldritch"); failed.reject(new Error("offline")); });
    tick(); expect(paint.every((draw) => draw.tag === "garden")).toBe(true);
    expect(view.getByRole("alert").textContent).toContain("garden.assetError");
    fireEvent.click(view.getByRole("button", { name: "garden.retryTheme" }));
    expect(loader.pending.has("eldritch")).toBe(true);
    await ready("eldritch"); tick();
    expect(view.queryByRole("alert")).toBeNull();
    expect(view.container.querySelector("section")!.dataset.sceneTheme).toBe("eldritch");
  });

  it.each(["paused", "reducedMotion"] as const)("changes a ready theme while %s without starting an idle animation loop", async (setting) => {
    useAppStore.setState({ [setting]: true });
    await mount(); await request("eldritch"); await ready("eldritch"); tick(40);
    expect(paint.length).toBeGreaterThan(0);
    expect(paint.every((draw) => draw.tag === "eldritch")).toBe(true);
    expect(copies).toHaveLength(0); expect(callbacks.size).toBe(0);
  });

  it("holds a partially blended scene through pause and resumes from that same blend", async () => {
    const view = await mount(); await request("eldritch"); await ready("eldritch"); tick(); advance(200);
    const opacity = paint.find((draw) => draw.tag === "snapshot")!.alpha;
    const backdrops = () => [...view.container.querySelectorAll<HTMLDivElement>(".canvas-backdrop")].map((layer) => layer.style.opacity);
    const before = backdrops();
    act(() => useAppStore.setState({ paused: true })); tick(10_000);
    expect(paint.find((draw) => draw.tag === "snapshot")!.alpha).toBe(opacity);
    expect(backdrops()).toEqual(before);
    expect(callbacks.size).toBe(0);
    act(() => useAppStore.setState({ paused: false })); tick(10_000);
    expect(paint.find((draw) => draw.tag === "snapshot")!.alpha).toBe(opacity);
    advance(400); expect(paint.some((draw) => draw.tag === "snapshot")).toBe(false);
  });

  it("settles a frozen blend on the next reduced-motion sample instead of keeping stale process ghosts", async () => {
    await mount(); await request("eldritch"); await ready("eldritch"); tick(); advance(200);
    const before = paint.find((draw) => draw.tag === "snapshot")!.alpha;
    act(() => useAppStore.setState({ reducedMotion: true })); tick(40);
    expect(paint.find((draw) => draw.tag === "snapshot")!.alpha).toBe(before);
    act(() => useAppStore.setState({ snapshot: { ...useAppStore.getState().snapshot, timestamp: initial.snapshot.timestamp + 1_000, processes: [] } })); tick(40);
    expect(paint.some((draw) => draw.tag === "snapshot")).toBe(false);
    expect(copies[0].width).toBe(0);
    expect(callbacks.size).toBe(0);
  });

  it.each([
    ["paused", "search"], ["reducedMotion", "search"],
    ["paused", "selection"], ["reducedMotion", "selection"],
    ["paused", "resize"], ["reducedMotion", "resize"]
  ] as const)("finishes the frozen theme snapshot on %s %s without restarting animation", async (setting, action) => {
    const view = await mount();
    await request("eldritch"); await ready("eldritch"); tick(); advance(200);
    const opacity = paint.find((draw) => draw.tag === "snapshot")!.alpha;
    act(() => useAppStore.setState({ [setting]: true })); tick(40);
    expect(paint.find((draw) => draw.tag === "snapshot")!.alpha).toBe(opacity);
    expect(callbacks.size).toBe(0);
    const timestamp = useAppStore.getState().snapshot.timestamp;
    act(() => {
      if (action === "search") useAppStore.setState({ searchQuery: "no-process-matches-this-filter" });
      else if (action === "selection") useAppStore.setState({ selectedPid: initial.snapshot.processes[0].pid });
      else { viewportWidth = 480; resizeCanvas(); }
    });
    tick(40);
    expect(useAppStore.getState().snapshot.timestamp).toBe(timestamp);
    expect(paint.some((draw) => draw.tag === "snapshot")).toBe(false);
    expect(copies[0].width).toBe(0);
    expect(callbacks.size).toBe(0);
    const backdropOpacity = [...view.container.querySelectorAll<HTMLDivElement>(".canvas-backdrop")].map((layer) => Number(layer.style.opacity));
    expect(backdropOpacity).toEqual([0, 0.46]);
  });

  it("finishes a frozen blend when the search changes but the matching population stays the same", async () => {
    await mount(); await request("eldritch"); await ready("eldritch"); tick(); advance(200);
    act(() => useAppStore.setState({ paused: true })); tick(40);
    expect(paint.some((draw) => draw.tag === "snapshot")).toBe(true);
    act(() => useAppStore.setState({ searchQuery: String(initial.snapshot.processes[0].pid) })); tick(40);
    expect(paint.some((draw) => draw.tag === "snapshot")).toBe(false);
    expect(paint.some((draw) => draw.tag === "eldritch")).toBe(true);
    expect(callbacks.size).toBe(0);
  });
});
