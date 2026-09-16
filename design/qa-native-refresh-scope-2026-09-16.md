# Native metadata refresh scope

Pinned sysinfo 0.36.1 `System::new_all()` delegates to `RefreshKind::everything`.
This requested process environment, command line and directories at startup
even though ProcessSnapshot did not export those fields. Its Windows process
parameter paths include remote parameter reads. Default `refresh_processes`
also requests disk-usage refresh although the current model does not use it.

SystemCollector now initializes and refreshes with one explicit process profile:
CPU, memory and executable path (OnlyIfNotSet). System CPU baseline is retained;
system memory is refreshed before publishing each snapshot. Process removal and
full enumeration remain enabled. Toolhelp thread counts and power are unchanged.

Tests assert command/environment/cwd/root refresh kinds are Never and unused
disk usage is disabled. The real Windows snapshot regression additionally checks
retained command/environment vectors are empty, while verifying every enumerated
PID is returned with normalized CPU and valid system memory.

This reduces unnecessary collection and API work; it is not a benchmark or a
claim that all transitive native code avoids every memory-related API. Executable
path and icon extraction still need independent API-level privacy review.
Command-line UI remains unimplemented: a deliberate, documented acquisition and
display policy is needed, because arguments may contain secrets. Do not restore
`everything()` to add one future field. Enable and test each required field.
