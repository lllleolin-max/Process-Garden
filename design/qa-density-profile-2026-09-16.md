# High-density animation profiling — 2026-09-16

Verdict: **NOT READY for a sustained 120 FPS claim.** This is a diagnostic pass against the user's smooth 30/60/120-target requirement, not a native release or full reference-fidelity certification.

## Setup

- Source: `8cbefc2`, isolated `perf/scene-asset-preparation` worktree, Vite development preview at `http://127.0.0.1:1422/`. Browser viewport 1280×720; process Canvas backing size 740×422. Browser reports `document.hidden === false` throughout the six samples.
- Temporarily expand each demo snapshot to 32 top-level processes, copying existing demo categories with unique PIDs. Four Agent parents each have three children: 44 total processes. Keep normal sampling and animation active, exact population, density 1, all labels visible, particles enabled, no selected process, reduced motion off. This is a synthetic stress fixture, not a measurement of the user's running applications.
- Intercept `CanvasRenderingContext2D.clearRect` for the process Canvas only. Timestamp each accepted paint and measure the interval between paints; a queued microtask measures elapsed main-thread work after that clear. This latter measurement includes submission work and possibly other microtasks, **not GPU completion**. It also excludes pre-clear renderer work.
- Warm each theme for two seconds and each target for 500 ms; collect each target for five seconds. Use the existing 30/60/120 limiter, not a separate rendering loop. Compute FPS from first-to-last accepted paint and p95 from sorted intervals. All art was loaded before accepted samples; no shader, source image, render detail, or process limit was altered for the baseline.
- One browser observation timed out while the original sampling Promise continued. Its live state was polled and the completed results read; the sequence was not restarted or double-counted.

## Baseline results

| Theme | Target | Paints | Observed FPS | Paint-gap p95 / max (ms) | Post-clear work p95 / max (ms) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Garden | 30 | 150 | 30.01 | 34.9 / 37.4 | 4.2 / 5.3 |
| Garden | 60 | 299 | 59.81 | 23.8 / 32.2 | 4.3 / 5.6 |
| Garden | 120 | 468 | 93.61 | 19.7 / 28.1 | 4.3 / 5.6 |
| Eldritch | 30 | 150 | 29.94 | 36.3 / 39.0 | 4.7 / 6.0 |
| Eldritch | 60 | 263 | 52.67 | 32.9 / 41.6 | 4.3 / 5.2 |
| Eldritch | 120 | 284 | 56.64 | 24.7 / 36.0 | 4.4 / 4.7 |

The controls are functioning, but the high-density renderer does not reach all requested targets in this environment. Average FPS near 60 is also not proof of even frame pacing. Development instrumentation, browser scheduling and concurrent host activity limit generalization; this is neither sustained profiling nor an installer benchmark.

## Shadow isolation (diagnostic only)

In Eldritch at target 120, temporarily intercept only this Canvas's `shadowBlur` setter; restore the original descriptor in `finally`. Four-second samples after 300 ms settling:

| Diagnostic | Observed FPS | Gap p95 (ms) |
| --- | ---: | ---: |
| Original effects | 55.61 | 22.6 |
| All blur temporarily zero | 80.43 | 20.5 |
| Original effects restored | 58.48 | 23.7 |
| Only blur value 7 zero (cords in this settled Eldritch scene) | 65.48 | 20.2 |
| Only blur value 6 zero (unselected identity badges) | 67.57 | 21.0 |

This implicates repeated blur rasterization as one cost, not the sole bottleneck. It does **not** justify removing shadows or reducing population/art detail. No blur-removal change is included in product code.

A separate 22.50-second CPU sample at the original Eldritch effects/120 target recorded 15.14 s idle, 2.13 s program, 1.37 s `drawImage`, 0.35 s `placeSceneLabel`, 0.31 s `fillText`, 0.23 s `drawUmbilicalCord`, and 0.21 s `resolveOrganismStyle` self-samples. Sampling is indicative, not exact function timing or a GPU profile. Combined with blur isolation, it prioritizes reusable raster effects/image draw costs over speculative wholesale JavaScript rewrites.

## Visual and behavior observations

- Actual stress-scene screenshot inspected: core, generated organisms, Agent offspring, application icons and tethers remain visible. Forced always-visible labels overlap heavily at 44 actors in this compact Canvas; this stress configuration is not an acceptable readability reference. Focus-priority behavior must remain intact when improving dense layouts.
- No warning/error logs in the inspected browser session.
- No new generated art was needed or substituted. No claim of complete default/Eldritch reference fidelity or accessibility compliance follows from this performance pass. Keyboard/screen-reader acceptance was not repeated.
- Temporary snapshot expansion, store preferences and prototype interception are restored after measurement; CPU profiling is disabled and the temporary preview is stopped. No native build, shared-theme worktree edits, installer changes or release promotion.

## Next work and remaining gates

1. Prototype reuse of badge/cord glow rasterization while preserving breath, color, selection, opacity, geometry, high-DPI sharpness and bounded memory. Compare visual output and frame pacing; simply deleting effects is not an aligned fix.
2. Inspect generated-sprite drawing costs and backing sizes; do not lower art resolution indiscriminately, especially in fullscreen/wallpaper modes.
3. Repeat on production builds, longer samples, multiple viewport sizes and native WebView2/WorkerW with live sampling. Current short desktop-browser results do not certify 30/60/120 across the app.
4. `GardenCanvas.tsx` is concurrently modified by the theme task in the shared worktree. Coordinate any renderer edits and preserve that task's custom-art loading changes. This diagnostic commit edits documentation only.
