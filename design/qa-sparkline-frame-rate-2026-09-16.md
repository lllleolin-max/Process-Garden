# Sparkline frame pacing

Requirement: global 30/60/120 Hz motion setting. Canvas already used the shared frame gate, but Sparkline wrote SVG points at every delivered requestAnimationFrame regardless of this setting.

Sparkline now gates intermediate SVG writes with decideAnimationFrame and reads the current setting without restarting its 420 ms transition. The final target is always painted, then the loop terminates. Existing pause, reduced-motion, hidden-document and display-mode behavior is unchanged. This does not increase the refresh rate of the physical display or guarantee whole-app FPS; skipped vsync callbacks still execute a lightweight gate.

Tests simulate 120 Hz vsync for each requested rate, bound point-write counts to the selected rate, verify the exact final coordinates and absence of remaining frame callbacks, and verify changing 30 to 120 midway does not reset the transition. Full verification: typecheck, 207 tests across 40 files, production build passed.

No visual/artwork change, native rebuild or browser FPS claim. Changes are isolated to Sparkline.tsx and its dedicated test, avoiding the parallel theme and power-metric files. Native/high-density acceptance remains open. The existing snap when sample counts differ is not addressed by this pacing patch and still needs a separate continuity review.

## Growing-history continuity follow-up

The differing-sample-count snap above is now addressed for curves with at least two finite points. Before interpolation, old and new polylines are evaluated on the union of their x coordinates. This retains both curves' bends (including an old peak absent from the new point grid) instead of distorting the initial shape by resampling only at new vertices. The exact target vertices are restored when the transition ends, so redundant interpolation vertices are not retained after settlement.

An interrupted transition starts from the currently displayed curve, including when history shrinks. Empty/single-point histories and disabled motion still settle immediately; no fictitious historical line is introduced for missing data. The existing 420 ms duration and global frame pacing remain unchanged.

Added geometry tests for bend preservation and already-aligned curves, plus a rendered SVG regression covering 3→4→2 point histories and cleanup. Full local verification: typecheck, 210 tests across 41 files, production build passed. This is automated geometry/DOM evidence; browser appearance and native performance are not newly certified by it.
