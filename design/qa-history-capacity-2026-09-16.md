# Full process history capacity baseline

Synthetic fixture: 1,500 processes, 150 sequential native ingestions, 120 retained
samples. Each observation has distinct process objects; stable names and paths
are reused as JavaScript strings. No private native process information is logged.

`npm test -- src/stores/historyCapacity.test.ts` passed. The oldest retained sample
is observation 31, newest is observation 150; all retained snapshots contain all
1,500 processes. The last process still has an accurate 42-observation chart tail.
Historical memory readings are not mutated by later ingestions.

Measured on this run: 180,000 retained process records; JSON representation
54,608,821 bytes; 150 ingestions took 251.13 ms without UI subscribers. Serialized
size is NOT JS heap size (strings can be shared). This is not a live browser,
installed-app, garbage-collection, long-duration or FPS measurement.

Next optimization candidate: separate numeric historical observations from full
current process metadata. Preserve every current process, lifetime identity,
missing-value semantics, and chart continuity. Avoid claiming a memory leak: the
observed store is bounded, though its retained volume scales with process count.

## Lightweight observations implemented

History now uses SystemObservation with per-process PID, start time, CPU, memory
and optional thread count. Names, executable paths, command lines, status and
other presentation metadata remain available in the complete current snapshot;
they are not duplicated in chart history. Power is copied to avoid mutable aliases.

The same fixture now serializes to 15,815,221 bytes (about 71% smaller). A focused
run ingested 150 samples in 255.40 ms, similar to the earlier 251.13 ms baseline;
no ingestion speedup is claimed. A concurrent full-suite run measured 498.88 ms,
showing why these timings are not a fixed performance threshold.

Full verification passed 248 tests plus typecheck/build. A subsequently added
projection test also passed, covering exact retained fields, zero versus missing
thread count, and non-aliasing. PID lifetime/gap chart tests remain in the suite.
Actual retained heap and installed-app long-run behavior are still unmeasured.
