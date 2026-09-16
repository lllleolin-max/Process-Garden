import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../stores/appStore";
import { GardenCanvas } from "./GardenCanvas";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const initial = useAppStore.getState();
const noon = new Date(2026, 8, 12, 12);
const process = { ...initial.snapshot.processes[0], pid: 4242, name: "chrome" };
const sprites = new WeakMap<HTMLCanvasElement, { path: string; cell: number }>();
type Transform = { x: number; y: number; rotation: number; scaleX: number; scaleY: number; alpha: number };
type Paint = Transform & { path: string; cell: number; rect: number[] };
let images: TestImage[], frames: Map<number, FrameRequestCallback>, paint: Paint[], nextId: number, now: number;

class TestImage extends EventTarget {
  src = ""; naturalWidth = 2; naturalHeight = 2; complete = true;
  onload?: () => void;
  constructor() { super(); images.push(this); }
}
function tick(ms = 20) {
  now += ms; paint = [];
  act(() => { const pending = [...frames.values()]; frames.clear(); pending.forEach((callback) => callback(now)); });
}
function advance(ms: number) { for (let elapsed = 0; elapsed < ms; elapsed += 20) tick(20); }
async function mount() {
  render(<GardenCanvas />);
  await act(async () => images.forEach((image) => { image.dispatchEvent(new Event("load")); image.onload?.(); }));
  tick();
}
function focalArt() { return paint.filter(({ path }) => /\/(process[1-4]|core|maw)\.png/.test(path) || path.includes("celestial")); }

beforeEach(() => {
  images = []; frames = new Map(); paint = []; nextId = 0; now = 1_000;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(noon);
  vi.stubGlobal("Image", TestImage);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++nextId, callback); return nextId; });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 740, bottom: 422, width: 740, height: 422, toJSON: () => ({}) });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    const canvas = this;
    let transform = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
    const stack: Transform[] = [];
    const context = {
      globalAlpha: 1,
      save: () => stack.push({ ...transform, alpha: context.globalAlpha }),
      restore: () => { const saved = stack.pop(); if (saved) { const { alpha, ...pose } = saved; transform = pose; context.globalAlpha = alpha; } },
      translate: (x: number, y: number) => { transform.x += x; transform.y += y; },
      rotate: (rotation: number) => { transform.rotation += rotation; },
      scale: (x: number, y: number) => { transform.scaleX *= x; transform.scaleY *= y; },
      drawImage: (source: TestImage | HTMLCanvasElement, ...rect: number[]) => {
        const tag = source instanceof TestImage ? { path: source.src, cell: rect.length === 8 ? (rect[0] > 0 ? 1 : 0) + (rect[1] > 0 ? 2 : 0) : 0 } : sprites.get(source);
        if (!tag) return;
        if (!canvas.isConnected) sprites.set(canvas, tag);
        else paint.push({ ...tag, ...transform, rect, alpha: context.globalAlpha });
      },
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      measureText: (value: string) => ({ width: value.length * 6 }),
      createRadialGradient: () => ({ addColorStop() {} })
    };
    return new Proxy(context, { get: (target, key) => key in target ? target[key as keyof typeof target] : () => {}, set: (target, key, value) => Reflect.set(target, key, value) }) as unknown as CanvasRenderingContext2D;
  });
  useAppStore.setState({ ...initial, themeId: "garden", customThemes: [], paused: false, reducedMotion: false, displayMode: "wallpaper", animationFps: 60, selectedPid: null, searchQuery: "", particlesEnabled: false, celestialCycleEnabled: true, snapshot: { ...initial.snapshot, timestamp: noon.getTime(), processes: [process] } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); useAppStore.setState(initial); });

