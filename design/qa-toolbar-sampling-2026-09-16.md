# Toolbar sampling isolation

Scope: remove telemetry-driven React work from the toolbar without changing its appearance or motion. No artwork changes.

## Evidence

- Added a React Profiler regression that sends 20 separate snapshot/history/event updates. Before the implementation change it failed with 21 commits (including an additional hook-related commit). After narrowing the subscription it records zero commits for the same updates.
- Search and pause state changes still render, and the Resume button updates the store.
- With the theme menu open, a snapshot update causes no toolbar commit, preserves the same dialog element, and preserves focus.
- `npm run verify`: typecheck, 191 tests across 35 files, and production build passed.

The toolbar now uses the same shallow shell-state selection pattern as App, excluding snapshot, history and events. It still observes control/preferences changes. This removes unnecessary React work; it is not evidence of a particular frame-rate or native CPU reduction. Browser visual appearance was not changed or re-certified by this unit-level check. Native/high-refresh acceptance remains open.

## Coordination

Changes are isolated to TopBar.tsx, its new dedicated performance regression, and this record on perf/scene-asset-preparation. The integration worktree's theme/artwork edits and shared native build outputs were not modified. Integrate through draft PR #7; do not automatically merge or publish a release.
