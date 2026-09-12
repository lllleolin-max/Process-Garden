# Process Garden 0.1.0 — Windows x64

Build date: 2026-09-12

Implementation source: `7ee8209` on `feat/motion-integration`. Includes frozen ambient/embryo motion `a4608e4`, native power `4c4b166`, and the final static-theme rendering fix. [Integration PR #2](https://github.com/lllleolin-max/Process-Garden/pull/2).

## Recommended installer

`Process-Garden_0.1.0_x64-setup.exe` — NSIS installer, SHA-256:

`E149D8AE521403CEFF21FA993294F1B150394475872A446E60EB4DE518E8856E`

## Alternative installer

`Process-Garden_0.1.0_x64_en-US.msi` — MSI installer, SHA-256:

`CAB116B7289AC5507EC990BD61C63E4DC62227C98FF09D861E7393EF00080A33`

## Portable executable

`Process-Garden.exe` — unpackaged executable. Keep `WebView2Loader.dll` beside it. SHA-256:

`DDD10EA1820571C4E8A1B7191BE2FF21788982DD1B8C468C6A9170DE4CBF8BA7`

`WebView2Loader.dll` SHA-256:

`8427B1FC58EC707813E5C0A51EB5D69397BB333250A7B891BE4D3B123F1E0F1C`

This unified build includes theme-aware ambient life, continuous Agent child-process birth/growth/swallowing, celestial phase continuity, and theme crossfades after the complete scene asset bundle is ready. Paused or reduced-motion search, selection and resize release stale theme snapshots so the current static result stays visible. Existing interpolated resource charts, overlay transitions, keyboard focus management and reliable presentation-mode exit are retained.

Scene assets share cached preparation; the central maw's black matte is converted to alpha without changing the original artwork. Agent growth describes child-process age, not actual task completion. First-time asset preparation can still cause a noticeable frame; stable 120 FPS is not established.

The sidebar and wallpaper HUD show supported battery-discharge or Intel package power, with explicit source, demo, unavailable and stale states. Package power is not whole-computer or wall-socket consumption. Native sampling stays on a blocking worker with shared collector state and CPU baseline. See [measurement details](../docs/power.md).

Validation: **156 frontend tests across 28 files**, TypeScript, production frontend build, **13 Rust tests** and cargo check passed for the unified source. The final portable executable was launched from this directory and remained alive and responsive at 8/16/24/32/40 seconds; the checker then stopped only its own process. MSI and NSIS bundles were generated successfully. See [the unified QA record](../design/qa-unified-2026-09-12.md).

The GNU release linker reports a multiple-manifest resource warning; the build completed successfully. Clean-machine installation and Windows WorkerW desktop attachment were not exercised in this integration pass. Browser checks use demo data; hardware power evidence is recorded separately in the power feature's QA. Windows WebView2 is required. Binary artifacts stay locally outside Git source history. The root `一键启动 Process Garden.bat` launches this portable build.
