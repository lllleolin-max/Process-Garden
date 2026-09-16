# Windows service observation

Native acquisition module: `src-tauri/src/services.rs`, with independent bounded
worker and registered `sample_services(session)` desktop command. ServicePanel
is now mounted as an initially collapsed sidebar section.
No start/stop/delete/configure calls, remote host,
administrator request, or executable-path/account enumeration.

Contract: local SCM, SC_MANAGER_ENUMERATE_SERVICE, SERVICE_WIN32 and
SERVICE_STATE_ALL. Each row includes service name (identity), display name, raw
state/type and optional PID. States 4–7 can expose a nonzero PID; stopped,
starting/stopping, unknown states and zero PIDs expose null. This PID is only an
observation, not proof of a process lifetime or authority for destructive actions.

Enumeration uses an aligned 256 KiB buffer and resume handles; at most 64 pages
and 65,536 rows, with a caller-supplied deadline between calls. OS calls themselves
cannot be cancelled by this deadline. The shared worker has a four-second response
timeout and keeps admission held until the provider actually returns; late results
cannot queue extra provider calls. No system collector lock is held. Any native
error, invalid string/count, nonprogressing page, duplicate
identity or exceeded limit returns an error, not a truncated success. UTF-16
strings must terminate within the returned allocation and the string length cap.
SCM handle closes through RAII on every return path.

Important coverage limitation: SCM can silently omit services for which the
caller lacks SERVICE_QUERY_STATUS. Successful enumeration is therefore only
the currently accessible Win32 service set, not guaranteed full-system coverage.
Pages are not an atomic transaction. Kernel drivers are not included in this view.

Sources:
- [EnumServicesStatusExW](https://learn.microsoft.com/en-us/windows/win32/api/winsvc/nf-winsvc-enumservicesstatusexw)
- [QueryServiceStatusEx / PID validity](https://learn.microsoft.com/en-us/windows/win32/api/winsvc/nf-winsvc-queryservicestatusex)

Verification (2026-09-17): three focused unit tests passed; explicit read-only
native probe enumerated 312 accessible Win32 services in 2.8775 ms (one debug
measurement, not a performance guarantee). No names/PIDs were logged. Full native
library suite: 58 passed, 13 ignored; the probe was separately run with --ignored.
The tests do not yet cover all pagination/failure permutations or independent
coverage comparison. The previously built 71cfeb0 EXE predates this module.

Worker verification: invalid-session and blocked-provider timeout tests passed;
explicit native worker returned 312 rows in 2.3372 ms, then a renewed session also
returned rows. Full library suite 60 passed / 14 ignored; compile check passed.
Actual desktop IPC remains unverified: Rust worker tests are not a window test.

Remaining: adversarial pagination fixtures, independent host coverage comparison,
actual IPC validation, bilingual service list/filter/sort and stale-state continuity,
safe PID navigation, explicit permission/coverage disclosure and native UI QA.
Service controls remain a later separately confirmed workflow, not enabled by
this reader. Full task-manager replacement remains incomplete.

Frontend client preparation: strict public-field projection rejects malformed
tables, duplicate case-insensitive identities, invalid u32 fields and non-valid
state/PID combinations. Future state codes are retained with an explicit unknown
label. useServiceReadings reuses the serialized native sampler at 5-second
post-response intervals and history limit 1 (not 36 copies of metadata). Tests
cover errors retaining explicitly stale rows, pause, empty recovery and source
clear. Full frontend verify at client-only checkpoint: 500 tests/typecheck/build.

UI follow-up: ServicePanel mounts the hook only while expanded and windowed;
12-item pages cover all received rows, name/display-name/PID search and name/state
ordering are available. Stable case-insensitive service-name keys retain row DOM
on updates; stale status describes the list and filter focus remains unchanged.
No fake demo services, start/stop buttons or unsafe PID navigation. Both languages
disclose permission omissions, driver exclusion and PID lifetime limitations.
State filtering follow-up: all seven known service states are selectable, with
unknown future codes still visible under All states. Page clamps are committed
after disappearing records so later growth cannot restore an obsolete page.
503 frontend tests/typecheck/build pass. Actual browser layout, native desktop IPC
and real service-state changes remain unverified; component tests use fixtures.

Pagination hardening follow-up: extracted page status and buffer consumption are
now covered by fixtures. Success with a nonzero resume token, ordinary API errors,
MORE_DATA with zero/unchanged token or zero rows fail before buffer consumption.
Multiple distinct pages accumulate; duplicate case-insensitive names cannot
overwrite the earlier row, malformed counts/null strings/empty names fail. The
native 312-row probe still passes (2.9205 ms once/debug). This covers specific
adversarial pages, not every concurrent SCM mutation or production performance.

Cross-language contract: src/tests/fixtures/service-contract.json is synthetic
and contains no host metadata. Rust serialization must equal it exactly; the
frontend parser must accept/project it unchanged. Covers Unicode, empty display
names, maximum u32, unknown states and null PIDs for stopped/starting/zero-PID
cases. Focused Rust contract test, 10 frontend parser tests and typecheck pass.
This verifies the wire shape, not delivery through an actual Tauri window.

Pagination focus follow-up: navigation remains mounted even on a single/empty
page. Edge buttons use aria-disabled plus guarded activation, preserving keyboard
focus if a sample reduces page count. A focused Previous button survives a
three-to-one-page shrink; activating either unavailable edge leaves page 1/1.
Full frontend verify: 504 tests/typecheck/build pass. Actual browser/AT handling
of this focusable disabled-control pattern still needs verification.
