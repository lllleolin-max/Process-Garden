# Complete thread-enumeration semantics

Native follow-up: 17 library tests pass. A direct normal-host Toolhelp check
returned 557 process entries and 10,637 threads; the independent process sample
returned all 559 enumerated processes. These are separate snapshots, so their
process counts are not required to match. SystemSnapshot serde now explicitly
tests that observed total six is preserved and missing total is omitted while
other metrics remain present. This is normal-path and wire-format validation,
not synthetic native failure injection.

UI follow-up: Sidebar component tests verify a missing latest enumeration shows
a dash and an empty SVG polyline, then recovery starts a single-point new tail
rather than connecting to the pre-gap observation. A separately observed zero
still displays zero with a valid chart point. Focused helper/component run:
three tests pass. This verifies rendered DOM/SVG state, not pixel-level motion.

Toolhelp enumeration now returns an optional table. Invalid snapshot handles,
undersized thread entries or enumeration termination other than
ERROR_NO_MORE_FILES yield missing data rather than a partial total. Last error
is captured immediately after the failed traversal call, before CloseHandle.
The entry size is reset before advancing. Unsupported platforms return missing.

Reference: Microsoft Thread32First and Thread32Next documentation:
- https://learn.microsoft.com/en-us/windows/win32/api/tlhelp32/nf-tlhelp32-thread32first
- https://learn.microsoft.com/en-us/windows/win32/api/tlhelp32/nf-tlhelp32-thread32next

Both per-process thread counts and the system total are omitted from JSON when
enumeration is unavailable. SystemSnapshot.threadCount is now optional in TS.
Sidebar displays a dash; its history uses only the contiguous observed tail,
not fabricated zeros or a line spanning missing enumeration samples.

Rust library tests pass on the real Windows host. Frontend regression covers
an internal gap, a missing newest observation, real zero and window bounds.
Error branches were reviewed against the API contract, not exercised via native
fault injection; actual access-failure/partial-walk fault tests remain open.
This supersedes the total-availability limitation in the prior per-process QA.
