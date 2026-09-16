# PR #7 integration handoff — 2026-09-16

Base inspected: `feat/motion-integration` at ee5dae4. Remote PR head at audit:
a7b50ea; local follow-up test commit: 3619590. GitHub reported MERGEABLE while
CI run 35086302970 was still running. This does **not** include the integration
worktree's uncommitted changes. Do not merge by overwriting that worktree.

## Observed overlap (tracked, uncommitted integration changes)

| File | Preserve from PR #7 | Preserve from integration task |
| --- | --- | --- |
| `src/App.tsx` | FeedHealthNotice import and wallpaper-brand insertion | Theme wiring, process-operation UI and all other current changes |
| `src/animation/agentEmbryos.ts` | Lifecycle identity/retirement corrections | New capture/tentacle lifecycle behavior |
| `src/animation/sceneAssets.ts` | Off-thread preparation, software-backed readback, stale-job cleanup | New themed asset roles and artwork selection |
| `src/components/GardenCanvas.tsx` | PID lifetime keys, native icon replacement, label continuity | New artwork/capture rendering and theme modules |
| `src/components/GardenCanvas.theme.test.tsx` | Lifetime regression fixtures | New theme/asset fixtures |
| `src/hooks/useOverlay.ts` | Interruptible transitions, cleanup and focus ownership | New dialog consumers and integration changes |
| `src/i18n/locales/en-US.json` | processList keys | All theme/operation translations |
| `src/i18n/locales/zh-CN.json` | processList keys | All theme/operation translations |
| `src/styles/overlays.css` | Transition-based interrupted open/close behavior | Other dialog/theme styling |

This list is a point-in-time intersection, not a complete conflict prediction.
Recompute after the integration task checkpoints its changes. Untracked new
files also belong to that task and must not be deleted or silently replaced.

## Schema and correctness dependencies

- History now stores SystemObservation, not complete SystemSnapshot metadata.
  Preserve the toObservation projection in appStore alongside the new observation
  types and chart helper signatures. The current snapshot remains complete.
  appStore.ts is an additional overlap with the integration task: merge its history
  changes by hunk without replacing theme/operation state changes.

- Both Rust thread_count fields are Option<usize>; SystemSnapshot construction
  must wrap observed totals with Some. JSON omits missing counts. TS system
  threadCount is optional; never restore formatting or arithmetic without guards.
- Keep the explicit sysinfo refresh profile. Do not reintroduce new_all or
  everything to support a new field; environment/command collection is not an
  implicit requirement of normal CPU/memory sampling.
- Keep native process CPU normalization exactly once, and no 500-row cap.
- Event processKey is optional for compatibility; unknown/retired lifetimes
  must not select a current reused PID. Keep event derivation and Timeline
  selection changes together.
- Keep feedHealth with useSystemFeed, the notice, observation-state CSS and
  status hook together. Native rejection must not fall through to demo data.
- Read-only sampling identity checks do not replace native identity checks in
  the separate termination implementation.

## Acceptance after integration

Run npm verify and locked Rust library tests/compile check on the integrated
tree, not only this branch. Then verify both reference themes, PID reuse,
birth/swallow motion, fallback→native icon replacement, repeated dialog reversal,
failure/stall/recovery, full process-table coverage, and wallpaper HUD clearance.
Recheck 30/60/120 targets on actual display hardware; prior high-density 120 Hz
measurements were not a pass. Native packaged wallpaper, long-run overhead,
missing platform capabilities and Task Manager parity remain open work.

## CI discipline

CI cancels prior runs on new PR commits. Allow the current run to reach a real
terminal state before pushing queued test-only commits when practical. Do not
call an in-progress or cancelled run successful. Do not auto-merge this draft,
publish a release, or edit another task's uncommitted changes as part of this
handoff. No such action was performed during this audit.
