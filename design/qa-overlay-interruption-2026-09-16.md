# Interrupted overlay motion — 2026-09-16

Scope: frontend motion continuity for settings, theme chooser and theme studio. Baseline `d434153`; isolated performance worktree. No layout, generated artwork, theme-package schema or native release changes.

## Reproduced problem

Exit presence already existed. The problem was fixed-start CSS keyframes: closing an opening drawer restarted from opacity 1 and translation 0; reopening restarted the entry pose.

Real-browser baseline probe: open settings, wait 65 ms, close, observe after two RAFs, then reopen and observe again. Before close: backdrop opacity **.103334**, panel opacity **.473772**, X **36.0842 px**. On close: backdrop/panel opacity **1**, X **0**. On reopening: backdrop opacity **.052260**, panel opacity **.390611**, X **41.7867 px**. These are visible pose resets, not merely an easing preference.

## Implementation

- Replace these fixed-start keyframes with opacity/transform transitions. Closing/reopening uses the browser's current interpolated pose.
- A new surface gets its initial pose painted before `data-motion-ready` is set on the second RAF. The marker persists through an interrupted exit and disappears with the DOM surface. Cancel pending entry callbacks on close/unmount. Reduced-motion entry is immediately ready.
- Preserve the existing 180 ms exit-retention ceiling, focus trap, immediate focus handoff, inert/aria-hidden state, outside dismissal and reduced-motion overrides. No permanent RAF loop or extra dependency. Remove the six obsolete entry/exit keyframe definitions; settings-tab content animation is unchanged.

## Verification

- `npm run verify`: **186 tests / 33 files**, TypeScript check and production build passed. Three new hook regressions cover initial paint/exit reversal without remount, early-close cancellation, reduced-motion readiness and zero-delay exit. Existing focus, keyboard, inert and theme-studio handoff tests pass.
- Same browser settings probe after clean reload: before close backdrop/panel alpha **.200591/.444770**, X **26.651 px**; closing **.070333/.370128**, X **27.0371 px**; reopening **.316419/.809814**, X **12.8704 px**; settled alpha 1, X 0. No restart at the fully-open or initial-offscreen pose.
- Theme chooser panel opacity .446092 → .372557 on close → .827393 on reopen, settled 1. Theme studio .137923 → 0 on close → .138302 on reopen, settled 1; neither reset to 1 at close. Short interrupted transitions may finish early as expected.
- Reduced-motion settings: opacity 1, zero active animations, closed surface removed after the zero-delay exit. Normal opening focused the Close button; Escape returned focus to the Open settings trigger. Inspected settled settings screenshot; layout, tabs and controls remain intact.
- Adding a hook during an active Vite hot update produced a historical hook-order error in the pre-edit tab. Reloaded for all acceptance measurements, then also created a **new tab**, repeated open/Escape, and confirmed empty warning/error logs. Do not treat the old hot-update log as a clean-run result.
- Restored temporary store changes, closed both test tabs and stopped the preview. No lingering style overrides or instrumentation.

## Coordination / remaining gates

`src/styles/overlays.css` is also being edited by the theme task in the shared worktree. Integrate only this entry/exit selector replacement plus `useOverlay.ts` motion-readiness effect; preserve the other task's new theme controls/styles. The shared directory was not modified. Keep PR #7 draft until integration/native gates are satisfied.

This focused check does not certify complete reference fidelity, assistive-technology compliance, full native wallpaper behavior or sustained 120 FPS. Those remain open under the full application goal.
