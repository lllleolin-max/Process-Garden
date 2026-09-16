# Event selection follows lifetime identity

Event derivation already distinguished PID reuse but Timeline still selected
the PID directly. An old exit event could therefore select a different current
process. Native and generated demo events now carry normalized processKey;
initial demo events are enriched from their known process seeds.

Both timeline markers and recent-event buttons resolve that key against the
current table and recheck the latest store at click time. Missing, retired or
legacy unknown lifetimes have aria-disabled=true and do not change selection.
They remain focusable/readable historical records. Pressed state cannot attach
to a replacement PID lifetime. No process-control command is issued here.

Regression cases derive birth/exit for a reused PID, reject the old exit target,
accept the new birth, reject absent/unknown targets, and preserve seeded demo
selection across equivalent seconds/milliseconds start-time representations.
Existing start-time precision/unknown-start limitations remain; this does not
replace native identity revalidation for destructive operations.
