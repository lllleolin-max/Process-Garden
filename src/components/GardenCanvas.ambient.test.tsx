import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { builtInThemes } from "../design-system/themes/builtIn";
import { useAppStore } from "../stores/appStore";
import { GardenCanvas } from "./GardenCanvas";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const initialState = useAppStore.getState();
const spritePaths = new WeakMap<HTMLCanvasElement, string>();
let images: TestImage[];
let callbacks: Map<number, FrameRequestCallback>;
let requestId: number;
let draws: { path: string; alpha: number; x: number; y: number; rotation: number }[];

class TestImage extends EventTarget {
  src = "";
  naturalWidth = 2;
  naturalHeight = 2;
  complete = true;
  constructor() { super(); images.push(this); }
}

function frameAt(time: number) {
  draws = [];
  act(() => {
    const pending = [...callbacks.values()];
    callbacks.clear();
    pending.forEach((callback) => callback(time));
  });
}

async function loadAmbient() {
  await act(async () => images.forEach((image) => image.dispatchEvent(new Event("load"))));
}

beforeEach(() => {
  images = [];
  draws = [];
  callbacks = new Map();
  requestId = 0;
  vi.stubGlobal("Image", TestImage);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callbacks.set(++requestId, callback); return requestId; });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => callbacks.delete(id));
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 740, bottom: 422, width: 740, height: 422, toJSON: () => ({}) });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    const canvas = this;
    let transform = { x: 0, y: 0, rotation: 0 };
    const stack: typeof transform[] = [];
    const context = {
      globalAlpha: 1,
      save: () => stack.push({ ...transform }),
      restore: () => { transform = stack.pop() ?? transform; },
      translate: (x: number, y: number) => { transform.x += x; transform.y += y; },
      rotate: (rotation: number) => { transform.rotation += rotation; },
      drawImage: (source: TestImage | HTMLCanvasElement) => {
        if (source instanceof TestImage) { spritePaths.set(canvas, source.src); return; }
        const path = spritePaths.get(source);
        if (path && /\/(habitat|pollinator)\.png/.test(path)) draws.push({ path, alpha: context.globalAlpha, ...transform });
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
  useAppStore.setState({ ...initialState, themeId: "garden", customThemes: [], paused: false, reducedMotion: false, particlesEnabled: true, snapshot: { ...initialState.snapshot, processes: [] } });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  useAppStore.setState(initialState);
});

describe("theme-specific ambient layers", () => {
  it.each(["garden", "eldritch", "custom-abyss"])("loads the correct %s atlas family in all display modes", async (themeId) => {
    const customThemes = [{ ...builtInThemes[1], id: "custom-abyss", basedOn: "eldritch" as const }];
    useAppStore.setState({ themeId, customThemes, reducedMotion: true });
    render(<GardenCanvas />);
    await loadAmbient();
    frameAt(1_000);
    expect(draws).toHaveLength(8);
    expect(draws.every((draw) => draw.path.includes(`/generated/refined/${themeId === "garden" ? "garden" : "eldritch-blue"}/`))).toBe(true);
    act(() => useAppStore.getState().setDisplayMode("wallpaper"));
    frameAt(1_100);
    expect(draws.filter((draw) => draw.path.includes("/habitat.png"))).toHaveLength(4);
    expect(draws.filter((draw) => draw.path.includes("/pollinator.png"))).toHaveLength(3);
    act(() => useAppStore.getState().setDisplayMode("fullscreen"));
    frameAt(1_200);
    expect(draws).toHaveLength(8);
    act(() => useAppStore.getState().setPreference("particlesEnabled", false));
    frameAt(1_300);
    expect(draws).toHaveLength(0);
    expect(callbacks.size).toBe(0);
  });

  it("fades both layers on toggle and reuses decoded sprites across resource samples", async () => {
    useAppStore.setState({ themeId: "eldritch" });
    render(<GardenCanvas />);
    await loadAmbient();
    for (let time = 1_000; time <= 2_500; time += 50) frameAt(time);
    const previousAlpha = draws[0].alpha;
    const imageCount = images.length;
    act(() => useAppStore.setState({ snapshot: { ...useAppStore.getState().snapshot, timestamp: Date.now() } }));
    frameAt(2_550);
    expect(images).toHaveLength(imageCount);
    expect(draws).toHaveLength(8);
    act(() => useAppStore.getState().setPreference("particlesEnabled", false));
    frameAt(2_600);
    expect(draws[0].alpha).toBeGreaterThan(0);
    expect(draws[0].alpha).toBeLessThan(previousAlpha);
    const fadingAlpha = draws[0].alpha;
    act(() => useAppStore.getState().setPreference("particlesEnabled", true));
    frameAt(2_650);
    expect(draws[0].alpha).toBeGreaterThan(fadingAlpha);
    act(() => useAppStore.getState().setPreference("particlesEnabled", false));
    for (let time = 2_700; time <= 4_500; time += 50) frameAt(time);
    expect(draws).toHaveLength(0);
  });

  it.each(["paused", "reducedMotion"] as const)("holds the current fauna pose when %s changes and excludes the frozen duration", async (setting) => {
    useAppStore.setState({ themeId: "eldritch" });
    render(<GardenCanvas />);
    await loadAmbient();
    for (let time = 1_000; time <= 2_000; time += 50) frameAt(time);
    const poses = () => draws.map(({ path, x, y, rotation }) => ({ path, x, y, rotation }));
    const movingPoses = poses();
    act(() => useAppStore.setState({ [setting]: true }));
    frameAt(12_000);
    expect(poses()).toEqual(movingPoses);
    expect(callbacks.size).toBe(0);
    act(() => useAppStore.setState({ [setting]: false }));
    frameAt(22_000);
    expect(poses()).toEqual(movingPoses);
    frameAt(22_050);
    expect(poses()).not.toEqual(movingPoses);
  });

  it.each(["paused", "reducedMotion"] as const)("preserves an interrupted ambient fade while %s, but applies explicit toggles", async (setting) => {
    render(<GardenCanvas />); await loadAmbient();
    for (let time = 1_000; time <= 2_500; time += 50) frameAt(time);
    act(() => useAppStore.setState({ particlesEnabled: false })); frameAt(2_600);
    const fading = [...draws];
    expect(fading).toHaveLength(8);
    act(() => useAppStore.setState({ [setting]: true })); frameAt(12_600);
    expect(draws).toEqual(fading);
    expect(callbacks.size).toBe(0);
    act(() => useAppStore.setState({ particlesEnabled: true })); frameAt(12_700);
    expect(draws[0].alpha).toBeGreaterThan(fading[0].alpha);
    act(() => useAppStore.setState({ particlesEnabled: false })); frameAt(12_800);
    expect(draws).toHaveLength(0);
  });
});
