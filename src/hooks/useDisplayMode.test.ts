import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setFullscreen } from "../platform/display";
import { attachWallpaper, detachWallpaper } from "../platform/wallpaper";
import { useAppStore } from "../stores/appStore";
import { useDisplayMode } from "./useDisplayMode";

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
});
