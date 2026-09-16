# PR #7 integration handoff — 2026-09-16

## Latest: retain explicitly stale monitor layouts — 2026-09-17

Shared native hook and DiskState add `stale`; include Disk/GPU components and
fixtures with this change. Temporary errors/pause/warmup preserve last snapshot
identity and controls, with bilingual not-live status; source changes still clear.
Recovery resets history instead of bridging an error interval. Sparkline gains
optional active prop (default true); memo comparison includes it so stale motion
actually cancels. Disk/GPU pass active=false for stale values, reuse global reduced
motion overrides and reference status in accessible region descriptions.
479 frontend tests/typecheck/build pass; no native/source artwork changes in this
patch. Real desktop error/recovery visual and manual AT acceptance remain open.

## Latest: optional DXGI device enrichment — 2026-09-17

GPU descriptors match full LUIDs, with software flag and raw-identity fallback.
Native worker caches/rebuilds DXGI factories, bounded/timeout/backoff protected;
query failure does not erase numeric GPU observations. Include new gpu/devices.rs,
grouping/worker changes, Windows target dependency and the one-line lockfile root
dependency addition together. Windows crate version 0.61.3 was already locked;
no dependency upgrades. Preserve the other task's Cargo.toml/Cargo.lock additions.

Frontend device enrichment is optional for older native responses; names never
become React/chart/selection keys. 475 frontend tests/build, 55 Rust tests/check
pass; explicit native probes match 2/3 counter identities to names. One stays
unknown intentionally. Software adapters are distinguished; physical index is
not labelled as Task Manager's GPU index. No physical memory-capacity claim.
Named desktop UI, remaining identity, hotplug and workload/FPS acceptance remain.

## Latest: GPU frontend with bounded shared motion

Sidebar adds GpuPanel after DiskPanel; preserve any other task's Sidebar edits.
New gpuReadings validator/history, useGpuReadings, and useNativeReadings factory
are required together. Disk hook now delegates to that factory; its behavior and
tests remain intact. Each provider owns independent in-flight admission, not one
global queue across GPU and disk. No i18n JSON, artwork or shared native schema
edits in this frontend patch. Panel reuses DiskPanel CSS and existing motion.

