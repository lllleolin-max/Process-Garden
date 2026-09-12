# Display modes

## Windowed

The complete working surface: system overview rail, process ecology, inspector, search and 60-second event timeline. This is the default authoring and investigation mode.

## Fullscreen

The same ecology expands edge-to-edge while chrome and analysis panels recede. A small floating top bar preserves pause, theme, language and exit controls. `Esc` returns to the window.

## Wallpaper

On Windows, `tauri-plugin-wallpaper` attaches the fullscreen WebView to the WorkerW layer behind desktop icons. The UI becomes a quiet center-core ambient monitor with a minimal HUD. Canvas is capped near 20 FPS, node and particle budgets are reduced, and sampling is no faster than 2 seconds.

The tray menu (`打开 / Open Process Garden`, `退出 / Quit`) is the authoritative recovery path. Plugin errors never hide or terminate the app: the same composition remains available as a fullscreen ambient preview.
