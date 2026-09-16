# GPU monitoring: raw acquisition foundation

Status: local PDH reader, identity parsing, per-engine experimental observation
grouping and independent worker pass host probes. The `sample_gpu({ session })`
Tauri command is registered and compile-checked, but actual desktop IPC and the
frontend are not exercised/connected yet. No validated overall GPU percentage;
GPU monitoring and Task Manager replacement are not done.

## Independent worker and bridge

`gpu/worker.rs` owns one GPU provider thread, separate from CPU/process and disk
sampling. `provider_worker.rs` now shares the existing disk admission, timeout,
deadline, idle-release and channel logic; disk and GPU each create their own worker.
Native query handles are constructed/used/dropped on the owning thread, with no
unsafe Send assertion. Initial construction does not open counters or auto-poll.

One request may be queued/in flight; caller timeout is 4 seconds and does not
release admission while native work continues. Closed-channel replies are dropped,
expired requests are rejected before collection and after native initialization.
15 seconds idle closes the query and waits without polling. A truly hung provider
cannot be safely cancelled and keeps only its own worker busy, not other providers.
Opening failures back off 5 seconds, including when callers change session tokens.

Sessions are 1–128 ASCII alphanumeric/hyphen/underscore characters. A changed
session reopens counters and returns an explicit `rateBaseline: true`. This flag
also applies to cold/recovery/long-gap raw rate observations. PDH may omit the
entire rate counter on its initial observation; that is not an observed zero.
Baseline suppresses engine sums without erasing instantaneous memory readings.
Once a contiguous observation exists, `rateBaseline` is false; per-counter and
per-engine coverage still determines whether an individual value is available.

Worker evidence: 52 Rust library tests passed / 11 manual probes ignored; locked,
offline non-test cargo check passed. A blocked GPU fixture remains busy after the
caller times out while real SystemCollector and an independent provider complete.
The fixture is deliberately non-Send, verifying thread-local source construction.
Existing disk concurrency/timeout/idle/expiry tests pass after extraction; native
disk worker probe also passes (one instance, second response 0.355ms).

The GPU native worker probe checks cold baseline, four contiguous readings, a
renewed-session baseline and that the renewed session then warms up. This is a
short read-only debug probe, not long-run overhead or controlled workload parity.
Frontend demand/cancellation/history and real packaged IPC remain integration gates.

## Current implementation

`gpu.rs` opens language-neutral local wildcard counters for GPU Engine utilization
and GPU Adapter Memory Dedicated/Shared Usage. It returns separate raw instance
maps. Failure of a counter is null; a successful empty map and an observed zero
remain different. It does not sum adapters, processes or engine categories.

Rate observations are suppressed for the first sample and after collection failure
or a gap over 15 seconds. Memory counters are usage gauges and do not require an
invented rate baseline. Query ownership closes all counter handles; no unsafe Send
implementation, privilege elevation, driver setting changes or counter repair.

The disk reader's validated PDH array routine has moved to
`performance_counters.rs` and is shared by disk and GPU. The existing 4 MiB buffer
bound, alignment, per-item status checks, bounded UTF-16 identities, duplicate
rejection and fresh size queries on buffer races are retained. It uses NOCAP100
and preserves raw observations, rather than concealing an unexplained value by
silently clamping it. GPU instance names may include PIDs and adapter identities;
keep them local and do not use a PID alone as process-lifetime attribution.

## Aggregation and integration gates

`gpu/grouping.rs` creates ordered adapter/physical/engine observations. It sums
only distinct process samples within one engine, not across engines/adapters.
The field is deliberately `observedPercentSum`, not a Task Manager parity claim.
Missing/invalid samples, normalized duplicate PID-engine identities, conflicting
type labels, an out-of-range sum or any unmapped engine record suppress the sum
to null. Genuine zero is preserved; no clamping or missing-value zero filling.
Each engine includes coverage diagnostics; over-range sums have a separate flag.
The adapter key retains both LUID components and physical index. PIDs are used
locally to detect duplicates and are not present in the grouped serialized output.

Dedicated/shared memory observations are joined by the same adapter identity.
Missing counter, empty successful map, missing adapter field, invalid observation
and duplicate normalized identity remain distinguishable through counter-level
coverage and per-field sample counts. Duplicate memory records are never summed.
`_Total` records are counted separately, never synthesized into a device. Unknown
formats remain counted; raw input maps are not mutated or discarded by grouping.

