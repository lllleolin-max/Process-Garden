# Off-thread artwork preparation — 2026-09-16

Verdict: READY for isolated frontend review; native WebView/installer acceptance remains open.

Baseline: unified integration `ee5dae4`. Work is isolated on `perf/scene-asset-preparation` in the asset-motion worktree. The integration checkout, release files and shared Cargo target are unchanged. Scope was registered in PR #2 before editing because the cross-task messaging tool was unavailable.

## Requirement and implementation

The user's continuous, natural 30/60/120 Hz motion must not be interrupted by preparing the generated artwork. Earlier QA recorded a 103.9 ms cold-theme frame gap, despite eliminating blank frames. No new art, layout, fonts or style substitutions are introduced here; existing-project optimization and design QA keep the reference direction intact.

- One shared, on-demand module Worker fetches only same-origin `/assets/generated/` images, decodes their Blobs, crops atlases, removes black mattes and applies core masks. Source and prepared bitmap ownership are explicitly released.
- The Worker and fallback share the raster algorithm. No per-frame or per-sample pixel work is introduced; the existing complete-family cache, deterministic variants and ready-to-ready theme transitions remain unchanged.
- Main-thread `createImageBitmap(img)` was rejected after measurement showed approximately 12 ms of synchronous work per image. Returning a Promise did not make that path non-blocking. Blob decoding now happens entirely in the Worker.
- Prepared output transfers into a `bitmaprenderer` canvas when available, with a 2D retention fallback. Unsupported APIs, startup failures, worker errors and a 20-second stalled-job timeout settle all affected jobs onto the compatibility path. Failed workers are not repeatedly restarted in that page session.
- A Worker is terminated after one idle second. Actual-browser QA discovered that GPU-backed core pixels disappeared after termination; software-backed OffscreenCanvas preparation fixes that lifetime issue. A regression test requires the software backing, and runtime validation checks the pixels after termination.
- Tauri CSP adds only `'self'` to `connect-src`, permitting fetch of already-bundled same-origin images. No remote origin, wildcard, unsafe script permission or IPC privilege is added. The worker independently rejects external origins and paths outside generated artwork.

## Verification

`npm run verify` passed: TypeScript, **171 tests in 31 files**, production build. Vite emitted a separate approximately **1.70 kB worker**. New coverage includes crop ordering, transparency, radial masking, out-of-order messages, shared worker lifetime, timeout/error fallback, stale replies, output cleanup, same-origin/path checks and failed fetch/transfer cleanup.

### Controlled browser comparison

Same local browser, seven preloaded source PNGs: Garden creature atlases v1–v4, Eldritch core and maw, shared celestial atlas. Pause the scene, alternate direct shared-raster preparation and Worker preparation for three passes, observe requestAnimationFrame gaps and main-thread getImageData calls, then restore the store and prototype observers. This isolates preparation responsiveness; it is not a full-application or native FPS certification.

| Pass | Main-thread duration / largest RAF gap | Worker duration / largest RAF gap |
| --- | --- | --- |
| 1 | 145.9 / 145.8 ms | 150.1 / 7.1 ms |
| 2, reversed order | 73.1 / 69.4 ms | 138.1 / 7.1 ms |
| 3 | 62.9 / 62.6 ms | 143.4 / 7.0 ms |

Main-thread pixel readbacks: **17 → 0**. RAF callbacks during preparation: **1 → 19–21**. Total warm completion time is higher in the Worker path; the improvement is responsiveness, not a claim that every load finishes faster.

Compared **44,030,448 RGBA channels**. Final software-backed output differed in 97,414 channels, with maximum difference **1/255** after switching from GPU to software preparation; no artwork files were replaced. An earlier GPU-backed path compared exactly but was rejected because its core vanished after Worker termination.

### Real scenes and production CSP

- Actual full demo population, first uncached *prepared* Garden family after reload: **108 rendered frames, zero frames without generated artwork, zero main-thread readbacks**, maximum Canvas render gap 39.9 ms, p95 29.3 ms. Encoded image caching was not disabled; this is not a cold-network benchmark. The application is not yet proven to sustain 120 FPS under all loads.
- Screenshots of both themes inspected at the local compact preview size, approximately 685×1272. Generated cores, process/Agent artwork, embryo icons, labels and backgrounds remained visible. The reference art was not changed. Wide-layout/native visual conformance is not re-certified by this pass.
- Served the production `dist` with the exact Tauri CSP header on localhost:1423. Switched Garden → Eldritch: ready state, no asset error, **16 Worker jobs**, **0 main-thread pixel readbacks**, **1 idle Worker termination**. The core's 64×64 alpha checksum remained **652653** after release. No CSP relaxation was injected in the browser.
- A temporary preview-server bug initially interrupted image responses; the server was corrected and the failed run excluded. This was a test harness failure, not accepted product evidence.
- New runtime warning/error logs were absent in successful browser checks. Test observers and temporary preview servers are removed after QA. Inline screenshots were inspected; no screenshot file artifact is claimed.

## Remaining gates

1. Integrated native WebView2 cold-start/theme-switch, WorkerW wallpaper and live CPU/memory checks; verify same-origin fetch under the packaged Tauri protocol before making installers current.
2. Longer, high-density 30/60/120-target profiling. Removing preparation stalls does not prove every frame of the full renderer meets a high-refresh budget.
3. Broader original requirements remain open, including true Agent task-progress integration and complete custom art/font theme-package support. This pass does not redefine the overall goal as completed.

Implementation references: [Vite worker bundling](https://vite.dev/guide/features#web-workers), [OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas), [bitmap transfer ownership](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas/transferToImageBitmap).
