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

## Integration

GardenCanvas.tsx and GardenCanvas.theme.test.tsx also have theme-related edits in the integration worktree. This patch is only in the isolated perf/scene-asset-preparation worktree. Preserve the other task's artwork/loading changes; integrate identity-map and regression hunks deliberately, not by replacing whole files. New processIdentity.ts is required by both Canvas and agentEmbryos.ts. No generated assets, native outputs or release artifacts changed.
