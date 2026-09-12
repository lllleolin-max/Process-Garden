# Scene phase and theme continuity QA — 2026-09-12

Status: ready for integrated frontend review, not a native release approval.

Branch: `feat/agent-embryo-motion`, PR #6, stacked on PR #4 (`15dd8a9`). The integration task retains ownership of PR #2, the original checkout and installer builds. The power task retains PR #5. No shared-checkout edits or new native builds were made here.

## Reproduced defects and changes

- Four of the first five new Canvas-path tests failed before the fix. Multiplying visual time by zero on reduced motion rewound generated creatures, the core and celestial rotations. A paused selection redraw also advanced the sun from the current wall clock. A fresh population array could incorrectly settle a partial birth even when geometry had not changed.
- Generated artwork, background fauna, focus and lifecycle deformation now use the same persistent scene time. Pause/reduced-motion toggles hold the current pose, including an open mouth or partly dissolved actor. Actual new reduced-motion samples still settle immediately, with no idle animation loop.
- Exiting partly born processes keep their actual opacity instead of flashing to full opacity. Returning processes continue from the current pose; the jaw damps toward an interrupted lifecycle's new target. These changes preserve the large-mouth anticipation/suction/bite/recoil design.
- `CelestialClock` holds the local-time orbit during pause and catches up on the shortest route, including midnight. A system clock jump is bounded to six degrees per second of scene time. It never changes the machine's clock.
- Cold theme switching previously produced three consecutive frames with no generated focal artwork. Prepared assets are now cached as a complete family, including the backdrop. The old scene remains active until the new family is ready; stale requests cannot overwrite the user's latest choice. Failed loads retain the old scene and expose a localized retry action.
- Foreground and both generated background layers blend over 500 ms on the scene clock. One temporary foreground snapshot is retained, including during rapid reversal; its backing store is released on completion or unmount. Starting a theme change while already paused/reduced switches the ready artwork without an animation loop. Pausing midway holds the current blend. A subsequent reduced-motion data sample settles that blend so stale process images cannot persist over the latest data.
- Atlas variants are registered in manifest order, not network arrival order. Decoded assets and in-flight work are shared; retry reloads only failed assets. Custom themes continue inheriting their built-in family.

No new illustrations were created. Existing ImageGen backgrounds, cores, maw, creatures, celestial bodies and agent atlases remain the art source. Runtime masking/compositing only prepares or animates that artwork. Reference direction, font choices and primary layout were preserved under the existing-project optimization and design-QA workflow.

## Automated evidence

`npm run verify` completed successfully: TypeScript, **143 tests in 27 files**, and the production Vite build.

New coverage includes generated focal phase/rotation/opacity, partial birth and interrupted swallow, actual versus selection-only static changes, solar pause/midnight/catch-up, ambient partial fades, atomic asset loading, deterministic variant order, load failure/retry, cached/custom-family reuse, rapid theme reversal, background/foreground blend synchronization and zero idle scheduling while frozen. The existing embryo, sampling, keyboard and frame-pacing suites remain passing.

## Actual browser evidence

The real Vite page at port 1422 was inspected using reversible same-origin demo fixtures and draw-call observation. No real process was terminated. The fixtures and prototype observers were restored afterward.

| Check | Observed result |
| --- | --- |
| Cold Garden → Eldritch | Confirmed zero Eldritch image requests before the switch. Final-code run: 84 observed render frames, 37 retained Garden frames, 31 blended frames, **zero frames without generated artwork**. |
| Repeated reversal | Six alternating theme requests: 78 observed frames, zero empty generated frames; transition finished. |
| Reduced motion | The recorded generated focal draw geometry, rotation and opacity were exactly equal before and after freezing. Zero idle frames over 500 ms. |
| Mid-theme pause | Foreground snapshot alpha and both background opacities stayed identical. Zero idle frames; resumed blend finished normally. |
| Wallpaper clock jump | With a temporary three-hour test offset, selection while paused preserved the celestial draw exactly. First resumed frame also matched exactly; the next frame moved about 1.41 px rather than teleporting. No operating-system clock change. |
| Reduced theme switch | Switched to the ready Eldritch scene, then zero idle frames over 500 ms. |
| Reduced sample during a blend | On a fresh final-code navigation, the partial blend held on freezing, then a new empty-process sample removed the stale snapshot. Only the generated core remained; zero idle frames over 400 ms. |
| Layout | Real compact preview at approximately 411×791 remained readable. DOM checks at 1280×720 reported no horizontal overflow. The in-app browser's emulated wide screenshot capture was unreliable, so it is not claimed as wide visual evidence. |
| Logs | No new warnings/errors during fresh-page checks (bulk checks from 08:36:15 UTC; final reduced-sample check from 08:41:41 UTC). Earlier edit-time Vite/React HMR messages predated these navigations. |

Inline screenshots were inspected; no local screenshot files are claimed.

## Remaining limits / next performance work

- Cold preparation still produced a maximum observed frame gap of **103.9 ms** in this development-browser run (another run: 107.9 ms). Atomic readiness removes empty frames, but does not remove main-thread first-decode work. Off-main-thread or incrementally scheduled sprite preparation and native profiling remain performance follow-ups. This is **not** a stable 120 FPS certification.
- One temporary snapshot costs roughly `canvas.width × canvas.height × 4` bytes before browser overhead. No per-sample snapshot, raw-source-image retention or per-frame pixel readback was added. Background layers only update opacity when its value changes.
- An initial application load has no previous scene to preserve; it still uses the existing temporary fallback rendering while preparing artwork. Native executable icon extraction, WorkerW attachment and live CPU/memory need the integration owner's native pass.
- Custom image/font package imports and genuine Agent task-progress telemetry are not implemented by this pass. Embryo stage remains a clearly labelled child-process-age proxy. Broader master-prompt conformance and pixel-perfect reference fidelity are not declared complete.

## Integration handoff

Merge/reconcile the ambient branch before this successor. Preserve the power branch's `formatWatts` addition when combining formatter changes. Maw transparency from `eb616ae` was already backported by the integration owner as `1b2db8b`; the present asset-loader refactor preserves that conversion in `src/animation/sceneAssets.ts`, so do not restore the older Canvas-local loading block during conflict resolution. Keep current release hashes unchanged until a new integrated/native verification is actually completed.
