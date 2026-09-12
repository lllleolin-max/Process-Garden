# Process Garden — local power preview

Built on 2026-09-12 from source commit `3ad1d3b` on `feat/power-metrics`.

Open [Process-Garden-Power.exe](Process-Garden-Power.exe), keeping `WebView2Loader.dll` beside it. This optimized Windows x64 portable preview is built in the independent power worktree. The executable and DLL are local build artifacts and are not committed to Git.

- Executable SHA-256: `9A537E442346BC87142561ECD88A30E8440E790DB49229AC58518BF039200498`
- WebView2Loader.dll SHA-256: `8427B1FC58EC707813E5C0A51EB5D69397BB333250A7B891BE4D3B123F1E0F1C`

The sidebar and wallpaper HUD show real watts from battery discharge or a supported Intel package energy counter. On this machine, the native packaged app displayed changing Intel package readings of approximately 4.6–4.8 W, with Demo data off. Pause retained the value and showed the paused label; resume restored live sampling. The application remained responsive after launch. Package power is not whole-computer or wall-socket consumption; see [measurement details](../docs/power.md).

Validation: 94 frontend tests, 13 Rust tests, `cargo check`, optimized Tauri build, both browser themes/languages, wallpaper HUD, and sidebar layouts at 1040×720 and 1440×960. The Windows GNU linker emitted `.rsrc merge failure: multiple non-default manifests` as a warning; the build exited successfully and the resulting executable passed the native GUI smoke check above.
