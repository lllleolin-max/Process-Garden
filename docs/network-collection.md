# Network throughput implementation

## Measurement contract

Use Windows IP Helper's read-only interface counters, not process I/O byte counts.
The current native reader returns adapter LUID, display alias, interface type,
operational state and cumulative received/sent bytes with a monotonic observation
time. No packets, remote endpoints, IP/MAC fields or payloads are copied into the
application's result. Aliases stay local and are not logged by the test.

The API includes logical and physical interfaces. Do not sum them into a claimed
Internet total: VPN/virtual/physical paths can represent overlapping traffic.
Expose individual adapters, with their scope and state. LUID is a local runtime
identity, not a cross-installation or durable settings identifier. An interface
index alone is not persistent through disable/enable cycles.

## Native ownership and failures

`GetIfTable2` allocation is released by RAII via `FreeMibTable`. Array traversal
uses the generated Windows C layout, not a hand-assumed header offset. API errors,
null success pointers and implausibly large tables are explicit failures, never
zero readings or silent truncation. Non-Windows platforms return Unsupported.

## Remaining implementation and acceptance

Local Windows evidence (2026-09-16): the read-only native test enumerated 53
interfaces, checked unique LUIDs and bounded alias decoding, and logged only the
count. The full Rust library suite passed 27 tests with 5 manual tests ignored,
using the isolated cargo-target-coverage output directory and locked/offline
dependencies. No deliberate network traffic or configuration change was generated.
This proves enumeration on this host, not rate accuracy or all-platform behavior.

Rate engine follow-up: NetworkRateTracker derives optional per-adapter B/s using
checked u64 differences before f64 conversion and measured Instant gaps. It
rejects zero/backwards/>15-second intervals, failures, duplicate LUIDs, counter
rollback, down/reconnected adapters and interface-type replacement. Removed
interfaces are dropped on snapshot replacement. LUIDs serialize as strings for
JavaScript precision. Unchanged counters give observed zero; first/recovery
observations have null rates. Four new rate tests pass; full Rust regression:
31 passed, 5 manual ignored. This is not controlled-traffic validation.

- Wire the rate engine to native collector/IPC without blocking frontend
  rendering, retaining explicit errors and baseline resets.
- Integrate bounded history and bilingual per-adapter UI with stale/unsupported
  states, pause/visibility handling and the shared motion policy.
- Compare controlled traffic and idle behavior to OS counters, measure overhead,
  and test disconnect/reconnect, VPN, sleep/resume and packaged IPC.
- This adapter counter reader is not process-network attribution, an active
  connections view, packet inspection or completed network-monitoring UI.

## Primary sources

- [GetIfTable2](https://learn.microsoft.com/en-us/windows/win32/api/netioapi/nf-netioapi-getiftable2): interface enumeration, error return and allocation ownership.
- [MIB_IF_ROW2](https://learn.microsoft.com/en-us/windows/win32/api/netioapi/ns-netioapi-mib_if_row2): interface identity, operational state and byte counters.

Merge coordination: add the IpHelper/Ndis feature flags without replacing the
other task's Cargo features; preserve lib.rs command/module changes. No command
registration or system snapshot schema has been changed by this first reader.
