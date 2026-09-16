# Feed-health visual QA — NOT READY

Prototype: isolated Vite preview at `http://127.0.0.1:1426/`, commit b1fa717.
Source: failure-state requirements in qa-feed-health-notice-2026-09-16.md and
the task-manager goal: stale telemetry must be distinguishable without hiding
the monitoring information needed to diagnose it.

## Browser observations

At 1280×720 in Garden, screenshots were inspected for English stalled/stale
state and Chinese initial failure/paused retry. Fixture state was injected only
into this dedicated preview tab; this was UI-state QA, not an actual native
collector failure. English fixture changed the notice locale only; surrounding
i18next labels remained Chinese, so full English-layout conformance is unproven.

- PASS: complete notice text was readable with theme-derived colors.
- PASS: English pending wording does not claim a retry has been issued.
- PASS: Chinese initial failure explicitly says native data has not arrived.
- PASS: clearing failure removed the notice (DOM count zero).
- PASS: captured browser warning/error log list was empty.
- HIGH / FIX: both notices cover the CPU summary at the upper left. The current
  absolute overlay meets visibility but violates non-obstructive monitoring.
  Replace it with an integrated status area; do not merely move the overlay
  onto another metric or hide it automatically while data remains stale.
- OPEN: wallpaper status is hidden with TopBar, existing Live labels remain
  misleading during acquisition failure, and narrower widths need verification.
- Manual screen-reader and contrast testing were not performed.

Verdict: NOT READY for failure-state visual acceptance. The independent feed
integrity and watchdog fixes remain useful, but do not justify accepting this
placement. Temporary store fixtures were restored, the dedicated tab was closed,
and no shared browser tab or other task's server was changed.
