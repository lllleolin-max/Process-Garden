function isTauriRuntime() {
  return "__TAURI_INTERNALS__" in window;
}

/**
 * Windows-only WorkerW integration stays behind this adapter so the visual
 * shell remains usable in browsers and on unsupported platforms.
 */
export async function attachWallpaper(): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  try {
    const { attach } = await import("tauri-plugin-wallpaper");
    await attach("main");
    return true;
  } catch (error) {
    console.warn("Wallpaper attachment is unavailable; using ambient preview mode.", error);
    return false;
  }
}

export async function detachWallpaper(): Promise<void> {
  if (!isTauriRuntime()) return;
  try {
    const { detach } = await import("tauri-plugin-wallpaper");
    await detach("main");
  } catch (error) {
    console.warn("Wallpaper detachment failed.", error);
  }
}
