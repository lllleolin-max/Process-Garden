# Windows service observation

Initial native acquisition module: `src-tauri/src/services.rs`. Not yet exposed
as a desktop command or UI. No start/stop/delete/configure calls, remote host,
administrator request, or executable-path/account enumeration.

Contract: local SCM, SC_MANAGER_ENUMERATE_SERVICE, SERVICE_WIN32 and
SERVICE_STATE_ALL. Each row includes service name (identity), display name, raw
state/type and optional PID. States 4–7 can expose a nonzero PID; stopped,
starting/stopping, unknown states and zero PIDs expose null. This PID is only an
observation, not proof of a process lifetime or authority for destructive actions.

Enumeration uses an aligned 256 KiB buffer and resume handles; at most 64 pages
and 65,536 rows, with a caller-supplied deadline between calls. OS calls themselves
cannot be cancelled by this deadline. A bounded worker is required before IPC/UI
exposure. Any native error, invalid string/count, nonprogressing page, duplicate
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

Remaining: adversarial pagination fixtures, independent host coverage comparison,
bounded worker/IPC, bilingual service list/filter/sort and stale-state continuity,
safe PID navigation, explicit permission/coverage disclosure and native UI QA.
Service controls remain a later separately confirmed workflow, not enabled by
this reader. Full task-manager replacement remains incomplete.
