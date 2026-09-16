# Native sampling cost baseline

## Optimized release baseline

The original isolated release build completed successfully (4m46s first compile)
and ran the same 24-sample test, with 546–549 processes fully preserved:

| Measurement | Median ms | p95 ms | Maximum ms |
| --- | ---: | ---: | ---: |
| Total collection | 167.398 | 183.909 | 208.009 |
| Process refresh | 96.772 | 110.211 | 130.171 |
| Thread enumeration | 70.071 | 79.726 | 80.045 |
| Record conversion / sorting | 0.157 | 0.191 | 0.203 |
| System CPU / memory | 0.909 | 1.327 | 1.416 |
| Power | 0.075 | 0.105 | 0.116 |
| JSON serialization | 0.122 | 0.171 | 0.233 |

Initialization 716.013 ms, payload 115,862–119,220 bytes. These are timings of
read-only collector calls in an optimized test binary, not an installed-app
endurance result. Unlike serialization, native enumeration remains expensive
after optimization. This supports prioritizing enumeration, not a claim of
comparable before/after performance across changing host loads.

Candidate for controlled comparison: PROCESSENTRY32W.cntThreads is documented
by Microsoft as the number of execution threads started by the process:
https://learn.microsoft.com/en-us/windows/win32/api/tlhelp32/ns-tlhelp32-processentry32w
Evaluate process-snapshot counts against thread walking for correctness and
timing before replacing the current path. No replacement has been made yet.

The manual test now prints its actual debug/release profile rather than an
ambiguous reminder to use --release. The baseline above was verified from the
Cargo output's explicit optimized release build and executable path.

## Stage-level follow-up

The same collector pipeline now accepts an internal observer. Production passes
a monomorphized no-op (no clocks or logging); only the manual test records stage
checkpoints. No alternate sampling implementation is used for the measurement.

Debug host run, 24 observations, 561–567 processes:

| Stage | Median ms | p95 ms | Maximum ms |
| --- | ---: | ---: | ---: |
| System lock | 0.003 | 0.005 | 0.005 |
| System CPU / memory | 0.821 | 1.145 | 2.647 |
| Process refresh | 85.596 | 110.828 | 261.912 |
| Thread enumeration | 78.316 | 85.987 | 109.125 |
| Record conversion / sorting | 0.397 | 0.543 | 0.667 |
| Power | 0.081 | 0.100 | 0.101 |

Total collection median/p95/max: 165.716/190.796/372.765 ms. Independent stage
quantiles need not sum to total quantiles. Startup 521.947 ms; serialization
median 3.463 ms; payload 119,475–124,498 bytes. Instrumentation bookkeeping is
excluded from individual stage checkpoints but included in total wall time.

Priority changes with this evidence: profile/compare the native process and
Toolhelp enumeration paths in an optimized build. Sorting/power are not the
dominant costs in this run. Do not silently reduce coverage, reuse stale thread
totals as fresh, or claim the different total median is an optimization gain.

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
