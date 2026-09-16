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

### Rejected badge-cache experiment

Follow-up on the same isolated baseline: implement a 96-actor / 16 MiB two-layer LRU cache with explicit release on replacement, eviction and scene cleanup. Quantize only raster radius to 1/8 CSS pixel; keep actor position and icon geometry continuous. Use alternating original/cached three-second samples, 300 ms settling, the same 44-process Eldritch fixture at target 120.

- **Full badge layers:** original 55.50 / 54.42 FPS versus cached 57.77 / 59.75 FPS; gap p95 26.1 / 25.1 ms versus 23.8 / 23.3 ms. Small benefit, but repeated raster interpolation changes sharp outline coverage. A 16-case real-browser pixel comparison (DPR 1/2, both shapes, selected/unselected, alpha .2/.91, fractional positions) found whole-128px-image channel RMS 0.46–1.93 and individual channel differences up to 55/255. Whole-image RMS dilutes localized edge differences; this is **not** evidence of visual equivalence. Reject this path.
- **Shadow-only revision:** rasterize the shadow from an off-tile source, then draw fill and outline live at the exact radius. This avoids quantizing the sharp geometry but adds drawing operations. Original 56.54 / 58.13 FPS versus cached 55.34 / 58.51 FPS; gap p95 23.9 / 24.5 ms versus 25.2 / 23.7 ms. No stable benefit. Reject this path too; do not cite the earlier version's gain for this implementation.
- The prototype passed 179 tests / 32 files, typechecking and production build, including cache reuse, radius/style/DPR invalidation, LRU eviction, byte budget and missing-context fallback. Passing tests did not satisfy the performance/appearance acceptance gates. Experimental cache code and its five prototype tests were removed, and the renderer was restored to its original source. These 179 tests describe the **discarded prototype**, not the delivered branch.
- Browser overrides/store state were restored and the experimental preview was closed. No generated assets or shared-theme files were changed. Preserve this result to avoid repeating the same unhelpful cache design; prioritize appropriately sized sprite drawing and investigate raster/compositor costs next.
- Restored source verified with `npm run verify`: 174 tests / 31 files, typecheck and production build passed. The output bundle was rebuilt from the restored renderer, not left on the discarded prototype.

### Remaining acceptance work

### Sprite-size isolation and ordinary-density comparison

On the restored renderer, use a temporary browser-only `drawImage` wrapper restricted to generated Canvas sources and five-argument draws on the scene Canvas. Account for the current transform scale and select halved dimensions only while each axis retains at least **2× its displayed physical-pixel size**. Retain original images, use high-quality filtering for derived layers, and restore the wrapper after measurement. This changes no source asset files.

Observed source/eligible-level pairs: 627² → 313² / 156² / 78², and 1254² → 627² / 313². In four alternating three-second samples (400 ms settling) of the same 44-process Eldritch stress fixture at target 120:

| Path | FPS | Gap p95 / max (ms) |
| --- | ---: | ---: |
| Original | 55.54 | 27.0 / 32.9 |
| Derived levels | 56.49 | 24.7 / 30.9 |
| Original | 57.09 | 26.0 / 33.5 |
| Derived levels | 54.79 | 27.1 / 33.8 |

The 17 derived tiles used 5,707,800 bytes of RGBA backing storage. **Reject this optimization:** no repeatable improvement, added memory, and no reason to accept a new resampling/fidelity risk. The temporary layers were released (width/height zero), prototype methods restored, and preview stopped. No runtime code was changed in this experiment.

For comparison, restore ordinary demo sampling (20 source processes), ecological density .82 (10 main organisms), labels-on-demand, no selection, particles enabled. Same 740×422 Canvas and development browser. Two-second samples after 1.2 s theme settling / 200 ms target settling, with original source drawing throughout:

| Theme | Target | Observed FPS | Gap p95 / max (ms) |
| --- | ---: | ---: | ---: |
| Garden | 30 | 30.10 | 41.2 / 43.4 |
| Garden | 60 | 60.13 | 21.2 / 24.2 |
| Garden | 120 | 117.91 | 14.0 / 21.9 |
| Eldritch | 30 | 29.90 | 39.3 / 41.2 |
| Eldritch | 60 | 60.29 | 25.6 / 31.5 |
| Eldritch | 120 | 102.47 | 16.6 / 23.2 |

These short comparisons show that ordinary-density behavior differs materially from forced-label stress conditions; the limiter is not universally stuck below 60. They do not prove stable cadence, sustained 120 FPS, native performance, or that density/labels alone explain the difference. Both population and label configuration changed, so isolate those costs separately before drawing a causal conclusion. Sprite downsampling and per-badge caches have now both failed acceptance; investigate cord/label compositing without removing visual detail.

### Open gates

1. Per-badge caching has been tested and rejected above. Any alternative reuse/batching of glows must preserve breath, color, selection, opacity, geometry, high-DPI sharpness and bounded memory, and demonstrate a repeatable benefit. Simply deleting effects is not an aligned fix.
2. Inspect generated-sprite drawing costs and backing sizes; do not lower art resolution indiscriminately, especially in fullscreen/wallpaper modes.
3. Repeat on production builds, longer samples, multiple viewport sizes and native WebView2/WorkerW with live sampling. Current short desktop-browser results do not certify 30/60/120 across the app.
4. `GardenCanvas.tsx` is concurrently modified by the theme task in the shared worktree. Coordinate any renderer edits and preserve that task's custom-art loading changes. This diagnostic commit edits documentation only.