describe("focal artwork phase continuity", () => {
  it.each(["garden", "eldritch"])("freezes %s creatures, core and sun without rewinding them to time zero", async (themeId) => {
    useAppStore.setState({ themeId }); await mount(); advance(2_200);
    const before = focalArt();
    expect(before.length).toBeGreaterThanOrEqual(3);
    act(() => useAppStore.setState({ reducedMotion: true })); tick(10_000);
    expect(focalArt()).toEqual(before);
    expect(frames.size).toBe(0);
    act(() => useAppStore.setState({ reducedMotion: false })); tick(10_000);
    expect(focalArt()).toEqual(before);
    tick(); expect(focalArt()).not.toEqual(before);
  });

  it("does not advance the sun on a paused selection redraw, then catches up gradually", async () => {
    await mount(); advance(2_200);
    const before = paint.find(({ path }) => path.includes("celestial"));
    act(() => useAppStore.setState({ paused: true })); tick();
    vi.setSystemTime(new Date(2026, 8, 12, 15));
    act(() => useAppStore.setState({ selectedPid: process.pid })); tick(10_000);
    expect(paint.find(({ path }) => path.includes("celestial"))).toEqual(before);
    act(() => useAppStore.setState({ paused: false })); tick(10_000);
    expect(paint.find(({ path }) => path.includes("celestial"))).toEqual(before);
    tick();
    const resumed = paint.find(({ path }) => path.includes("celestial"))!;
    expect(Math.hypot(resumed.x - before!.x, resumed.y - before!.y)).toBeLessThan(2);
  });

  it("keeps a partial birth and its open maw through reduced motion and selection", async () => {
    useAppStore.setState({ themeId: "eldritch" }); await mount(); advance(300);
    const body = () => paint.find(({ path }) => path.includes("/process"));
    const maw = () => paint.find(({ path }) => path.endsWith("maw.png"));
    const before = { body: body(), maw: maw() };
    expect(before.body).toBeDefined(); expect(before.maw).toBeDefined();
    act(() => useAppStore.setState({ reducedMotion: true })); tick(40);
    expect({ body: body(), maw: maw() }).toEqual(before);
    act(() => useAppStore.setState({ selectedPid: process.pid })); tick(40);
    // Selection changes the highlight, not the actor's position, size or phase.
    expect({ ...body(), alpha: before.body!.alpha }).toEqual(before.body);
    expect(maw()).toEqual(before.maw);
  });

  it("settles an actual new sample while reduced, without restarting an idle loop", async () => {
    useAppStore.setState({ reducedMotion: true }); await mount();
    const before = focalArt().find(({ path }) => path.includes("/process"))!;
    act(() => useAppStore.setState({ snapshot: { ...useAppStore.getState().snapshot, timestamp: noon.getTime() + 1_000, processes: [{ ...process, memoryBytes: 8 * process.memoryBytes }] } }));
    tick(40);
    const after = focalArt().find(({ path }) => path.includes("/process"))!;
    expect(after.rect[2]).toBeGreaterThan(before.rect[2]);
    expect(frames.size).toBe(0);
  });

  it("does not flash to full opacity when a partly born process exits, or replay birth when it returns", async () => {
    useAppStore.setState({ themeId: "eldritch" }); await mount(); advance(300);
    const body = () => paint.find(({ path }) => path.includes("/process"))!;
    const opacity = body().alpha;
    act(() => useAppStore.setState({ snapshot: { ...useAppStore.getState().snapshot, processes: [] } })); tick();
    expect(body().alpha).toBeCloseTo(opacity, 12);
    advance(200);
    const before = body();
    act(() => useAppStore.setState({ snapshot: { ...useAppStore.getState().snapshot, processes: [process] } })); tick();
    const after = body();
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeLessThan(8);
    expect(after.alpha - before.alpha).toBeLessThan(0.04);
  });

  it("holds an interrupted swallow, then clears it on a new reduced-motion sample", async () => {
    useAppStore.setState({ themeId: "eldritch" }); await mount(); advance(2_200);
    act(() => useAppStore.setState({ snapshot: { ...useAppStore.getState().snapshot, processes: [] } })); advance(600);
    const before = focalArt();
    expect(before.some(({ path }) => path.endsWith("maw.png"))).toBe(true);
    act(() => useAppStore.setState({ reducedMotion: true })); tick(40);
    expect(focalArt()).toEqual(before);
    expect(frames.size).toBe(0);
    act(() => useAppStore.setState({ snapshot: { ...useAppStore.getState().snapshot, timestamp: noon.getTime() + 2_000 } })); tick(40);
    expect(focalArt().some(({ path }) => path.includes("/process") || path.includes("maw"))).toBe(false);
    expect(frames.size).toBe(0);
  });
});