473 frontend tests, typecheck/build pass; 25 new GPU cases include simulated FPS,
stable chart identity/focus, unknowns and disk/GPU request independence. Isolated
preview at 1437 (not the other task's 1420 page) verified Garden Chinese/Eldritch
English unavailable states and keyboard expansion. Device naming, desktop live
IPC/curves, workload parity and true hardware FPS remain acceptance gaps.

## Latest: independent GPU worker and command

GPU now has a managed reader and registered `sample_gpu({ session })` command.
The common bounded thread code is extracted from disk_worker.rs into
provider_worker.rs; include BOTH modules plus the lib.rs declaration when merging.
GPU and disk own separate threads, not a shared serial queue. Preserve the other
task's lib.rs commands/state (especially termination) while adding this command;
do not replace its invoke_handler wholesale. No changes to shared SystemSnapshot
or collector schemas. Grouped GPU responses add explicit `rateBaseline` metadata.

52 Rust unit tests passed / 11 manual probes ignored, cargo check passed. Native
GPU worker cold/continuous/renewed-session probe and native disk worker probe pass.
Blocked GPU fixture proves system sampling and another provider still complete.
This does not prove desktop IPC, visuals, controlled GPU workload parity or signed
release readiness; frontend GPU demand/history/presentation remains pending.

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

Shared byte/percent/watt formatting now reuses a bounded (16-entry) Intl cache
keyed by locale, format kind and precision. The regression calls all three 120
times and observes only three constructors, with separate locale/precision
results and eviction coverage. Date formatting is unchanged (no cached timezone).
Full local verification: 398 tests, type checking and production build. This is
constructor-count evidence, not an actual hardware FPS or CPU benchmark.

PowerMetric rejects nonfinite, nonpositive or future snapshot timestamps as stale
in both the card and wallpaper HUD, without scheduling an expiry timer for those
observations. Four regressions check invalid-time rejection and valid recovery.
Full local verification: 389 tests, type checking and build passed. Coordinate
this presentation-only change with the power-metrics branch; no native sensor,
permission, driver or power-collection implementation was changed.

System process/thread totals now share discrete count validation with process
details. Invalid count observations break history rather than drawing negative
or fractional peaks; core-count detail also rejects unknown/invalid topology.
Nine regression cases cover negative/fractional/nonfinite/unsafe counts in the
history helper and visible cards. Full local verify: 385 tests, type checking
and build passed. This does not expand native process enumeration permissions.

Sidebar validates CPU/memory before AnimatedMetric: invalid inputs become NaN
sentinels and settle immediately to unavailable, never interpolate through bogus
values. Memory utilization requires positive finite capacity and used <= total;
unknown/inconsistent capacity no longer implies 0% used. Known byte usage remains
visible even when the ratio is unavailable. Six new regressions cover these
states. Full local verification: 376 tests, type checking and production build.

Shared formatters now return unavailable for negative/nonfinite byte, percentage
and duration observations instead of manufacturing zero or exposing NaN/Infinity.
Real zero retains existing localized output; sub-byte positive values use B
rather than an invalid negative unit index. Bilingual regressions cover these
cases. Full local verify passed 370 tests, type checking and production build.
This presentation guard does not validate or add any native telemetry source.

FeedHealthNotice guards nonfinite/out-of-Date-range sample timestamps before Intl
formatting. A corrupt time cannot crash the error notice or be mislabeled as no
successful sample ever received; bilingual unavailable-time text is used instead.
Three regressions cover NaN, infinity and finite overflow plus recovery. Full
local verification passed 368 tests, type checking and production build.

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

### Latest network and motion-formatting handoff — 2026-09-16

GPU foundation follow-up: gpu.rs adds a raw local provider reader, NOT a total GPU
percentage or UI feature yet. The validated array reader moved out of disk.rs into
performance_counters.rs; merge that module and both lib.rs declarations together
or disk compilation will fail. Native GPU probe: 700 engine / 3 dedicated-memory /
3 shared-memory counter instances, not device counts; 494.246ms initialization,
1.409ms next sample (debug, single observation). Existing native disk probe also
passed after extraction. Library 42 passed / 10 ignored; non-test cargo check
passed. See docs/gpu-collection.md for aggregation/identity and integration gates.
No shared-worktree, driver, counter-configuration, privilege or artwork changes.

New overlap observed read-only in the shared worktree: collector.rs/models.rs and
types/system.ts now add cpu_model/cpuModel (plus a native/model serialization test).
Preserve that field alongside this branch's cpu_core_percents and network schema;
do not overwrite these files wholesale with either branch's version. This branch
has not copied, staged or committed the other task's CPU-model or new divine/minimal
theme changes. The shared HEAD is still ee5dae4 with uncommitted work, so PR
mergeability cannot prove those changes integrate. Combined-tree tests are required.

Physical disk foundation: disk.rs and the Win32_System_Performance Cargo feature
provide a local PDH reader with explicit unavailable values, bounded wildcard
arrays and baseline handling. This is NOT wired to collector/UI yet. Preserve the
module declaration and additive Cargo feature when resolving the other task's
Cargo/lib.rs edits. Native read-only probe passed (one disk): initialization
601.352ms, next collect+format 0.399ms; independent background initialization is
required before integration so CPU/process sampling is not delayed. Rust suite:
35 passed / 7 ignored, plus the explicitly executed disk probe passed separately.
See docs/disk-collection.md for counter semantics, sources and remaining gates.

Disk worker follow-up: disk_worker.rs and lib.rs add managed DiskReader plus the
sample_disks command, independent of SystemCollector. Preserve the other task's
termination command/state additions while merging this registration. There is one
worker, one in-flight permit, a 4s caller deadline, 5s provider-open failure backoff
and 15s idle query release. Timeout does not free the permit while native work is
still active. All query handles stay on their owning thread. Native worker probe
passed (1 disk, first response 433.069ms, second 0.563ms); library 40 passed / 8
ignored and non-test cargo check passed. Frontend wiring and actual desktop IPC
acceptance remain open; no query opens just from constructing the worker.

Disk frontend follow-up: Sidebar now includes collapsed DiskPanel. Merge
DiskPanel.tsx/.css, useDiskReadings.ts and data/diskReadings.ts with the existing
sample_disks worker/registration; partial integration would leave the panel in
unavailable/error state. Requests stop on collapse/hide/pause/non-windowed mode;
sessions reset across interruptions; ordinary PDH baseline errors retain sessions.
Only three selected-disk charts mount; existing shared motion and theme tokens
are reused. Payload/history/continuity tests added (24); full verify 445 tests,
typecheck/build passed. Browser service still unavailable, so native UI/IPC and
visual/FPS acceptance remain open. No shared-worktree files were edited.

49c1d81 no-bundle Windows build succeeded with the complete disk frontend/backend;
embedded manifest guard passed and the EXE remains unsigned/unexecuted. Recorded
hash in design/qa-release-preflight-2026-09-16.md. Follow-up tests: library 41 passed
/ 9 ignored, plus explicit 8-sample native disk probe passed (debug median 0.391ms,
max 0.618ms). A blocked fake disk provider does not prevent real system sampling.
These are not desktop UI, long-run performance or combined-worktree acceptance.

ProcessExplorer follow-up: explicit Keep row order control separates continuous
measurement updates from automatic rank changes while a user inspects rows.
Preserve lifetime keys, collector-bound order reset, pruning/append behavior,
accurate aria-sort and 50-row pagination. Changing filter/sort releases the hold;
this is not the global Pause action. Files: ProcessExplorer.tsx/.css/.test.tsx.
Six new tests; full local verify now 406 tests plus typecheck and build. Actual
visual QA remains unavailable; see design/qa.md. No shared-worktree edits.

Numeric-motion follow-up: merge ProcessExplorer's AnimatedMetric use with the
new optional active prop on AnimatedMetric (default true for existing callers).
The list passes open so exit animations retain their surface without running
numeric transitions; source/lifetime row keys reset observations across identities.
Only the visible 50 rows mount numeric effects. Nine added motion tests bring
full local verify to 415 tests plus typecheck/build. This is not hardware-FPS or
power-consumption evidence; actual visual QA is still unavailable.

Shared numeric frame scheduling follow-up: AnimatedMetric now imports
animation/metricFrames.ts, which coalesces pending transitions into one browser
requestAnimationFrame callback. Keep this file with AnimatedMetric during merge.
Consumers still independently cancel, receive the same frame timestamp, enforce
their existing 30/60/120 write budget and stop at their own target. Work scheduled
inside a callback waits until the next frame; one failing consumer does not starve
siblings. Cancelling the final consumer removes the pending browser callback.
The 1500-process test still mounts only 100 numeric labels on the visible 50-row
page, now with ONE pending browser callback instead of 100. MediaQueryList is
reused per transition and its live matches property detects reduced-motion changes
without querying again every frame. Six new regressions; full verify: 421 tests,
typecheck and build passed. This proves scheduling/allocation reductions, not
measured hardware-FPS, CPU, battery or native visual acceptance. Existing EXE
evidence at 3623cfe predates this scheduler change.

Sparkline now uses the same metricFrames scheduler as AnimatedMetric. Keep that
dependency during integration: curves and labels share one browser callback while
retaining independent 420ms/320ms durations, cancellation, frame budgets and final
values. A 12-curve-plus-label regression checks cancelling curves does not cancel
the label, and label completion does not stop the longer curves. Sparkline also
reuses its live MediaQueryList instead of allocating one per animation frame.
Full verify passed 447 tests, typecheck and production build; final strengthened
Sparkline assertions also passed. This is scheduler behavior, not measured native
frame pacing, reduced CPU/power, or visual acceptance. Latest EXE at 49c1d81
predates this curve scheduling change; no artwork/shared-worktree files changed.

Freshness-motion correction: TopBar now gets both its label and animation state
from useSnapshotStatusDetails. Previously a silent sampling timeout could change
the label to Stale data while leaving data-observation-state=live, so the live dot
kept pulsing. The shared freshness timer now drives both, and a new successful
sample restores both. Existing paused/demo semantics and toolbar snapshot-render
isolation are preserved. Merge TopBar + hook together; old useSnapshotStatus string
callers remain supported. New silent-expiry/recovery regression; full verify 448
tests, typecheck/build passed. Actual visual/native frame acceptance remains open.

- Shared worktree remains read-only, including its new AGENTS.md, generated
  artwork, lifecycle modules and process-termination UI. Nothing was staged there.
- Merge network.rs, collector.rs, models.rs, lib.rs, Cargo feature additions,
  system observation types, NetworkPanel/CSS and networkHistory together. Preserve
  the integration task's command registrations and Cargo features additively.
- Adapter aliases are not retained in history. LUID strings preserve identity;
  renaming preserves rates, interface-type replacement requires a fresh baseline.
  Query failure is unavailable, not zero; recovery does not bridge chart gaps.
- Number formatter reuse is bounded to 16 entries; animated metric formatting
  no longer creates new Intl.NumberFormat instances on every frame.
- Local verification: 400 frontend tests, type checking and production build;
  Rust library: 33 passed, 6 ignored. Ignored tests are not claimed as passed.
- GitHub run 35106293698 passed for the prior pushed revision. The following
  push needs its own CI result. PR #7 stays draft; no merge or release is authorized.
- These are branch-level checks. Combined-tree compatibility, actual native UI,
  hardware frame pacing and controlled network-traffic validation remain pending.
# GPU identity parsing handoff — 2026-09-16

`gpu.rs` now parses bounded session-local adapter/physical/engine/process identities.
Engine type is optional: this host has 210 empty labels among 700 engine records.
Do not discard those engines or infer their type. All 700 engine and 3+3 memory
instances parsed in the explicit native probe; 44 Rust tests passed / 10 ignored,
and non-test cargo check passed. Raw maps remain unchanged. Aggregation, hardware
name mapping, worker/IPC and GPU UI are still pending. No other worktree edited.
# GPU grouped observations handoff — 2026-09-16

`gpu/grouping.rs` adds experimental per-engine observed sums, separate adapter
memory observations and explicit counter/identity/value coverage. No overall GPU
percentage or per-process lifetime claim; no GPU IPC/UI yet. Unknown, duplicate,
conflicting and out-of-range engine inputs suppress the affected sums rather than
being clamped or zero-filled. Full LUID + physical index + engine ID separates
providers. Raw PIDs are not serialized in the grouped result. Include the new
submodule with `gpu.rs` when integrating; no shared collector/schema edits here.

Validation: 50 Rust tests passed / 10 ignored, cargo check passed; explicit native
probe grouped 700 records into 31 engines across 3 provider adapter identities,
with no duplicates/type conflicts/unknown or out-of-range sums. This does not
prove controlled-workload parity, physical GPU enumeration or visual acceptance.
