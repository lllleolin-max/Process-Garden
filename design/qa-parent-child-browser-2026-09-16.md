# Parent and child consumption — browser QA

Prototype: http://127.0.0.1:1422/, isolated asset-motion worktree, source af1e532. Requirement: departed processes must visibly be swallowed by the central Eldritch mouth, with their child tasks completing their own exit rather than disappearing abruptly.

## Method

Used the in-app browser at 1280×720, with a 740×422 canvas. A temporary synthetic snapshot contained a codex parent (PID 91001) and one task (PID 91002). Live ingestion was temporarily replaced with a no-op; after generated assets and births settled, both processes were removed together. Canvas images were captured at approximately 0, 800, 1600, 2050 and 2600 ms. An observer around the existing embryo update method recorded positions/opacity without changing its results.

Both the original update method and original application store were restored in a finally block. The temporary fixture was verified undefined; browser warning/error logs were empty. The temporary tab and preview server were closed.

## Observations

- Initial capture: both parent brain and embryo were visible, with their own identity badges and connections.
- 800 ms: central generated maw visibly wide open, teeth and dark throat exposed; parent and embryo still visible along the suction path. Embryo sampled opacity remained 1.
- 1600 ms: actors reached the mouth and were visually occluded by its foreground. At 1618 ms of scene exit time the embryo's model opacity was still approximately 0.932, so screen occlusion was not an early lifecycle deletion.
- 2050 ms: mouth closed back to the core artwork; expanding rings visible. The embryo's opacity was zero at 2083 ms.
- 2600 ms: normal core pose restored with no visible remaining actor. The last recorded embryo pose was at 2319.5 ms before removal (the observer only recorded present nodes).

## Verdict and limits

PASS for the sampled browser parent/child consumption sequence. The large open-mouth visual is present in this branch. No product or artwork change was needed for this case.

This focused test does not certify every frame, rebirth/reparenting, native WebView2, real OS process collection, reference-image fidelity, sustained 120 Hz, or accessibility. Existing high-density performance and native acceptance gates remain open; the full project is not declared complete. Screenshots were inspected inline during QA, not saved as durable image artifacts.