2026-09-16 grouping evidence: 50 Rust library tests passed / 10 manual probes
ignored, non-test cargo check passed. Explicit host probe: 700 records, 3 provider
adapter identities and 31 engine groups, zero duplicate identities/type conflicts,
zero unavailable or out-of-range sums. Adapter-identity counts are NOT physical
GPU enumeration. Query open 372.856ms, second collect/format 1.423ms (single debug
sample, excluding grouping). Controlled GPU workload parity remains unverified.

Independent implementation reference (reviewed, not copied):
[System Informer counter processing](https://github.com/winsiderss/systeminformer/blob/master/plugins/ExtendedTools/counters.c)
groups engine totals by adapter and engine. Our PDH reader, full LUID/physical key,
unknown-value handling and validation differ; this reference is not a parity test.

Identity parsing now separates session-local LUID high/low components, physical
index, engine ID, PID and optional engine type. Numeric components are bounded
unsigned integers; malformed names, `_Total` and duplicate suffixes are rejected.
Hexadecimal case/padding normalizes through integer parsing. Type labels can have
underscores. An empty type label is **unknown**, not an invalid engine identity:
the host probe initially rejected 210 of 700 records for this reason. After making
type optional, all 700 engine and both sets of 3 memory instances parsed. This
observed grammar is not a guarantee for every driver. Raw maps remain intact;
the parser itself does not perform aggregation or process-lifetime attribution.

Identity validation evidence: 44 Rust library tests passed, 10 manual probes
ignored by default; explicit GPU probe passed with zero unmapped records and
locked/offline non-test cargo check passed. Single debug probe open 386.591ms,
second collect/format 1.867ms. No instance identities or PIDs were logged.

Microsoft describes Task Manager's overall GPU percentage as the busiest engine,
not the sum of independent engines. That rule does not itself prove how to group
the raw per-process/context PDH instances. Required before a total-usage display:

- Parse and validate instance identities; distinguish adapter LUID, physical index,
  engine ID/type and process scope. Unknown formats must not be silently grouped.
- Identify aggregate instances, duplicates, virtual/software adapters and engines
  sharing hardware. Validate aggregation against controlled workloads and Windows.
- Map to real adapter names/capacity with verified device identities; do not call
  the number of returned memory-counter instances the number of installed GPUs.
- Validate the registered worker/IPC path in the desktop runtime; provider
  initialization is independent of CPU/process locks and the UI thread.
- Add frontend schema/history validation, adapter/engine views and per-process lifetime
  safety. Handle unsupported drivers, hotplug, sleep and provider failures honestly.
- Verify overhead, both-theme visuals, actual frame pacing and native UI behavior.

## Evidence — 2026-09-16

- Rust library: 42 passed / 10 ignored. Non-test locked/offline cargo check passed.
- Explicit GPU native probe passed: 700 engine instances, 3 dedicated-memory and
  3 shared-memory instances. These are counter-instance counts, not GPU counts.
- Debug single observation: query open 494.246ms; next collect/format 1.409ms after
  1.1 seconds. No aggregation or controlled GPU workload was performed. This is
  not a performance distribution or proof of Task Manager numerical parity.
- After shared-reader extraction, the existing native disk probe also passed:
  one physical disk; second collect/format 0.379ms. Disk semantics are unchanged.
- Logs: `%TEMP%/process-garden-gpu-reader-tests.log`,
  `%TEMP%/process-garden-gpu-native-probe.log`,
  `%TEMP%/process-garden-gpu-reader-check.log`, and
  `%TEMP%/process-garden-shared-pdh-disk-probe.log`. No instance names/PIDs logged.

## Primary references

- [Microsoft: GPUs in Task Manager](https://devblogs.microsoft.com/directx/gpus-in-the-task-manager/)
- [Language-neutral PDH registration](https://learn.microsoft.com/en-us/windows/win32/api/pdh/nf-pdh-pdhaddenglishcounterw)
- [Wildcard formatted arrays](https://learn.microsoft.com/en-us/windows/win32/api/pdh/nf-pdh-pdhgetformattedcounterarrayw)

Counter path availability above was verified on this host, not assumed to exist
on every Windows installation. The official blog's indexed excerpt confirms the
busiest-engine rule; fetching the complete article returned HTTP 403 in this run.
