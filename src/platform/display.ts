export async function setFullscreen(enable: boolean) {
  if ("__TAURI_INTERNALS__" in window) {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().setFullscreen(enable);
    return;
  }
  if (enable && !document.fullscreenElement) await document.documentElement.requestFullscreen();
  if (!enable && document.fullscreenElement) await document.exitFullscreen();
}
