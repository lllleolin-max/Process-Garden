# Per-process thread availability

When Toolhelp has no entry for an enumerated process, the collector previously
published threadCount=0. That can represent a race, unavailable enumeration or
platform capability, not a measured zero. ProcessSnapshot.thread_count is now
optional and absent values are omitted from serialized JSON. Observed counts
remain unchanged. The frontend already models the field as optional, displays
missing values as unavailable/dash, and sorts missing numeric values last.

The serde regression distinguishes missing, observed seven and explicit zero.
All 16 isolated Rust library tests pass, including real native sampling.

Remaining scope: system-wide thread_count still uses the existing sum; explicit
whole-enumeration failure/partial-enumeration reporting is not fixed by this
change. It requires a reliable enumeration-result status and separate total
availability handling. This patch makes no claim about that total.
