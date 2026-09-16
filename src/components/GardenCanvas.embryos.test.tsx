import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../stores/appStore";
import { GardenCanvas } from "./GardenCanvas";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const initial = useAppStore.getState();
const timestamp = 1_800_000_000_000;
const parent = { ...initial.snapshot.processes[0], name: "codex", pid: 1 };
const child = { ...parent, name: "task-runner", pid: 2, parentPid: 1, startedAt: timestamp - 10_000 };
const tags = new WeakMap<HTMLCanvasElement, { path: string; cell: number }>();
let images: MockImage[];
let frames: Map<number, FrameRequestCallback>;
let nextId: number;
let now: number;
let paint: { path: string; cell: number; alpha: number }[];
class MockImage extends EventTarget {
  src = ""; naturalWidth = 2; naturalHeight = 2; complete = true;
  onload?: () => void;
  constructor() { super(); images.push(this); }
}
function tick(ms = 20) {
  now += ms;
  paint = [];
  act(() => { const pending = [...frames.values()]; frames.clear(); pending.forEach((callback) => callback(now)); });
}
function advance(ms: number) { for (let elapsed = 0; elapsed < ms; elapsed += 20) tick(20); }
async function mount() {
  const view = render(<GardenCanvas />);
  await act(async () => images.forEach((image) => { image.dispatchEvent(new Event("load")); image.onload?.(); }));
  tick();
  return view;
}
const embryos = () => paint.filter((item) => item.path.includes("/agent.png") && item.cell > 0);

beforeEach(() => {
  images = []; frames = new Map(); nextId = 0; now = 1_000; paint = [];
  vi.stubGlobal("Image", MockImage);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++nextId, callback); return nextId; });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 740, bottom: 422, width: 740, height: 422, toJSON: () => ({}) });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    const canvas = this;
    const alphas: number[] = [];
    const context = {
      globalAlpha: 1,
      save: () => alphas.push(context.globalAlpha),
      restore: () => { context.globalAlpha = alphas.pop() ?? 1; },
      drawImage: (source: MockImage | HTMLCanvasElement, x: number, y: number) => {
        const tag = source instanceof MockImage ? { path: source.src, cell: (x > 0 ? 1 : 0) + (y > 0 ? 2 : 0) } : tags.get(source);
        if (!tag) return;
        if (!canvas.isConnected) tags.set(canvas, tag);
        else paint.push({ ...tag, alpha: context.globalAlpha });
      },
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      measureText: (text: string) => ({ width: text.length * 6 }),
      createRadialGradient: () => ({ addColorStop() {} })
    };
    return new Proxy(context, {
      get(target, key) { return key in target ? target[key as keyof typeof target] : () => {}; },
      set(target, key, value) { Reflect.set(target, key, value); return true; }
    }) as unknown as CanvasRenderingContext2D;
  });
  useAppStore.setState({ ...initial, themeId: "eldritch", customThemes: [], reducedMotion: true, paused: false, selectedPid: null, particlesEnabled: false, snapshot: { ...initial.snapshot, timestamp, processes: [parent, child] } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); useAppStore.setState(initial); });

describe("embryos in the real Canvas render path", () => {
  it("blends both generated growth cells instead of swapping the sprite at a sample", async () => {
    await mount();
    expect(embryos().map((item) => item.cell)).toEqual([1]);
    act(() => useAppStore.setState({ reducedMotion: false })); tick();
    act(() => useAppStore.setState({ snapshot: { ...useAppStore.getState().snapshot, timestamp: timestamp + 50_000 } }));
    advance(100);
    expect(embryos().map((item) => item.cell)).toEqual([1, 2]);
    expect(embryos().every((item) => item.alpha > 0 && item.alpha < 0.9)).toBe(true);
  });

  it("keeps a removed child visible and drives the generated central maw", async () => {
    await mount();
    act(() => useAppStore.setState({ reducedMotion: false })); tick();
    act(() => useAppStore.setState({ snapshot: { ...useAppStore.getState().snapshot, processes: [parent] } }));
    advance(400);
    expect(embryos().length).toBeGreaterThan(0);
    expect(paint.some((item) => item.path.endsWith("maw.png"))).toBe(true);
    advance(2_000);
    expect(embryos()).toHaveLength(0);
  });

  it("lets keyboard users select a child and retains its agent in the visible population", async () => {
    const view = await mount();
    const canvas = view.container.querySelector("canvas")!;
    fireEvent.keyDown(canvas, { key: "ArrowRight" });
    expect(useAppStore.getState().selectedPid).toBe(parent.pid);
    fireEvent.keyDown(canvas, { key: "ArrowRight" });
    expect(useAppStore.getState().selectedPid).toBe(child.pid);
    tick(40);
    expect(paint.some((item) => item.path.includes("/agent.png") && item.cell === 0)).toBe(true);
    expect(embryos()).toHaveLength(1);
  });

  it("finds a fourth child through search while keeping its parent and the three-sprite cap", async () => {
    const siblings = [child, { ...child, pid: 3 }, { ...child, pid: 4 }, { ...child, pid: 5, name: "needle-child" }];
    useAppStore.setState({ searchQuery: "needle-child", snapshot: { ...useAppStore.getState().snapshot, processes: [parent, ...siblings] } });
    const view = await mount();
    expect(paint.some((item) => item.path.includes("/agent.png") && item.cell === 0)).toBe(true);
    expect(embryos()).toHaveLength(3);
    const canvas = view.container.querySelector("canvas")!;
    fireEvent.keyDown(canvas, { key: "ArrowRight" });
    fireEvent.keyDown(canvas, { key: "ArrowRight" });
    expect(useAppStore.getState().selectedPid).toBe(5);
  });
});
