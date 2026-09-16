# Complete thread-enumeration semantics

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
