import { setFullscreen } from "../platform/display";
import { attachWallpaper, detachWallpaper } from "../platform/wallpaper";
import { useAppStore, type DisplayMode } from "../stores/appStore";

let revision = 0;
let activeTransition: Promise<boolean> | null = null;
let requestedMode: DisplayMode | null = null;
let wallpaperMayBeAttached = false;

/** One queue for buttons, Escape and native window restoration. Latest intent wins. */
export function requestDisplayMode(mode: DisplayMode): Promise<boolean> {
  const requestRevision = ++revision;
  const previousTransition = activeTransition;
  requestedMode = mode;
  const superseded = () => requestRevision !== revision;
  const transition = (async () => {
    if (previousTransition) await previousTransition;
    if (superseded()) return true;
    const previousMode = useAppStore.getState().displayMode;
    // A queued exit must still undo platform work from an obsolete enter request.
    if (!previousTransition && previousMode === mode) return true;
    try {
      if (previousMode === "wallpaper" || wallpaperMayBeAttached) {
        await detachWallpaper();
        wallpaperMayBeAttached = false;
        if (superseded()) return true;
      }
      await setFullscreen(mode !== "windowed");
      if (superseded()) return true;
      if (mode === "wallpaper") {
        wallpaperMayBeAttached = true;
        wallpaperMayBeAttached = await attachWallpaper();
        if (superseded()) return true;
      }
      useAppStore.getState().setDisplayMode(mode);
      return true;
    } catch {
      if (superseded()) return true;
      try {
        await setFullscreen(previousMode !== "windowed");
        if (superseded()) return true;
        if (previousMode === "wallpaper") {
          wallpaperMayBeAttached = true;
          wallpaperMayBeAttached = await attachWallpaper();
        }
      } catch {
        // Preserve the last known mode if the platform rejects restoration too.
      }
      return superseded();
    }
  })();
  activeTransition = transition;
  void transition.then(() => {
    if (activeTransition === transition) {
      activeTransition = null;
      requestedMode = null;
    }
  });
  return transition;
}

/** Browser Escape can end fullscreen without delivering a keydown to the app. */
export function syncBrowserFullscreenExit(): Promise<boolean> {
  if ("__TAURI_INTERNALS__" in window || document.fullscreenElement || requestedMode === "windowed") return Promise.resolve(true);
  const currentMode = useAppStore.getState().displayMode;
  if (currentMode === "fullscreen" || (currentMode === "windowed" && requestedMode === "fullscreen")) return requestDisplayMode("windowed");
  return Promise.resolve(true);
}

export function useDisplayMode() {
  return requestDisplayMode;
}
