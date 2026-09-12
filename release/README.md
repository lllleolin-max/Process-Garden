# Process Garden 0.1.0 — Windows x64

Build date: 2026-09-12

Implementation source: `9e87679` on `feat/motion-integration` (maw transparency `1b2db8b`, native sampling `1621914`). [Integration PR #2](https://github.com/lllleolin-max/Process-Garden/pull/2).

## Recommended installer

`Process-Garden_0.1.0_x64-setup.exe` — NSIS installer, SHA-256:

`0055D28E6AD69972B33E2CA3DB403F97696F3A1B463EC14A2B1E350C7D879696`

## Alternative installer

`Process-Garden_0.1.0_x64_en-US.msi` — MSI installer, SHA-256:

`ECAD3BE98655CA1256C4C7992D651A662F239966A92ABA1F2C33B77481221BDD`

## Portable executable

`Process-Garden.exe` — unpackaged executable. Keep `WebView2Loader.dll` beside it. SHA-256:

`5D06C7824C6AD7A563FC5830EFAE6A95CF7FFE6983053927EA2D91296C727E6F`

`WebView2Loader.dll` SHA-256:

`8427B1FC58EC707813E5C0A51EB5D69397BB333250A7B891BE4D3B123F1E0F1C`

This build includes stable Canvas motion, generated celestial/maw artwork, interpolated resource charts, overlay transitions, keyboard focus management, reliable presentation-mode exit and pause/reduced-motion scheduling. Native system sampling now runs on the blocking worker pool while sharing its CPU baseline; process enumeration no longer occupies the UI thread.

The central maw's black rectangle is removed by converting its matte to alpha once at load and caching the result. The original PNG is preserved. This patch was backported separately from subsequent ambient and embryo features.

Validation: 90 frontend tests, TypeScript and the production frontend build passed after the backport. The unchanged Rust implementation previously passed 5 tests and cargo check. The final rebuilt portable executable was launched from this directory and remained alive and responsive at all five observations over 40 seconds. The checker then stopped its own process. MSI and NSIS bundles were generated successfully; installation on a clean Windows machine was not exercised. See [the QA record](../design/qa-2026-09-12.md).

The GNU release linker reports a multiple-manifest resource warning; it completed successfully and the resulting executable passed the responsiveness smoke. Windows WebView2 is required. New ambient artwork and the concurrent power-metrics feature are separate follow-up work and are excluded from these frozen binaries. Binary artifacts are kept locally, outside Git source history.
