# Current QA index

- Actual browser process-list check (code 78a83e1): English Eldritch keyboard
  filter/fixed order/inspect and Chinese Garden empty-state/Escape verified at
  1280 × 720, with visible focus and correct trigger return. Detailed scope and
  unverified native departure/FPS/AT gates: [browser record](qa-process-list-browser-2026-09-17.md).

- Process I/O continuity: same-lifetime stale snapshots remain visible through
  pause/errors/baseline with explicit bilingual not-live status and stopped
  interpolation. Changed PID/start-time/source clears immediately; fresh data
  starts a new history segment. Automated PASS: 482 tests/typecheck/build;
  retained chart identity, accessible status, cancellation and PID reuse covered.
  Native visual/AT/hardware FPS acceptance remains NOT READY; no new EXE built.

- Network continuity (2026-09-17): against the no-flash and factual-state brief,
  failed interface queries retain the last successful same-source table/history,
  selection, chart nodes and focus. Status explicitly says unavailable/not live;
  paused/stale metrics stop interpolation and curve opacity transitions. Empty
  observations clear devices; source changes never resurrect retained interfaces.
  Recovery history still breaks across missing samples. PASS: 480 frontend tests,
  typecheck and production build; focused network suite 9 tests, including retained
  DOM/focus and accessible status descriptions. NOT READY for native visual/AT
  acceptance: no real WebView failure/recovery or hardware FPS measurement here.
  The previously built 073820b Windows executable does NOT include this change.

- Windows rebuild (2026-09-17, code 073820b): no-bundle locked/offline release
  build and actual PE manifest verification passed. Includes latest GPU/device
  frontend and retained stale-state motion changes. Unsigned; not launched,
  installed or merged with the other task's pending edits. Exact hash and gates:
  [release preflight](qa-release-preflight-2026-09-17.md). BUILD VERIFIED only.

- Retained sampling states (2026-09-17), source: user's no-flash sampling request
  and design/context.md factual continuity/accessibility requirements. Disk/GPU
  pause, timeout, request failure and resume warmup preserve the last received
  panel/selection/chart identity, explicitly labelled "not live" in both languages.
  Old metric/curve interpolation stops; curves dim over 180ms (global reduced-motion
  override applies). Metric regions reference the status for accessible description.
  Recovery starts a fresh history segment; switching to demo/unsupported data
  clears the old native observation rather than carrying it across sources.
  PASS (automated): 479 tests/typecheck/build; four added retention cases and
  strengthened 30/60/120 component tests verify cancellation, focus/DOM stability,
  timeout identity, gap resets and stale accessibility text. Existing curve tests
  still pass with optional active control. NOT READY for broad visual acceptance:
  real desktop failure/recovery rendering, hardware frame pacing and manual AT
  remain unverified. Browser-only demo cannot exercise native retained values.

- GPU device labels (2026-09-17), source: factual identity and continuity criteria
  in design/context.md plus docs/gpu-collection.md. PASS (automated): 475 frontend
  tests/typecheck/build; new validation and label-enrichment tests keep selection,
  focus and chart nodes while showing hardware/software/unknown labels in both
  languages. Native: 55 tests plus explicit DXGI/worker probes; 2/3 counter adapter
  identities matched, unmatched identity remains raw instead of guessed.
  Limited browser screenshot: updated Eldritch English unavailable copy in tab 18,
  isolated 1437 preview; focus outline remains visible. Named live state was NOT
  shown in this web-only environment. NOT READY for complete GPU acceptance:
  actual named desktop UI, unmatched identity investigation, hotplug, numerical
  workload parity, hardware FPS and manual assistive-technology checks remain.

