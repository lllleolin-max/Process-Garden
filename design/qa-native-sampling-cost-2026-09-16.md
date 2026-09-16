# Native sampling cost baseline

Host-dependent manual test `collector::tests::profile_native_sampling_cost` is
ignored in ordinary CI. It warms a long-lived collector, collects 24 complete
snapshots with 250 ms idle between calls, and separately times serde JSON
serialization. It prints counts, durations and payload sizes only, not process
names/paths or payload contents. There is no machine-dependent pass threshold.

Final local run (debug/unoptimized build, 2026-09-16):

| Metric | Result |
| --- | --- |
| Collector initialization | 574.179 ms |
| Collection median / p95 / maximum | 170.890 / 186.488 / 191.550 ms |
| JSON serialization median / p95 / maximum | 3.672 / 4.136 / 4.281 ms |
| Enumerated and returned processes | 568–575, equal on every sample |
| Serialized snapshot size | 121,321–126,121 bytes |

Median averages the two central observations; p95 is nearest-rank (23rd of 24).
Sampling continues to preserve all enumerated records. An earlier exploratory
run had lower collection timings, so host contention must be controlled before
claiming a before/after performance gain.

## Interpretation and next measurement

This is wall-clock latency, not CPU time, frontend FPS or release acceptance.
Collection runs off the UI path, but these durations are large enough to warrant
stage-level profiling. Separate CPU/memory refresh, process refresh, Toolhelp,
sorting and power sampling before changing algorithms. Repeat with optimized
builds and actual windowed/wallpaper steady-state behavior. The test does not
measure IPC transfer/JS decoding, retained-history memory, GPU work or long-run
stability. No "lightweight" or 120 Hz claim follows from this test passing.

Reproduce with the isolated Cargo target and:
`cargo test --lib profile_native_sampling_cost -- --ignored --nocapture`.
Keep another task's app and build artifacts untouched.
