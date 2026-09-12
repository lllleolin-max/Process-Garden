import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setFullscreen } from "../platform/display";
import { attachWallpaper, detachWallpaper } from "../platform/wallpaper";
import { useAppStore } from "../stores/appStore";
import { syncBrowserFullscreenExit, useDisplayMode } from "./useDisplayMode";

vi.mock("../platform/display", () => ({ setFullscreen: vi.fn() }));
vi.mock("../platform/wallpaper", () => ({ attachWallpaper: vi.fn(), detachWallpaper: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
  useAppStore.setState({ displayMode: "windowed" });
});
afterEach(cleanup);

describe("display mode transitions", () => {
  it("keeps the windowed layout until fullscreen succeeds", async () => {
    let finish!: () => void;
    vi.mocked(setFullscreen).mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    const { result } = renderHook(useDisplayMode);
    let transition!: Promise<boolean>;
    act(() => { transition = result.current("fullscreen"); });
    expect(useAppStore.getState().displayMode).toBe("windowed");
    await act(async () => { finish(); expect(await transition).toBe(true); });
    expect(useAppStore.getState().displayMode).toBe("fullscreen");
  });

  it("returns failure and keeps the previous layout when fullscreen is rejected", async () => {
    vi.mocked(setFullscreen).mockRejectedValueOnce(new Error("Fullscreen denied")).mockResolvedValueOnce(undefined);
    const { result } = renderHook(useDisplayMode);
    await act(async () => { expect(await result.current("fullscreen")).toBe(false); });
    expect(useAppStore.getState().displayMode).toBe("windowed");
    expect(setFullscreen).toHaveBeenLastCalledWith(false);
  });

  it("detaches wallpaper before returning to a normal window", async () => {
    useAppStore.setState({ displayMode: "wallpaper" });
    const { result } = renderHook(useDisplayMode);
    await act(async () => { expect(await result.current("windowed")).toBe(true); });
    expect(detachWallpaper).toHaveBeenCalledOnce();
    expect(setFullscreen).toHaveBeenCalledWith(false);
    expect(attachWallpaper).not.toHaveBeenCalled();
    expect(useAppStore.getState().displayMode).toBe("windowed");
  });

  it("lets Escape cancel a pending fullscreen request even while the stored mode is windowed", async () => {
    let finishEnter!: () => void;
    vi.mocked(setFullscreen).mockImplementationOnce(() => new Promise<void>((resolve) => { finishEnter = resolve; })).mockResolvedValue(undefined);
    const firstControl = renderHook(useDisplayMode);
    const escapeControl = renderHook(useDisplayMode);
    const enter = firstControl.result.current("fullscreen");
    const exit = escapeControl.result.current("windowed");
    expect(setFullscreen).toHaveBeenCalledTimes(1);
    await act(async () => {
      finishEnter();
      expect(await enter).toBe(true);
      expect(await exit).toBe(true);
    });
    expect(vi.mocked(setFullscreen).mock.calls).toEqual([[true], [false]]);
    expect(useAppStore.getState().displayMode).toBe("windowed");
  });

  it("cleans up a wallpaper attachment that completes after Escape without publishing wallpaper", async () => {
    useAppStore.setState({ displayMode: "fullscreen" });
    let finishAttach!: (attached: boolean) => void;
    vi.mocked(attachWallpaper).mockImplementationOnce(() => new Promise<boolean>((resolve) => { finishAttach = resolve; }));
    const changes: string[] = [];
    const unsubscribe = useAppStore.subscribe((state) => changes.push(state.displayMode));
    const { result } = renderHook(useDisplayMode);
    const enter = result.current("wallpaper");
    await act(async () => { await Promise.resolve(); });
    expect(attachWallpaper).toHaveBeenCalledOnce();
    const exit = result.current("windowed");
    await act(async () => {
      finishAttach(true);
      expect(await enter).toBe(true);
      expect(await exit).toBe(true);
    });
    unsubscribe();
    expect(detachWallpaper).toHaveBeenCalledOnce();
    expect(setFullscreen).toHaveBeenLastCalledWith(false);
    expect(changes).not.toContain("wallpaper");
    expect(useAppStore.getState().displayMode).toBe("windowed");
  });

  it("skips superseded queued requests across independent controls", async () => {
    let finishEnter!: () => void;
    vi.mocked(setFullscreen).mockImplementationOnce(() => new Promise<void>((resolve) => { finishEnter = resolve; })).mockResolvedValue(undefined);
    const { result } = renderHook(useDisplayMode);
    const enter = result.current("fullscreen");
    const obsoleteWallpaper = result.current("wallpaper");
    const exit = result.current("windowed");
    await act(async () => {
      finishEnter();
      await Promise.all([enter, obsoleteWallpaper, exit]);
    });
    expect(attachWallpaper).not.toHaveBeenCalled();
    expect(vi.mocked(setFullscreen).mock.calls).toEqual([[true], [false]]);
    expect(useAppStore.getState().displayMode).toBe("windowed");
  });

  it("synchronizes a browser fullscreen exit while preserving wallpaper mode", async () => {
    useAppStore.setState({ displayMode: "fullscreen" });
    await act(async () => { expect(await syncBrowserFullscreenExit()).toBe(true); });
    expect(useAppStore.getState().displayMode).toBe("windowed");
    vi.mocked(setFullscreen).mockClear();
    useAppStore.setState({ displayMode: "wallpaper" });
    await act(async () => { expect(await syncBrowserFullscreenExit()).toBe(true); });
    expect(useAppStore.getState().displayMode).toBe("wallpaper");
    expect(setFullscreen).not.toHaveBeenCalled();
  });

  it("cancels a pending enter when the browser consumes Escape and emits fullscreenchange", async () => {
    let finishEnter!: () => void;
    vi.mocked(setFullscreen).mockImplementationOnce(() => new Promise<void>((resolve) => { finishEnter = resolve; })).mockResolvedValue(undefined);
    const { result } = renderHook(useDisplayMode);
    const enter = result.current("fullscreen");
    const browserExit = syncBrowserFullscreenExit();
    await act(async () => {
      finishEnter();
      await Promise.all([enter, browserExit]);
    });
    expect(setFullscreen).toHaveBeenLastCalledWith(false);
    expect(useAppStore.getState().displayMode).toBe("windowed");
  });
});