- GPU frontend integration (2026-09-16), source: design/context.md GPU brief,
  docs/gpu-collection.md contract and the user's smooth sampling requirement.
  PASS (automated): 25 new data/hook/component cases, 473 total tests; typecheck
  and production build passed. Covers schema bounds/coverage contradictions,
  null vs zero, baseline/history gaps, 80 reachable engine choices, persistent
  selection/focus/chart nodes, session changes, independent disk/GPU requests,
  late replies, collapse/hide/pause/wallpaper and shared-frame motion at simulated
  30/60/120 settings. Existing disk tests pass after hook extraction.
  PASS (limited browser): isolated http://127.0.0.1:1437 preview, tab 18, captured
  inline screenshots of Garden zh-CN and Eldritch en-US unavailable states at
  1280x720. Sidebar copy wraps inside the panel; theme/language switch and keyboard
  Return expansion worked. Browser shows native-only availability, not fake GPU
  readings. Other task's existing 1420 preview was not touched.
  NOT READY (HIGH, remaining acceptance): real desktop IPC/live GPU curves,
  device-name mapping, controlled-workload numerical parity, hardware frame pacing
  and manual assistive-technology/contrast checks are not proven by this run.
  This is NOT full reference-scene visual acceptance or a replacement release.

- DiskPanel frontend integration (2026-09-16): source is design/context.md factual
  monitoring/reduced-motion requirements and docs/disk-collection.md counter
  contract. Collapsed sidebar panel offers a native disk selector, binary-unit
  read/write rates and fixed 0–100% activity; only three selected-disk charts mount.
  Existing theme tokens and shared numeric/chart motion are reused, no new artwork.
  PASS (automated): 24 new data/hook/component cases cover all 60 returned choices,
  stable chart nodes/focus/selection, null vs zero, empty/error/baseline/partial
  states, bounded history, timeout, late responses and stop/resume/remount behavior.
  Full verify: 445 tests, typecheck and production build passed.
  NOT READY (visual/native): browser inventory returned HTML instead of JSON;
  actual desktop IPC, both-theme rendering, contrast, hardware-FPS and manual AT
  remain unverified. Native worker probes are not desktop UI acceptance evidence.

- ProcessExplorer numeric motion (2026-09-16), source: design/context.md legible
  living monitoring and reduced-motion requirements plus user's sampling continuity
  request. CPU and memory now reuse AnimatedMetric's 320ms interpolation and
  global frame budget; stable locale callbacks avoid restarting a transition on
  unrelated renders. Collector + process-lifetime keys prevent cross-identity
  interpolation. Actual observations remain available to assistive technology.
  Closing the overlay disables transitions immediately, before its exit completes.
  PASS (automated): nine new cases cover simulated 30/60/120 Hz, close, pause,
  reduced motion, source/lifetime changes, invalid/recovered measurements, and
  1500-record pagination with only 50 rows animated; paging/unmount cancels work.
  Full verify: 415 tests, type checking and production build passed.
  NOT READY (visual/runtime): browser inventory again failed with HTML instead of
  JSON. Both-theme typography, actual frame pacing, power overhead and manual
  screen-reader behavior are not proven by these tests. No raster artwork changed.

- ProcessExplorer row-order hold (2026-09-16): source is the user's requirement
  to avoid sampling-driven jumps while developing a usable Task Manager replacement.
  Added an explicit bilingual, keyboard-accessible pressed-state control. Holding
  order keeps readings live and existing row nodes/focus stable, appends new process
  lifetimes, forgets departed lifetimes and releases on filter/sort/source changes.
  Header aria-sort no longer claims a live metric sort while order is held. Toolbar
  wrapping and theme-token pressed/focus styles are present; no new artwork.
  PASS (automated): six new behavior cases, including PID reuse and bounded
  50-row pagination; full verify 406 tests plus type checking and production build.
  NOT READY (visual): browser inventory failed with an HTML/JSON service response;
  actual narrow-window wrapping, both-theme contrast and manual assistive-technology
  navigation remain unverified. Departures still remove table rows immediately;
  this feature is not evidence of lifecycle animation or hardware-FPS acceptance.

- NetworkPanel first integration: collapsed sidebar section, all adapters reachable
  via native select, only two active charts, bilingual B/s/KiB/s/MiB/s/GiB/s rates,
  explicit unavailable/empty/baseline/down states and per-interface scope warning.
  Uses existing theme tokens, AnimatedMetric and Sparkline; no new artwork.
  Source: docs/network-collection.md measurement contract and design/context.md
  full Task Manager objective/factual clarity. Four component/history tests cover
  60 adapters, selection preservation, zero vs null, hidden/unmounted charts and
  failed/disconnected/type-changed history gaps. Full verify: 394 tests and
  typecheck/build passed; select background token corrected afterward and rebuilt.
  NOT READY for visual/native acceptance: browser inventory again failed with
  service response parsing error. Both themes, long aliases, keyboard/contrast,
  hardware pacing, packaged IPC and controlled-traffic comparison remain open.

