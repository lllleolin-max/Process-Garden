# Process I/O collection decision — 2026-09-16

Status: rate-conversion core, on-demand Windows query, desktop command bridge and
Inspector frontend connected in source; packaged runtime and visual acceptance
remain open. This is process I/O, not physical-disk telemetry.

Inspector overview now mounts ProcessIo for the selected lifetime. useProcessIo
queries only native/windowed/visible/unpaused state, one request at a time across
selection/remounts, one second after the previous response. A five-second watchdog
clears stalled readings without launching overlapping work; late responses are
discarded. Pause/hide/reopen/selection changes get fresh sessions. Normal query
failures retain the native session's pinned identity while clearing displayed
rates/history. Invalid payloads are not displayed. History is bounded to 36 samples.
English/Chinese states distinguish baseline, live, paused, unavailable and error.

Frontend verification: full npm verify passed 316 tests, typecheck and build;
an additional focused stalled-request regression subsequently passed (five hook
tests total). Native command behavior and actual rendered data still need a
packaged integration check; mocked invokes do not substitute for that gate.

`sample_process_io` accepts `pid`, Unix-seconds `startedAt` and a nonempty session
string of at most 64 bytes. It returns null while establishing a baseline, rates
in camelCase once two valid samples exist, or an error. The reader keeps only one
active target/session and shares state across worker clones. Reopening/changing
session resets its baseline; intervals over 15 seconds reset rather than average
across a pause. Failure clears rate history but preserves the exact creation token.
The frontend must use a new session after pause/hide/reopen and discard late results.

Initial identity matching is limited to the snapshot's seconds-resolution start
time; after that exact FILETIME ticks are pinned. Same-second PID reuse before
the first successful query cannot be ruled out by the current snapshot schema.
This is read-only telemetry, not authorization for process operations.

The Windows query opens one handle with PROCESS_QUERY_LIMITED_INFORMATION and
reads creation FILETIME plus I/O counters from that handle. Optional exact
creation tokens reject a changed lifetime. Handles close through Drop, including
all failure paths. API failures return errors rather than cached/zero samples.
The command integration passes failures to `IoRateTracker::observe(None)` and
resets target/session baselines; the frontend must also clear failed displayed rates.
No process memory is read and no privileges are changed.

Primary API contracts:
[GetProcessIoCounters](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-getprocessiocounters),
[GetProcessTimes](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getprocesstimes).

`src-tauri/src/process_io.rs` now provides a bounded, single-target rate tracker.
Six tests cover measured intervals, failed-observation recovery, idle zero,
PID/lifetime changes, long gaps, counter rollback, non-increasing timestamps and
small deltas near u64::MAX. Rust library validation passed 23 tests; four existing
manual profiling tests remain intentionally ignored in the default run. This
does not establish native handle/query correctness or real I/O measurement yet.

Follow-up validation: the Windows query now passes a real own-process read,
matching exact-lifetime read, incorrect-token rejection and PID 0 error test.
The complete Rust library suite passed 24 tests with four manual tests ignored.
Controlled file-I/O deltas, fault injection and query-overhead profiling are still
required; own-process reads alone do not prove disk measurement equivalence.

Controlled fixture follow-up (Windows, debug test binary, 2026-09-16): an isolated
manual test wrote and read back a 256 KiB create-new temporary file. Observed
write/read deltas were each 262,144 bytes. DELETE_ON_CLOSE removed the fixture
and the test asserted its absence. It then measured 128 own-process read-only
queries: median 0.0014 ms, p95 0.0015 ms. This establishes one controlled process
I/O path, not physical-disk throughput, cross-process overhead, failure injection
or a production performance guarantee. The test is ignored by default because
live process-wide counters must be measured without concurrent tests.

Reproduce: `cargo test --locked --offline --lib process_io::tests::controlled_file_io_and_query_cost -- --ignored --exact --test-threads=1 --nocapture`
(run from src-tauri, with an isolated target directory for concurrent work).

## Verified local dependency behavior

The installed sysinfo 0.36.1 Windows implementation uses GetProcessIoCounters
in `src/windows/process.rs:update_disk_usage` (around line 1086). It updates
old/current byte totals only on success. Missing handles or failed calls retain
the previous fields. `disk_usage()` (around line 428) computes saturating deltas
from those fields without exposing the latest refresh's success state.

Consequences for this application:

- An initial failure can look like observed zero.
- A later failure can repeat an earlier nonzero delta.
- A baseline taken as zero can turn lifetime totals into an initial spike.
- Blindly dividing by the configured interval is wrong across delayed sampling,
  pause/resume, and failures.

Do not enable `with_disk_usage()` and present its output as verified live rates
without resolving these cases. Existing narrow refresh behavior remains intact.

## Required contract for the next implementation

Use an explicit successful observation containing a process lifetime identity,
monotonic sample time and cumulative read/write counters. Unavailable observations
must carry failure state, not invented zero. Validate the lifetime from the same
native process handle used for counters. Do not request elevation automatically.

Rates require two successful, consecutive observations of the same lifetime and
a positive measured elapsed duration. First samples, counter rollback, failed
queries, restarts and long gaps reset the baseline. On recovery, show unavailable
until another successful sample establishes a fresh interval. Keep 64-bit counter
subtraction native before conversion to frontend floating-point rates.

Label these as process I/O, not physical-disk throughput. Microsoft's
[IO_COUNTERS documentation](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-io_counters)
defines process/job I/O accounting and read/write transferred-byte totals; this
does not establish a disk-only scope or equivalence to Task Manager's disk column.
A physical-disk page needs a separately verified device-counter source.

## Efficiency and coordination gates

Compare selected-process/on-demand collection against a full-table pass before
choosing cadence. Measure handle/query overhead on the same host and workload;
do not add a second full process scan by default. The shared integration task is
editing lib.rs and process operations: coordinate command registration and native
handle lifetime checks through PR #7 before integration, without replacing its
uncommitted work.

Acceptance tests: observed zero, increasing counters, first sample, permission
failure, recovery, PID reuse, decreasing counters, delayed intervals, pause/resume,
large u64 counters, controlled temporary-file I/O and idle overhead. No process
I/O collection or disk-rate UI is claimed complete by this research.
