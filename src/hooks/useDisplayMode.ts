import { useCallback } from "react";
import { setFullscreen } from "../platform/display";
import { attachWallpaper, detachWallpaper } from "../platform/wallpaper";
import { useAppStore, type DisplayMode } from "../stores/appStore";

let changingMode = false;

export function useDisplayMode() {
  const setDisplayMode = useAppStore((state) => state.setDisplayMode);
  return useCallback(async (mode: DisplayMode) => {
    if (changingMode) return false;
    const previousMode = useAppStore.getState().displayMode;
    if (previousMode === mode) return true;
    changingMode = true;
    try {
      if (previousMode === "wallpaper") await detachWallpaper();
      await setFullscreen(mode !== "windowed");
      if (mode === "wallpaper") await attachWallpaper();
      // Publish only after the platform accepts the transition.
      setDisplayMode(mode);
      return true;
    } catch {
      try {
        await setFullscreen(previousMode !== "windowed");
        if (previousMode === "wallpaper") await attachWallpaper();
      } catch {
        // Preserve the last known mode if the platform rejects restoration too.
      }
      return false;
    } finally {
      changingMode = false;
    }
  }, [setDisplayMode]);
}