- Child-process navigation (2026-09-16): Inspector now exposes confirmed direct
  children in eight-row pages with existing native application icons, bilingual
  labels and a current-snapshot inference disclaimer. Code-level behavior tests
  cover navigation/focus, pagination, missing/invalid relationships, six stale
  click scenarios and list shrink/recovery. Full local verify: 357 tests,
  type checking and production build. Source: design/context.md factual clarity,
  keyboard/localization requirements and docs/task-manager-replacement.md process
  relationship workflow. NOT READY for visual acceptance: browser inventory
  again failed with a service response parse error, so Garden/Eldritch layout,
  long-name clipping, keyboard reachability and contrast require browser/native
  verification. This is direct-child traversal, not a full historical tree or
  process-tree termination implementation. No new artwork was created.

- Inspector CPU/memory readouts now use 320 ms AnimatedMetric transitions with
  stable locale formatters and lifetime-keyed reset. Local verification passed
  61 files / 327 tests, type checking and production build. Regression checks
  retained DOM nodes during sampling, intermediate values, immediate accessible
  observations, PID-reuse reset and unmount cancellation. Existing metric tests
  cover 30/60/120 frame budgets, pause, reduced motion and hidden windows.
  Source requirement: gradual sample updates without flashing (design/context.md
  and user motion request). Browser inventory failed again on 2026-09-16 with a
  service response parse error. NOT READY for visual conformance: both themes,
  real display pacing and packaged native behavior remain unverified. No new art.

- Release manifest defect confirmed: [2026-09-16 diagnosis](qa-manifest-conflict-2026-09-16.md).
  Original artifact had duplicate ID 1 entries. Project-scoped GCC-spec and
  application-manifest repair now rebuilds without the warning; actual artifact
  passes uniqueness and XML/settings checks. No global compiler files changed.
  This does not close the separate installer, signing or native runtime gates.

- Windows executable preflight: [2026-09-16 release build](qa-release-preflight-2026-09-16.md).
  326 frontend tests and isolated Tauri release executable build passed. NOT READY:
  linker manifest warning, signing, installers, native runtime/visual validation
  and complete capability acceptance remain open.

- Logical CPU panel (2026-09-16): compared code/tests with the current logical-CPU
  brief in context.md. Five component tests pass: bounded pages, collapsed chart
  unmount, missing/zero distinction, bilingual stale status, source/topology
  identity reset, and page persistence/clamping. Fixed reuse of old curve DOM
  across source/count changes; ordinary telemetry retains chart identity.
  Browser inventory failed twice with a service HTML/JSON parsing error, so no
  new screenshots or visual conclusions were obtained. NOT READY for visual
  sign-off: Garden/Eldritch layout, sidebar scrolling, keyboard navigation,
  contrast and real screen-reader behavior still require browser/native QA.

- Parent navigation runtime check (2026-09-16, Chinese Garden 1280×720): selecting python then its `code · PID 2458` parent changes Inspector to code. Initial check lost focus to body; fixed by focusing the persistent Inspector before selection. Browser recheck confirms focus on the named Inspector and the new heading. Missing parent PID 1120 remains non-actionable text. Long-name layout, English/Eldritch and native-parent checks remain open; this is not a complete process-tree acceptance.

- Cumulative browser follow-up: [2026-09-16 runtime checkpoint](qa-cumulative-browser-2026-09-16.md). Chinese Garden filtering/focus passes; header label wrapping fixed and visually rechecked at 1280×720. Other widths, Eldritch and motion checks remain open; NOT READY for visual sign-off.

- Feed health browser check: [2026-09-16 notice visual QA](qa-feed-health-browser-2026-09-16.md). CPU occlusion fixed and rechecked in Chinese Garden / English Eldritch at 1280×720: notice now replaces branding within the existing header, without resizing the workspace. Wallpaper and narrow-width acceptance remain open.

