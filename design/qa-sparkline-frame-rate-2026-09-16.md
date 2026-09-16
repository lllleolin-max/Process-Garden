# Sparkline frame pacing

Requirement: global 30/60/120 Hz motion setting. Canvas already used the shared frame gate, but Sparkline wrote SVG points at every delivered requestAnimationFrame regardless of this setting.

Sparkline now gates intermediate SVG writes with decideAnimationFrame and reads the current setting without restarting its 420 ms transition. The final target is always painted, then the loop terminates. Existing pause, reduced-motion, hidden-document and display-mode behavior is unchanged. This does not increase the refresh rate of the physical display or guarantee whole-app FPS; skipped vsync callbacks still execute a lightweight gate.

Tests simulate 120 Hz vsync for each requested rate, bound point-write counts to the selected rate, verify the exact final coordinates and absence of remaining frame callbacks, and verify changing 30 to 120 midway does not reset the transition. Full verification: typecheck, 207 tests across 40 files, production build passed.

No visual/artwork change, native rebuild or browser FPS claim. Changes are isolated to Sparkline.tsx and its dedicated test, avoiding the parallel theme and power-metric files. Native/high-density acceptance remains open. The existing snap when sample counts differ is not addressed by this pacing patch and still needs a separate continuity review.
