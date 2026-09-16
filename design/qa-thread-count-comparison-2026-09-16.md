# Thread-count source experiment — 2026-09-16

Scope: read-only, optimized Rust library test on this Windows host. No running
application was terminated and no production collector API was replaced.

Command: `cargo test --release --locked --offline --manifest-path src-tauri/Cargo.toml --target-dir C:/Users/34178/AppData/Local/ProcessGarden/cargo-target-coverage --lib compare_thread_count_sources -- --ignored --nocapture`

Twenty pairs alternate process-first and thread-first reads to limit ordering
bias. Process snapshots read PROCESSENTRY32W.cntThreads; thread snapshots count
THREADENTRY32 entries by owner PID. Both require completed enumeration.

| Source | Median ms | P95 ms |
| --- | ---: | ---: |
| Process snapshot | 14.048 | 20.029 |
| Thread enumeration (current production) | 80.312 | 89.055 |

10,977 of 10,986 shared records had equal counts. Current-process counts agreed
in all 20 pairs; two thread-snapshot PIDs were absent from the paired process
snapshot. These are sequential snapshots on a changing machine, so discrepancies
are not proof of either API being wrong. The test reports agreement rather than
asserting equality across the whole live system. Missing current-process entries
are explicitly rejected (two absent entries must never count as agreement).

The process snapshot is a promising optimization, not yet accepted for production.
After adding explicit current-process presence checks, a repeat passed with
process-snapshot median/P95 13.291/15.583 ms and thread-walk 63.479/66.036 ms.
11,015 of 11,020 shared counts agreed, current-process agreement remained 20/20,
and no thread PID was missing from the paired process snapshot in this run.

Before replacement, add a controlled thread-lifetime fixture, inspect system/PID 0
coverage and failure semantics, and rerun the complete native suite and end-to-end
sampling profile. This timing does not establish application CPU usage or frame rate.

API contract: https://learn.microsoft.com/en-us/windows/win32/api/tlhelp32/ns-tlhelp32-processentry32w

## Controlled lifetime fixture

`process_snapshot_tracks_controlled_thread_lifetimes` runs alone with
`--ignored --test-threads=1 --nocapture`. Eight test-owned threads signal readiness,
then block on channels. After observation, dropping the channels releases them;
all are joined before the final count. No unrelated process is manipulated.
Both API sources reported 5 before, 13 while workers were alive, and 5 after
joining. Exact +8 and return-to-baseline assertions passed in the release build.
The test is ignored in the concurrent suite because unrelated test-runner thread
lifetimes would invalidate exact current-process deltas. Shared snapshot-reading
code is reused by the timing experiment and this fixture.

The complete release library suite also passed: 17 passed, 3 manual tests ignored.
System/PID 0 coverage and production error-path validation remain outstanding;
this fixture does not establish parity across protected/system processes.

## Production switch and follow-up

Subsequent coverage inspection found PID 0 = 48 and PID 4 = 461 in both sources.
The process snapshot included two zero-thread processes absent from thread-owner
enumeration; total threads agreed (10,360 on the first coverage run). These zeroes
are real observations and are retained, unlike absent/failed values.

Production now reads PROCESSENTRY32W.cntThreads. The old thread walk is compiled
only for tests. Invalid snapshot handles and non-ERROR_NO_MORE_FILES enumeration
failures return None; partial maps are discarded and the handle is closed before
return. This preserves the existing unknown-value contract. Error handling was
code-reviewed, not verified by injected Windows failures.

Post-switch release suite: 17 passed, 4 manual tests ignored. Explicitly running
all four manual tests serially also passed. The controlled fixture still observed
5 -> 13 -> 5. Coverage repeated with both totals at 10,253 and the same PID 0/4
counts. The same-run paired benchmark measured process-snapshot median/P95
12.635/13.975 ms versus old thread-walk 59.725/62.656 ms.

Complete production pipeline (24 samples, 544 processes returned in each):

| Stage | Median ms | P95 ms |
| --- | ---: | ---: |
| Collection | 67.955 | 81.465 |
| Process refresh | 54.857 | 67.062 |
| Thread counts | 12.028 | 13.338 |
| Serialization | 0.106 | 0.142 |

Earlier release collection measured 167.398 ms median, but process refresh also
fell from 96.772 to 54.857 ms as host conditions changed. Do not attribute the
entire end-to-end difference to this patch. Neither run proves installed-app
CPU overhead, wallpaper behavior, or animation frame rate. Native snapshot and
sysinfo reads remain sequential, not an atomic whole-system observation.
