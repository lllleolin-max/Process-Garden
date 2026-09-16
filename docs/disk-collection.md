# Physical disk monitoring: acquisition foundation

Status: native reader verified on this host, not yet connected to the live collector
or UI. This does not complete disk monitoring or Task Manager replacement.

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

Measure initialization and recurring collection before choosing a background
scheduling policy. Do not place unmeasured provider initialization on the UI thread
or under the existing CPU/process sampling lock. Keep failures independent of
other metrics; bound retries/backoff; close the query when monitoring stops.

Still required: background ownership, IPC/schema/UI/history integration, optional
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

- Rust library suite: 35 passed, 7 ignored. The ignored tests were not counted as
  passing; the disk probe was then explicitly run separately and passed.
- Read-only native probe: one physical-disk instance, valid second-sample read and
  write rates, no _Total row, first-sample rates suppressed, activity validated
  when present. No synthetic user-file workload or counter configuration changes.
- Debug build, this host, one observation: opening the PDH query took 601.352 ms;
  second collect + array formatting took 0.399 ms after a 1.1-second interval.
  These are not a latency distribution, release benchmark or device-wide guarantee.
  The initialization cost confirms it must not run under the CPU/process lock.
- Logs: `%TEMP%/process-garden-disk-reader-tests.log` and
  `%TEMP%/process-garden-disk-native-probe.log`. Logged counts/timing, not instance names.
