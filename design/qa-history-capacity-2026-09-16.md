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
