# Process event lifetime identity — 2026-09-16

The Canvas and Inspector already separate PID lifetimes, but native event
derivation still matched only PID. If Windows reused a PID between samples,
the event feed omitted both exit and birth and could report a false CPU spike.

Event comparison now uses the shared PID + normalized start-time identity.
Parent association still uses observed parent PIDs because snapshots do not
carry a parent's start time. Existing event ordering and the 24-event per-delta
limit are unchanged; this is a bounded feed, not a complete audit log.

Regression tests cover replacement at the same PID with a CPU jump (birth and
exit, no spike), equivalent seconds/milliseconds timestamps (spike only), and
replacement as a child (spawn and exit). Existing spawn/exit/spike and demo
bucket tests remain in place. The frontend suite passes 222 tests in 44 files.

This change repairs event classification only; it does not independently
validate rendered animations or recover processes born and terminated entirely
between samples. Unknown or identical start timestamps remain ambiguous.