- Native coverage: [2026-09-16 collector coverage QA](qa-native-process-coverage-2026-09-16.md). Removed the 500-record truncation; a real Windows test returned all 566 enumerated PIDs. This supersedes the cap caveat in the earlier process-explorer record, not the remaining native integration/performance gates.

- Process explorer: [2026-09-16 process table QA](qa-process-explorer-2026-09-16.md). Search/sort/paginate all received records and locate them in Inspector; Chinese Garden / English Eldritch browser checks and 218 tests pass. Native completeness remains blocked by the existing collector cap, not hidden by the UI.

- Trend-chart continuity: [2026-09-16 Sparkline QA](qa-sparkline-frame-rate-2026-09-16.md). Global rate gates SVG updates; growing/shrinking histories morph from the displayed curve without dropping existing bends. 210 tests pass; browser/native follow-up remains open.

- Native icon replacement: [2026-09-16 icon cache QA](qa-icon-replacement-2026-09-16.md). Canvas now accepts later native icons while retaining decoded fallback images during loading; stale callback and unmount regressions included. Native visual follow-up remains open.

- PID reuse continuity: [2026-09-16 process lifetime QA](qa-process-lifetime-2026-09-16.md). Main nodes retire/birth independently for reused PIDs; both-theme Canvas regressions, 197 tests and focused browser captures pass. Native/high-density acceptance remains open; coordinate overlapping theme hunks.

- Parent/child consumption: [2026-09-16 browser lifecycle QA](qa-parent-child-browser-2026-09-16.md). Actual canvas captures confirm open maw, suction, occlusion and recoil for simultaneous parent/child departure; not native or high-density acceptance.

- Lifecycle timing: [2026-09-16 clock regression](qa-lifecycle-clock-2026-09-16.md). All three target rates preserve a partially completed swallow through a simulated hour hidden; full verification reached 194 tests.

- Toolbar sampling: [2026-09-16 subscription QA](qa-toolbar-sampling-2026-09-16.md). Telemetry-only updates no longer commit toolbar renders; not an FPS benchmark.

- Interrupted overlays: [2026-09-16 overlay interruption QA](qa-overlay-interruption-2026-09-16.md). Settings/theme surfaces reverse from the current pose; browser focus/reduced-motion checks and 186 frontend tests pass. Shared overlay-style integration needs deliberate merging.

- Label continuity: [2026-09-16 label motion QA](qa-label-motion-2026-09-16.md). Persistent placement preference, scene-clock interpolation and clean-reload pause/reduced-motion checks; does not claim high-density 120 FPS acceptance.

- Current high-density evidence: [2026-09-16 density profiling](qa-density-profile-2026-09-16.md). 32 main organisms plus 12 Agent children, all three target rates and shadow-cost isolation. Eldritch high-density 60/120 targets remain below target; no effects were removed and no native release is certified.

- Isolated performance successor: [2026-09-16 off-thread artwork QA](qa-offthread-artwork-2026-09-16.md). 171 frontend tests and production-CSP browser verification; native acceptance and sustained high-refresh profiling remain open. Existing release artifacts are unchanged.
- Current scene continuity: [2026-09-12 phase and theme QA](qa-scene-continuity-2026-09-12.md). PR #6 now passes 143 frontend tests; cold switching has zero observed empty generated frames, with first-decode frame cost explicitly still open.
- Agent lifecycle successor: [2026-09-12 embryo motion QA](qa-agent-embryos-2026-09-12.md). Separate branch stacked on the ambient runtime; 120 frontend tests, no new native release.
- Independent rendering fix: [2026-09-12 maw transparency QA](qa-maw-transparency-2026-09-12.md). Includes clean three-way backport checks against both native integration baselines.
- Next-version ambient runtime: [2026-09-12 ambient motion QA](qa-ambient-2026-09-12.md). READY for draft frontend review; new installers are not built or approved by this result.
- Frozen motion/native release: [2026-09-12 release QA](qa-2026-09-12.md). Keep its installer hashes separate from the next-version branch.

