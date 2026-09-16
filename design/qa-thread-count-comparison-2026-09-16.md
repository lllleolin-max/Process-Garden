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
