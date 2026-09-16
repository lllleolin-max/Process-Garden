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

- Inspector now includes ParentProcess with observedParent validation. Keep both
  new modules with the Inspector import/render insertion. This is best-effort
  current-snapshot navigation, not a historical tree or a termination target
  validator. It rechecks the selected child and both lifetimes on click, rejects
  newer reused parent PIDs, and retains focus on the Inspector. Never reuse this
  heuristic to authorize destructive native actions.
- ProcessExplorer uses isObservedMetric from processTable for both sorting and
  display. Preserve the helper import with the row changes: invalid/negative
  readings stay last and display a dash; observed zero remains a real value.
- PowerMetric consumes feedHealth.failed; useSystemFeed clears failure only when
  ingestSnapshot accepts a fresh observation. Retain these together with the
  timestamp guard, so duplicate/invalid responses cannot advertise recovery.

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

Windows GNU manifest repair adds build_support.rs, windows-app-manifest.xml and
two integration tests under src-tauri/tests. Keep these with the build.rs changes.
For a GCC spec containing the known automatic default-manifest.o insertion, the
build script writes an OUT_DIR-only endfile override for this executable, retaining
all other CRT/link entries; global compiler files are untouched. The application
manifest preserves Common Controls v6, longPathAware and asInvoker. Never drop
the common-controls dependency or raise privileges to hide a linker warning.
Run scripts/check-windows-manifest.ps1 on the rebuilt EXE: it checks resource
uniqueness and parses the actual embedded XML, not only the source manifest.
See design/qa-manifest-conflict-2026-09-16.md for original duplicate evidence.

I/O foundation adds only `pub mod process_io` to lib.rs and a standalone Rust
rate tracker; preserve the integration task's command registrations and process
operations. Windows querying now uses limited query rights, one RAII handle,
exact FILETIME identity and explicit Result failures. Cargo.toml additionally
enables Win32_System_Threading: merge this feature into, not over, the other task's
feature list. lib.rs now adds ProcessIoReader managed state and sample_process_io
to the existing command list: merge these entries without replacing the other
task's process-operation commands. Inspector now adds ProcessIo in its overview;
keep ProcessIo and useProcessIo with this command. This small insertion must be
merged without replacing the other task's Inspector/process-operation work.
The single-target reader requires a fresh session after pause/hide/reopen. See
process-io-collection.md for query cost evidence and identity limits. Rate tests
alone do not validate actual Windows I/O or physical disk throughput.

Logical-processor telemetry addition: Rust SystemSnapshot now includes
`cpu_core_percents: Vec<Option<f32>>`, serialized as optional `cpuCorePercents`.
Keep collector.rs, models.rs, types/system.ts and observation.ts together.
Values reuse the existing sysinfo CPU refresh, with no extra scan; each logical
processor has its own 0–100% scale (do not apply process CPU normalization).
An absent array means unsupported and a null element means unavailable; neither
is an observed zero. Array order is sampler order, not stable physical-core IDs.
History copies the array to avoid mutable aliases. CpuCorePanel now mounts in
Sidebar as an initially collapsed bilingual section, eight processors per page.
Closed content unmounts its charts; unavailable values remain dashes. Keep its
CSS, cpuCoreHistory and percent-scale Sparkline support together when merging.
Count changes and missing observations break history; same-count reindexing is
not detectable with the current sampler schema. Packaged-runtime and both-theme
visual validation remain open. Local npm verify passed 310 tests plus typecheck
and production build after the panel addition; this is not visual acceptance.

Run npm verify and locked Rust library tests/compile check on the integrated
tree, not only this branch. Then verify both reference themes, PID reuse,
birth/swallow motion, fallback→native icon replacement, repeated dialog reversal,
failure/stall/recovery, full process-table coverage, and wallpaper HUD clearance.
Recheck 30/60/120 targets on actual display hardware; prior high-density 120 Hz
measurements were not a pass. Native packaged wallpaper, long-run overhead,
missing platform capabilities and Task Manager parity remain open work.

## CI discipline

Icon follow-up: pause now disables the crossfade, like reduced motion, without
hiding an already loaded native icon. Regressions check both preference toggles
and application/source changes retaining the correct initials until the new icon
loads. Full local verification: 365 tests, type checking and build passed.
Actual composited transition and system media-query behavior still require visual QA.

ProcessIcon now keeps its initials underneath the image until the current source
fires load, then crossfades over 160 ms. Failed sources keep the fallback; ordinary
sampling preserves the same loaded image node. Merge ProcessIcon.css with the
component, preserving the grid-area overlap if global icon styles change in the
other task. App/system reduced-motion disables the CSS transition. Local verify:
362 tests, type checking and build. These are load-state/identity tests, not
visual proof: native decoding, dual-theme crossfade and display pacing need QA.
No new visual asset was synthesized; the OS application icon remains the source.

Relationship filtering now shares isObservedChild with observedParent. The child
list no longer allocates a singleton array and calls find for every process;
the full-table scan remains linear, followed by sorting matched children. Tests
check bidirectional rule consistency and 5000-record filtering without truncation
or source mutation. Local full verify: 361 tests, type checking and build passed.
This eliminates intermediate allocations; real runtime overhead is not measured.

Child-list continuity follow-up: source/parent identity changes reset pagination;
row keys include collector identity. Ordinary telemetry keeps the selected page,
the same button DOM node and keyboard focus, as verified by a component regression.
Full local verify passed 358 tests, type checking and production build. The source
reset is intentional and does not claim a visual transition for process exits.

