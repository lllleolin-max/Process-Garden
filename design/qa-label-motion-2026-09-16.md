# Label continuity — 2026-09-16

Scope: user requirement for gradual state changes and natural frontend motion. Source baseline `3db3090`; independent performance branch. This is a focused motion change, not a declaration that the complete application is ready.

## Change

- Previously, label collision placement selected a fresh candidate every paint and drew directly at that coordinate. A side becoming clear could make an already clear label jump back to the default side.
- Prefer the candidate nearest the previous target when collision scores tie. A blocked existing side still yields to a better placement. Focused labels continue reserving space first and drawing last.
- Existing visible labels interpolate position on the scene clock with a 95 ms exponential response. Actor identities include PID and start time. No additional animation loop, timer or per-frame React update is introduced. Disappearing labels are pruned from the motion map every paint.
- First appearance starts at its valid placement. Viewport changes and static data/focus changes settle immediately. Pause alone preserves the current intermediate position with zero elapsed time; reduced motion settles without animation. Text width/height use current metrics rather than scaling/stretching glyphs.
- No generated artwork, fonts, icon assets, process lifecycle or density limits were changed. Labels can still overlap temporarily while moving or in forced-all-label dense layouts; this change is not a complete dense-label readability solution or a new fade-out lifecycle.

## Verification

- Final `npm run verify` passed: **178 tests / 32 files**, TypeScript checking and production build. `git diff --check` passed.

- Four new regression tests: retain an unobstructed side but yield when blocked; move without teleporting and freeze at zero delta; equal convergence at 30/60/120 elapsed-time steps; static settling, recycled PID isolation and removal of stale entries. Existing exhaustive label placement tests still cover calls without a preferred position.
- Clean-reload browser test at localhost:1422, 740×422 scene Canvas, regular demo actors with labels enabled: selection reflow produced **126 interpolated label updates out of 377 calls**, none forced instant. Pause produced **13 calls with delta 0 and no forced settling**, including six still at intermediate positions. Changing selection while paused produced **13 instant updates at delta 0**, all exactly at targets. Reduced motion likewise produced **13 exact static updates**, no interpolation.
- An earlier hot-update run showed inconsistent pause timing against the asynchronously read store. It was not accepted as evidence. Removed instrumentation, reloaded cleanly and repeated; numbers above are from the clean run.
- Screenshot inspected: generated actors/core, original application icons, highlighted selected label and inspector remain visible. Browser warning/error logs empty. This was not a full two-reference comparison, native wallpaper test or assistive-technology certification.
- Temporary prototype instrumentation/store changes are restored and the preview closed after QA.

## Coordination and open gates

### Viewport-bounds follow-up

A widening-label regression exposed clipping during interpolation: changing width from 105 to 158 at the right edge produced a visible right edge of 774.78 in a 740px Canvas (required inset edge: 730). The target itself was valid; the interpolated position with the new width was not. Constrain the **visible** label box to the same 10px horizontal / 70px vertical margins as the placement solver. Text remains unscaled. On views too small to contain a label, retain finite minimum-inset coordinates rather than inverted bounds; full containment is geometrically impossible there.

Red/green widening regression and a viewport-shrink/undersized-view regression pass. Final verification after this follow-up: **180 tests / 32 files**, typecheck and production build; diff check passes. The prior browser observations remain the evidence for motion/pause behavior; this bounds-only follow-up was verified by automated geometry tests, not a new native or full visual certification.

The implementation adds `labelMotion.ts` and changes only the label-placement path in `GardenCanvas.tsx`, plus a backward-compatible optional placement preference in `sceneLayout.ts`. The shared theme task also edits `GardenCanvas.tsx`; integrate these small hunks deliberately after its changes are committed, preserving its custom theme/artwork work. No shared worktree or native installer changes.

High-density 120 FPS remains unproven. Broader application goals, native acceptance, sustained profiling, true Agent task metadata and full reference fidelity remain open. This change improves position continuity, not measured frame rate.
