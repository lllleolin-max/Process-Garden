# Main process lifetime identity

## Defect and change

Main Canvas actors were stored by PID alone. A replacement process with the same PID and a new start time therefore reused the old actor and skipped its independent exit/birth. Embryos already distinguished lifetimes.

Main actors now use the same normalized PID/start-time identity as embryos. The identity implementation is shared, including Unix second/millisecond normalization. Label state uses that normalized key too. Current parent lookup resolves the current lifetime; retiring parent nodes remain available for existing withdrawal connections when no live parent exists. Retiring agents are excluded from the live embryo-parent map.

## Verification

- Canvas integration regressions for both Garden and Eldritch mount an old process, replace it with a different start time at the same PID, and assert old and new labels coexist during transition, with only the new label remaining after settlement.
- Identity unit regression distinguishes reused PIDs but equates second/millisecond representations.
- Existing 12 embryo lifecycle tests remain passing.
- Full local verification: typecheck, 197 tests across 37 files, production build passed.

This is code and simulated Canvas evidence. No new browser/native visual acceptance or FPS claim is made. The preceding browser parent/child capture used af1e532 and must not be presented as visual verification of this later patch.

## Browser follow-up on 2c5b67d

Actual in-app browser check at 1280×720, 740×422 Canvas, target 60 Hz: a settled synthetic chrome process was replaced by python at the same PID (91001) with a start time 1000 ms later. Performed independently in Garden and Eldritch; ingestion was temporarily disabled and restored afterward.

- Garden old label alpha: 0.87998 at 8.9 ms to 0.001155 at 222.4 ms. New label alpha: 0.01206 at 8.9 ms to 0.87987 at 2625.3 ms.
- Eldritch old label alpha: 0.87998 at 10.5 ms to 0.001188 at 222.9 ms. New label alpha: 0.01206 at 10.5 ms to 0.87987 at 2627.6 ms.
- Inspected real Canvas captures at 800 and 2600 ms for each theme. Eldritch's 800 ms frame shows distinct incoming/outgoing actors with their Chrome/Python identity badges and the central maw wide open. Final captures contain the Python actor and the resting core, with no remaining Chrome actor. Garden's intermediate actors overlap spatially; its final frame also contains only Python.
- Browser warning/error logs were empty. The fillText observer and original store were restored; temporary result handles, tab and preview server were removed. No production instrumentation was added.

The first combined observation exceeded the command response timeout. Its observer was confirmed still active, then confirmed restored before a new run was started with an explicit retained result handle; the values above come from that completed second run. No timeout was treated as process termination.

PASS for this sampled browser PID-reuse transition. Captures were inspected inline, not saved as durable artifacts. Native acceptance, high-density timing and exhaustive per-frame visual validation remain open.

## Integration

GardenCanvas.tsx and GardenCanvas.theme.test.tsx also have theme-related edits in the integration worktree. This patch is only in the isolated perf/scene-asset-preparation worktree. Preserve the other task's artwork/loading changes; integrate identity-map and regression hunks deliberately, not by replacing whole files. New processIdentity.ts is required by both Canvas and agentEmbryos.ts. No generated assets, native outputs or release artifacts changed.
