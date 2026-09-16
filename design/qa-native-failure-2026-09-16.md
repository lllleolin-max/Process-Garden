# Native collection failure integrity

Previously a rejected `sample_system` request fell through to `makeDemoSnapshot`,
replacing the real process table, history source and lifecycle events with demo
telemetry. A subsequent successful retry switched everything back. This could
also cause a whole-scene lifecycle transition unrelated to actual processes.

The native error branch now returns without ingestion. The existing finally
block schedules the next attempt, preserving single-flight behavior. Explicit
demo mode and browser-only preview behavior are unchanged. Native failure does
not modify the last snapshot, its timestamp, history, events or collector label.

The regression test rejects one request, checks all these retained references,
advances the sampling interval, then resolves a real replacement request and
checks recovery. Existing pause, visibility, unmount and preference-change race
tests continue to cover the sampling lifecycle.

## Remaining UX gate

Retaining old data is not the same as live monitoring. A visible stale/error
state and age of last successful native observation are still required before
claiming task-manager-grade reliability. On initial native failure, the existing
initial/demo snapshot remains labelled as such; this fix does not relabel it as
native. No automatic privilege escalation or replacement data is introduced.
