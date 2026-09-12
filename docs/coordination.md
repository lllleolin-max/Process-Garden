# Coordination — 2026-09-12

The project was an unversioned shared directory when this round started. The initial Git commit captures the existing application and both tasks' in-progress improvements; it is not a pristine pre-change baseline.

## Ownership

- Integration task `01a09449-4661-7ca1-8ffa-0b8c94ddb736`: React shell, Canvas integration, interaction and motion QA, Git/GitHub, final builds and releases.
- Asset/lifecycle task `019fe686-f462-7e11-8d6e-6d851752b6cc`: generated celestial atlas and Eldritch maw v3, frame pacing, scene clock, population stability, swallow timing. Implementation writing stopped after handoff. Details are in `coordination-peer.md` and `../design/motion-assets-2026-09-12.md`.
- The integration task's three agents completed disjoint Canvas, overlay, and data-feed assignments. Only the integration task operates Git and generates release artifacts.

## Working agreement

1. One task owns a working directory. After this round, create a separate Git worktree and branch for each active task.
2. Agree on ownership before changing a shared contract or generated asset. Do not replace another task's uncommitted work.
3. Commit bounded changes and open a PR with the behavior change, tests and remaining limitations. No force pushes or automatic main-branch merges.
4. Run `npm run verify` before integration. Native changes additionally require the Rust checks documented in CONTRIBUTING.md.
5. Installers, portable binaries, dependency trees, local logs and environment files stay out of source commits. Publish binaries as release assets only after final verification.
6. Retain generated asset provenance. The rejected `eldritch-core-maw-v2.png` intermediate is excluded from Git and is not a deliverable.

## Current handoff checklist

- Preserve `SceneClock`, early-vsync correction and population ranking hysteresis.
- Keep alpha in the celestial atlas and consume the generated maw v3.
- Aggregate swallowing across all visual nodes so recoil continues after the swallowed organism disappears.
- Verify steady pause/resume, reduced motion, resize, both themes and keyboard navigation.

## Unified release handoff

The integration working directory remains owned by task `01a09449-4661-7ca1-8ffa-0b8c94ddb736`. Asset/lifecycle task `019fe686-f462-7e11-8d6e-6d851752b6cc` works in `Process Garden.worktrees/asset-motion`; power task `01a09466-1fa1-79d1-bfce-513d14ed22fe` works in `Process Garden.worktrees/power-metrics`. Their feature branches were frozen before this integration and their histories are preserved by merge commits.

- `1283ff8` integrates the ambient and embryo branch through `a4608e4` (PRs #4 and #6). The new scene-asset cache retains the earlier maw alpha fix; the existing transparency QA record remains intact.
- `3c2959c` integrates native power through `4c4b166` (PR #5). Both locale catalogs retain scene-loading, Agent-growth and power source/state strings.
- `7ee8209` fixes stale theme snapshots after paused/reduced-motion search, selection and resize. Seven targeted regression tests were added.
- The combined source passed 156 frontend tests, TypeScript, production build, 13 Rust tests and cargo check. Portable, MSI and NSIS builds were regenerated; the final portable app passed five native responsiveness observations over 40 seconds. [QA](../design/qa-unified-2026-09-12.md) and [artifact hashes](../release/README.md) identify the exact implementation source.

All combined changes are delivered through [PR #2](https://github.com/lllleolin-max/Process-Garden/pull/2). Main is not automatically merged. Feature PRs can be marked integrated after their commits are confirmed reachable from this branch; retain their source branches and review evidence. Future changes start from the current integration head in separate worktrees. The power release cache was temporarily reserved by integration for this build and is released once the completed artifacts are copied.