Inspector now includes ChildProcesses.tsx/CSS after ParentProcess: direct children
are inferred from parent PID/start time in the current snapshot, sorted by PID,
and paginated eight at a time. No extra sampler/query or process mutation occurs.
Click revalidates source, selected parent, both lifetimes, live presence and the
current relationship; navigation retains Inspector focus. Preserve its lifetime
key when merging other Inspector/termination work. Existing agent-embryo controls
were not modified. Ten component cases plus full local verification pass (357
tests, type checking/build); browser/native visual conformance remains open.

Freshness follow-up: nonfinite or future last-success timestamps now make the
observation stale without scheduling a timer. A system clock rollback must not
extend apparent freshness. Deadline timers are capped at the browser's signed
32-bit maximum; nonfinite cadence falls back to five seconds. Three timestamp
regressions verify stale status, no timer loop and recovery after a valid sample.
Local full verification passed 347 tests, type checking and production build.
Shared integration worktree was rechecked read-only: theme/lifecycle/termination
changes remain uncommitted and were not altered by this branch.

Snapshot status labels now expire a previously successful native observation
after max(5 seconds, three sampling intervals), even without a reported query
failure. A one-shot deadline is reset on success and rechecked on visibility
change; hidden documents do not schedule a new deadline timer. Paused/demo labels
retain their existing semantics. Two hook regressions cover silent staleness,
fresh recovery, pause/resume, timer cleanup and hidden-window wall-clock advance.
Full local verification passed 344 tests, type checking and production build.
This labels retained observations; it neither cancels native queries nor claims
real system suspend/resume validation or a completed Task Manager replacement.

ProcessExplorer and Inspector now share count/percentage domain validators.
Whole-machine CPU must be 0–100%; counts must be nonnegative safe integers.
Invalid metrics sort after observations in either direction and display as
unavailable. The table fixture previously used 0–119% as ordinary CPU data;
it now uses valid percentages while retaining its intended ordering. Dedicated
tests separately cover invalid domains, zero, table cells and both sort directions.
Full local verification: 342 tests, type checking and production build passed.

Inspector thread/connection counts now require nonnegative safe integers in all
three presentations (tab summary, detail grid and activity highlights). Invalid
counts are unavailable, never zero; genuine zero remains visible. Five regression
inputs cover NaN, infinity, negative, fractional and unsafe-integer values, then
recovery to zero. Full local verification passed 338 tests, type checking and
production build. This is display validation, not new connection enumeration;
native connection collection remains an outstanding capability.

Sparkline now compares actual SVG attributes before writing each animated frame,
so rounded, unchanged geometry and stationary endpoints do not cause redundant
DOM mutations. Checking the DOM rather than only the cached displayed value also
preserves correction after React commits a new target. A fixed-percent 0→1%
middle-point regression at simulated 120 Hz completes with at most three line
writes and zero stationary-tip writes, then releases its frame. Existing resize,
fill-toggle and frame-budget tests still pass. Full local verification: 333
tests, type checking and production build. This is a DOM-write reduction test,
not a measured GPU/CPU improvement or a real-display frame-rate acceptance result.

CPU core readouts also use the shared AnimatedMetric transition now. Keep the
stable locale formatter and existing source/topology/core keys: ordinary samples
interpolate, new identities start fresh. Expanded pages remain bounded to eight
cores; collapse unmounts and cancels frame work, reopening starts at current data.
The new component regression checks intermediate visible values, immediate actual
observations for assistive technology, cancellation and reopening. Local full
verification passed 332 tests, type checking and production build. Actual visual
conformance and hardware refresh-rate pacing are still not verified.

ParentProcess navigation now also checks the rendered collector against the live
store before following a relationship. The regression changes demo to native
before React commits, retaining identical PID/start-time values, and confirms
the old click cannot select the parent. Keep this source check alongside the
existing child/parent lifetime and current-selection checks during integration.
Local verification after this fix: 328 tests, type checking and production build
passed. This is navigation protection, not authority for process termination.

### Packaging coordination

Branch-local NSIS packaging succeeded at `65a4c9a`; see
`design/qa-manifest-conflict-2026-09-16.md` for hashes and limitations.
Merge the Windows manifest, build-support rule, integration tests and artifact
validator together. Preserve the other task's Cargo features and command
registrations when resolving Cargo.toml/lib.rs overlaps. This unsigned test
installer excludes the shared worktree's uncommitted work and is not a release.
No installation, publication or automatic merge was performed.

### Coordination checkpoint — 2026-09-16

- The shared `feat/motion-integration` worktree still contains uncommitted theme,
  lifecycle, artwork and termination work. It was inspected read-only; none of
  those files were overwritten, staged or committed by this branch.
- Numeric CPU/memory motion is isolated in AnimatedMetric, MetricCard and Sidebar.
  Keep its source-change reset, cancellation and 30/60/120 frame budget together;
  rounded labels now skip duplicate DOM writes without losing interpolation state.
- Local `npm run verify` passed: 57 test files, 294 tests, type checking and build.
  This is branch-level evidence, not proof the other task's dirty tree integrates.
- GitHub run 35092244214 passed for 938a52d. Later commits require their own CI.
- Preserve this PR as a draft targeting `feat/motion-integration`; resolve overlaps
  by hunk and rerun acceptance on the combined tree before any merge.

CI cancels prior runs on new PR commits. Allow the current run to reach a real
terminal state before pushing queued test-only commits when practical. Do not
call an in-progress or cancelled run successful. Do not auto-merge this draft,
publish a release, or edit another task's uncommitted changes as part of this
handoff. No such action was performed during this audit.
