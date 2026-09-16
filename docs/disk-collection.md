# Physical disk monitoring: acquisition foundation

Status: native reader and independent worker verified on this host. The
sample_disks Tauri command and demand-driven frontend panel are connected in code
and component-tested, but packaged IPC/desktop UI has not been exercised. This
does not complete disk monitoring or Task Manager replacement.

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
The frontend now stops demand when hidden/paused/collapsed, ignores obsolete
responses, uses fresh sessions after interruption and represents unavailable/empty/
baseline/live states explicitly. Its request interval is one second after the
previous call completes, independent of animation FPS, with a 5s bridge watchdog.
One outstanding bridge promise is shared across unmount/remount. A stalled IPC
promise is not bypassed by starting overlapping native requests. Ordinary errors
retain their session so an initial invalid PDH rate can warm up on the next sample.

Continue measuring initialization and recurring collection across machines. Keep
provider initialization off the UI thread and outside the existing CPU/process
sampling lock. Maintain failure isolation, bounded admission and idle cleanup.

Still required: desktop IPC and both-theme visual validation, optional
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

## Frontend panel

DiskPanel is initially collapsed below network interfaces. It mounts the demand
hook only when expanded and windowed. All received instances are reachable through
a native select; only the selected disk's three charts are mounted. Activity uses
a fixed 0–100% scale. Read/write values use binary byte units per second. Existing
AnimatedMetric/Sparkline supply shared frame scheduling and reduced-motion rules;
no new artwork is required. Raw PDH instance labels are explicitly identified as
system counter instances, not capacity labels or per-process attribution.

The bridge payload is copied and validated: at most 1024 unique nonempty instance
IDs, no _Total aggregate, finite nonnegative rates, null for unknown and 0–100%
activity. Invalid payloads become error states rather than fabricated readings.
History keeps at most 36 frames; individual series stop at missing/invalid samples.
Session and selection keys prevent cross-source chart interpolation. Failures
clear history. Tests cover 60 reachable disks, stable selection/focus/chart nodes,
zero/empty/baseline/error/partial states and cancellation across visibility changes.
Actual Windows UI, contrast, typography, hardware pacing and manual AT remain open.

### Combined-build and isolation follow-up

The 49c1d81 Windows no-bundle executable builds the reader, worker, command and
panel together; see ../design/qa-release-preflight-2026-09-16.md for its hash and
manifest evidence. It was not executed or installed; UI IPC remains unverified.

Rust library follow-up: 41 passed / 9 ignored. A controlled blocked fake disk
source remains blocked while the real SystemCollector completes a CPU/memory
sample, proving these code paths do not share the disk wait/lock. This is not a
guarantee against arbitrary OS-wide contention or a measurement of total app cost.
An explicitly executed read-only native continuity probe passed eight consecutive
samples at 1.1-second spacing: debug response median 0.391ms, max 0.618ms. Session
renewal also suppressed inherited rates. This short probe is not long-run/device
replacement/sleep/permission validation. Logs:
`%TEMP%/process-garden-disk-isolation-tests.log` and
`%TEMP%/process-garden-disk-continuity-probe.log`.
