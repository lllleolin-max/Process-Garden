# Physical disk monitoring: acquisition foundation

Status: native reader and independent worker verified on this host. The
sample_disks Tauri command is registered and compile-checked, but the frontend/UI
is not connected and packaged IPC has not been exercised. This does not complete
disk monitoring or Task Manager replacement.

## Why a dedicated reader

The pinned sysinfo 0.36.1 Windows disk implementation retains old I/O counters
when its device query fails; refresh_specifics still returns true. Consequently,
its public disk delta alone cannot distinguish a fresh idle sample from failure.
It also enumerates mounted volumes, not the physical-device view needed here.
This was verified in the locally installed version's src/windows/disk.rs.

Use existing windows-sys 0.61 PDH bindings instead of adding a new dependency:
language-neutral PhysicalDisk wildcard counters for Disk Read Bytes/sec, Disk
Write Bytes/sec and % Idle Time. Formatted arrays intentionally retain the
wildcard handle; this is not individual counter registration via expanded paths.

## Data contract

- Local performance-counter instances only; omit _Total to avoid aggregate/device
  double counting. Instance names are session-local labels, not permanent hardware
  IDs. Do not persist them as trusted disk identities across sessions/replacement.
- Read/write units are bytes per second. Activity is 100 minus valid idle percent;
  no fabricated transfer-capacity percentage or summation of read/write durations.
- Query errors are Result errors. Individual unavailable counters are null; real
  zero stays zero. Both PDH return status and each item's CStatus are checked.
- First sample, failed-collection recovery and gaps over 15 seconds suppress all
  rates until a contiguous sample exists. PDH owns rate calculation; no arbitrary
  configured sampling interval is used as the elapsed measurement time.
- No user files, content, serial numbers, remote machine names or packet data are
  collected. No privilege elevation, counter repair/registration, disk writes or
  IOCTL_DISK_PERFORMANCE enabling/disabling is performed.
- Query ownership closes all counter handles. Counter arrays use aligned buffers,
  4 MiB limits, bounded UTF-16 names, duplicate rejection and at most three sizing
  attempts. Each retry starts with a fresh zero-size query per Microsoft's contract.

## Integration gates

`disk_worker::DiskReader` owns one worker thread; the source and all PDH handles
are created, used and dropped on that thread. No unsafe Send impl is required.
The application manages one shared reader and exposes `sample_disks({ session })`.
Sessions must be 1–128 ASCII alphanumeric/hyphen/underscore characters; a changed
session creates a fresh counter baseline. Opening failures back off for 5 seconds,
even if session tokens change. No query is opened merely by starting the worker.

One atomic admission permit covers both queued and active work. A caller waits at
most 4 seconds; if the provider is still running, subsequent calls fail busy rather
than starting new workers or accumulating requests. A timeout cannot cancel a
blocked OS provider call safely, so a truly hung call leaves this one worker busy.
Expired requests are skipped before collection, and expiry is checked again after
provider initialization. Late responses are discarded by the closed reply channel.
After 15 seconds without requests, the worker drops its query and blocks without
polling; dropping all reader handles lets it exit once any active provider returns.

The worker and Tauri bridge do not use SystemCollector or its CPU/process lock.
The frontend must still stop demand when hidden/paused/collapsed, ignore obsolete
responses, use fresh sessions after interruption and represent unavailable/empty/
baseline/live states honestly. That frontend integration is still outstanding.

Continue measuring initialization and recurring collection across machines. Keep
provider initialization off the UI thread and outside the existing CPU/process
sampling lock. Maintain failure isolation, bounded admission and idle cleanup.

Still required: desktop IPC validation, frontend schema/UI/history integration, optional
capacity/volume mapping, device-change continuity, disabled-counter and permission
tests, controlled workload comparison, sustained overhead, native wallpaper and
both-theme visual verification. Provider-instance reuse cannot currently be
treated as a verified physical-device identity.

## Primary references

- [Pinned sysinfo source](https://docs.rs/crate/sysinfo/0.36.1/source/src/windows/disk.rs)
- [Language-neutral counter registration](https://learn.microsoft.com/en-us/windows/win32/api/pdh/nf-pdh-pdhaddenglishcounterw)
- [Formatted wildcard arrays and two-sample rate example](https://learn.microsoft.com/en-us/windows/win32/api/pdh/nf-pdh-pdhgetformattedcounterarrayw)
- [Microsoft performance-counter troubleshooting](https://learn.microsoft.com/en-us/troubleshoot/windows-server/performance/troubleshoot-performance-problems-in-windows)

The SDK constant PDH_FMT_NOCAP100 (0x00008000) is missing from windows-sys 0.61's
generated constants. Its value was checked against the installed compiler's pdh.h;
it is set explicitly so formatting does not cap counter values at 100.

## Evidence — 2026-09-16

- Initial reader library suite: 35 passed, 7 ignored. The ignored tests were not
  counted as passing; the disk probe was explicitly run separately and passed.
- Read-only native probe: one physical-disk instance, valid second-sample read and
  write rates, no _Total row, first-sample rates suppressed, activity validated
  when present. No synthetic user-file workload or counter configuration changes.
- Debug build, this host, one observation: opening the PDH query took 601.352 ms;
  second collect + array formatting took 0.399 ms after a 1.1-second interval.
  These are not a latency distribution, release benchmark or device-wide guarantee.
  The initialization cost confirms it must not run under the CPU/process lock.
- Logs: `%TEMP%/process-garden-disk-reader-tests.log` and
  `%TEMP%/process-garden-disk-native-probe.log`. Logged counts/timing, not instance names.

Independent worker follow-up: Rust library now 40 passed / 8 ignored; non-test
`cargo check --locked --offline` passed, including Tauri state/command registration.
The explicit native worker probe passed separately: one disk; first response
433.069ms, second response 0.563ms (debug, single observation after 1.1 seconds).
Tests verify single-flight ownership past caller timeout, invalid session rejection,
idle release, drop shutdown, expired queued work and 100 immediate sequential calls.
Logs: `%TEMP%/process-garden-disk-worker-tests.log`,
`%TEMP%/process-garden-disk-worker-check.log`, and
`%TEMP%/process-garden-disk-worker-probe.log`. This does not prove UI invocation,
native frame pacing, a latency distribution or behavior on other devices.
