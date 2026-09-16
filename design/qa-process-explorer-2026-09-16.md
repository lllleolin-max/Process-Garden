# Process explorer — first task-manager workflow

Source of truth: docs/task-manager-replacement.md, priority 1 (received process records, sorting/filtering, selection, honest coverage). This is not Task Manager parity or a native release approval.

## Delivered

- Dedicated toolbar entry and modal process table, retaining the existing ecological map and inspector.
- Name/PID/executable-path filtering; name, PID, CPU, memory and thread-count sorting with deterministic ties. Unknown sort readings remain last in either direction.
- Every received record is searchable; display is paginated at 50 rows to bound DOM work. Pagination is not a collector limit. A 5000-record query regression verifies the last record remains reachable.
- Clicking a row closes the panel and selects that process in the existing inspector. The existing shared pause control can hold the snapshot while inspecting rankings.
- Separate matched/received/reported counts and an explicit incomplete-snapshot warning. The native 500-record collector cap is NOT removed by this frontend change.
- Theme-token styling, tabular numerals, focusable controls, sort semantics, missing-value dashes, empty/no-match states, modal focus management and reversible entry/exit using the existing overlay machinery. No new art or external dependency.

## Browser verification

Dedicated preview started at port 1424 after port 1422 was found occupied; no existing server was killed. At 1280×720, inspected Chinese Garden and English Eldritch screens. Verified initial filter focus, filtering PID 12021 to tool-runner, selecting it into the inspector, empty results, Escape dismissal, restored toolbar focus, and English name filtering. Captures exposed an inherited right-aligned backdrop and visible screen-reader caption; both were corrected and the centered layout was re-inspected.

Browser warning/error logs were empty at inspection. Screenshots were inspected inline, not saved as image artifacts. Later the page changed to fullscreen/another selection without a corresponding action in this run; further preference restoration was stopped to avoid overriding concurrent activity. Tab 13 and the dedicated preview on 1424 were retained for follow-up (exec session 57601). Do not claim original browser preferences were restored.

## Automated evidence and remaining work

Query regressions cover filtering, stable ties, unknown values and 5000 records. Component regressions cover 50-row pages, sorting, path filtering, selecting into Inspector, coverage warning, shrinking results and empty states. Full verification: typecheck, 218 tests across 44 files, production build passed.

Still open: remove/replace backend truncation with verified native coverage; clarify native metric semantics; benchmark large native tables, assess row movement during live sorting, dedicated inline detail workflow, keyboard/screen-reader audit, persistent workspace view, and safe native process operations. No processes were terminated and no privileged/native commands were added.

## Collaboration

New ProcessExplorer component/CSS and processTable helper are isolated. TopBar gains only the entry and controlled dialog state. Locale JSON files gain a new processList section; preserve the parallel task's theme translations when merging. No App.tsx, shared global CSS, native collector, generated assets or native build outputs were edited. Existing-project design skill guided reuse of theme tokens and typography, semantic controls and explicit empty/error/coverage states rather than a restyle.
