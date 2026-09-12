import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../stores/appStore";
import { GardenCanvas } from "./GardenCanvas";

const initialState = useAppStore.getState();
let callbacks: Map<number, FrameRequestCallback>;
let requestId: number;
let clearRect: ReturnType<typeof vi.fn>;
let fillText: ReturnType<typeof vi.fn>;
let hidden: boolean;

function frameAt(time: number) {
  act(() => {
    const pending = [...callbacks.values()];
    callbacks.clear();
    pending.forEach((callback) => callback(time));
  });
}

beforeEach(() => {
  callbacks = new Map();
  requestId = 0;
  hidden = false;
  clearRect = vi.fn();
  fillText = vi.fn();
  const context = new Proxy({ clearRect, fillText, measureText: (text: string) => ({ width: text.length * 6 }), createRadialGradient: () => ({ addColorStop: vi.fn() }) }, {
    get(target, property) { return property in target ? target[property as keyof typeof target] : vi.fn(); },
    set(target, property, value) { Reflect.set(target, property, value); return true; }
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 740, bottom: 422, width: 740, height: 422, toJSON: () => ({}) });
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callbacks.set(++requestId, callback); return requestId; });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => callbacks.delete(id));
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  useAppStore.setState({ ...initialState, paused: false, reducedMotion: false, selectedPid: null, searchQuery: "", labelsAlwaysVisible: true });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  useAppStore.setState(initialState);
});

describe("garden render scheduling", () => {
  it("renders reduced motion immediately, then sleeps until a meaningful state change", () => {
    useAppStore.setState({ reducedMotion: true });
    render(<GardenCanvas />);
    frameAt(1_000);
    expect(clearRect).toHaveBeenCalledTimes(1);
    expect(fillText).toHaveBeenCalled();
    expect(callbacks.size).toBe(0);
    act(() => useAppStore.getState().setSettingsOpen(true));
    expect(callbacks.size).toBe(0);
    act(() => useAppStore.getState().setSelectedPid(initialState.snapshot.processes[0].pid));
    expect(callbacks.size).toBe(1);
    frameAt(1_100);
    expect(clearRect).toHaveBeenCalledTimes(2);
    expect(callbacks.size).toBe(0);
  });

  it("stops a running loop while paused and wakes it on resume", () => {
    render(<GardenCanvas />);
    frameAt(1_000);
    expect(callbacks.size).toBe(1);
    act(() => useAppStore.getState().setPaused(true));
    frameAt(1_100);
    expect(callbacks.size).toBe(0);
    act(() => useAppStore.getState().setPaused(false));
    frameAt(1_200);
    expect(callbacks.size).toBe(1);
  });

  it("cancels hidden work and resumes only when visible", () => {
    render(<GardenCanvas />);
    frameAt(1_000);
    hidden = true;
    fireEvent(document, new Event("visibilitychange"));
    expect(callbacks.size).toBe(0);
    hidden = false;
    fireEvent(document, new Event("visibilitychange"));
    expect(callbacks.size).toBe(1);
  });

  it("supports selecting organisms and returning to the core with the keyboard", () => {
    const { container } = render(<GardenCanvas />);
    const canvas = container.querySelector("canvas")!;
    fireEvent.keyDown(canvas, { key: "ArrowRight" });
    expect(useAppStore.getState().selectedPid).not.toBeNull();
    fireEvent.keyDown(canvas, { key: "Escape" });
    expect(useAppStore.getState().selectedPid).toBeNull();
  });
});
