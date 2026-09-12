# Process Garden 0.1.0 — Windows x64

Build date: 2026-09-12

Implementation source: `1621914` on `feat/motion-integration` (frontend `3c41d98`). [Integration PR #2](https://github.com/lllleolin-max/Process-Garden/pull/2).

## Recommended installer

`Process-Garden_0.1.0_x64-setup.exe` — NSIS installer, SHA-256:

`67B3E13C7167878EF9F5803734B31278384A5C2B35DD94F499AF89ABBF57545A`

## Alternative installer

`Process-Garden_0.1.0_x64_en-US.msi` — MSI installer, SHA-256:

`FD2B8132854E7095142F6898BFF7FB70A824D09518470B09F175861A09A460C8`

## Portable executable

`Process-Garden.exe` — unpackaged executable. Keep `WebView2Loader.dll` beside it. SHA-256:

`ACB9A83341099D948DDE5B5DDE87E868CAE809772B11E5CC2459F0B074B73486`

`WebView2Loader.dll` SHA-256:

`8427B1FC58EC707813E5C0A51EB5D69397BB333250A7B891BE4D3B123F1E0F1C`

This build includes stable Canvas motion, generated celestial/maw artwork, interpolated resource charts, overlay transitions, keyboard focus management, reliable presentation-mode exit and pause/reduced-motion scheduling. Native system sampling now runs on the blocking worker pool while sharing its CPU baseline; process enumeration no longer occupies the UI thread.

Validation: 88 frontend tests, 5 Rust tests, TypeScript, production frontend build and Rust compile check passed. The portable executable was launched from this directory and remained alive and responsive at all five observations over 40 seconds. The checker then stopped its own process. MSI and NSIS bundles were generated successfully from the verified release build; installation on a clean Windows machine was not exercised. See [the QA record](../design/qa-2026-09-12.md).

The GNU release linker reports a multiple-manifest resource warning; it completed successfully and the resulting executable passed the responsiveness smoke. Windows WebView2 is required. New ambient artwork and the concurrent power-metrics feature are separate follow-up work and are excluded from these frozen binaries. Binary artifacts are kept locally, outside Git source history.