The older record below is historical. In particular, its claim that Eldritch peripheral atlases were integrated was not true of the later source baseline; the ambient runtime work above supplies and verifies that missing layer.

# Historical Design QA — Process Garden v0.1.0

Date: 2026-08-10

## Reference fidelity

- PASS — Garden theme preserves the reference's dark nocturnal canvas, central living core, green/cyan ecology and compact monitoring chrome.
- PASS — Garden v2 strengthens the reference's ecosystem reading with a moss/root/flower central heart, 16 process specimens, layered habitat plates and subtle pollinator motion while keeping labels and metrics dominant.
- PASS — Eldritch theme preserves the near-black abyss, purple/cyan bioluminescence, gothic display type, organic panels and dense peripheral life from the Cthulhu reference.
- PASS — Generated backgrounds, cores, creature atlases, habitat plates, pollinators and agent-growth atlases are separated by theme and contain no baked labels.

## Product behavior

- PASS — Window, fullscreen and WorkerW wallpaper modes remain accessible from the same bottom dock.
- PASS — English/Chinese switching updates interface copy; both themes use complete offline font stacks.
- PASS — Processes are grouped into stable application/resource categories and can be pinned to a visual family from Settings > Ecology.
- PASS — Claude, Codex, Trae and WorkBuddy-style agents render as theme-specific brains; child tasks render as three-stage embryos.
- PASS — Inspector exposes current agent stage and child-task count without implying access to prompt contents.
- PASS — Desktop processes use their EXE-embedded Windows icon in both themes; the Canvas, process dock and Inspector share the same identity. Offline demo fallbacks cover the reference applications.
- PASS — Global 30/60/120 Hz animation settings are display-synchronized and independent from resource sampling.
- PASS — Sampling no longer recreates or clears the Canvas lifecycle. Resource and layout changes interpolate continuously. Garden exits dissolve; Eldritch exits remain visible through anticipation and suction, spiral into a split-jaw deformation of the generated central-core artwork, then disappear under the snapping jaws with recoil and shockwaves.

## Layout and accessibility

- PASS — Primary monitoring view remains legible at 1440×960 and 1280×720; compact layout keeps core controls usable at the documented 1040×720 desktop minimum.
- PASS — Focus-visible states, semantic buttons, labelled controls and reduced-motion handling are present.
- PASS — Decorative Canvas content has an accessible summary; essential process data remains available in Inspector and Timeline.

## Fixes applied during QA

- Reduced ecological node density so generated organisms remain individually readable.
- Removed child-agent tasks from the ordinary node pool and attached them spatially to their parent brain.
- Added one-time black-background alpha conversion for generated sprite atlases.
- Made custom Eldritch-derived themes inherit Eldritch component treatment, not only token colors.
- Added explicit Windows bundle icons and a platform-safe application identifier.
- Replaced the ordinary theme's sparse neon perimeter with a layered miniature habitat and added deterministic two-specimen variation to all eight organism families.
- Added habitat and pollinator render layers that respect the existing ambient-particle and wallpaper performance controls.
- Added a bounded native icon pipeline with path/miss caching, offline brand fallbacks and a final initials fallback.
- Replaced the hidden wallpaper 20 FPS cap with explicit global 30/60/120 Hz frame pacing; added breathing habitat, identity-core and connection motion on a continuous timebase.
- Replaced sample-triggered render-effect teardown with PID-keyed persistent visual nodes, exponential damping and reversible enter/exit transitions.
- Added a tested four-stage Eldritch lifecycle (anticipation, spiral suction, snap bite, recoil) plus foreground jaw occlusion, slime flow and umbilical-cord pulses.

## Verdict

PASS for the enriched v0.1.0 release. Frontend verification passes 37 tests and Rust verification passes 4 tests, including real `explorer.exe` icon extraction. Browser QA confirms all three refresh-rate controls, visible icons in both built-in themes, continuous frame-to-frame motion, no blank frames across repeated sample boundaries, and visible Eldritch jaw-open/suction/bite stages. MSI, NSIS and portable artifacts were regenerated; the portable executable remained alive and responsive through the native smoke test and then closed cleanly.
