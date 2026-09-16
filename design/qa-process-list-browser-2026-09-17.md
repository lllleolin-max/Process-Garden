# Process list browser check — 2026-09-17

Follow-up: the observed demo "reported by system" wording below has since been
replaced with explicit simulated/not-measured totals and demo-record coverage in
both languages. 490 tests/typecheck/build pass, including requested-native versus
displayed-demo distinction. The following screenshots predate that wording fix;
do not treat them as visual verification of the revised copy.

Source: independent branch 78a83e1, local Vite preview 127.0.0.1:1437.
In-app browser, 1280 × 720 screenshots, demo data. Another task's 1420 tab
was left untouched. No native process actions or synthetic state injection.

Observed through actual UI and accessibility snapshots:

- English Eldritch: opening Processes focuses Filter processes. Typing codex
  narrows the table to the named PID 12010. Tab and Space enable Keep row order;
  its focused border is clearly visible in the captured screenshot. Readings
  continue to update while the filter and fixed-order state remain intact.
- Eight Tab presses from Keep row order reach Inspect codex, PID 12010.
  Return closes the dialog, selects Codex in the scene/Inspector (PID 12010),
  and returns focus to the Processes trigger.
- Switch to Garden and Chinese using the actual theme/language controls.
  Reopening the list preserves the codex filter and focuses it. Appending
  -not-found produces the Chinese empty state with zero matches and disabled
  pagination. The input retains keyboard focus; screenshot shows no clipped
  labels or overlapping controls in this tested layout.
- Escape closes the Chinese dialog and returns focus to the list trigger.

Evidence limitations / remaining gates:

- Screenshots were inspected inline, not exported to a file. This is a focused
  layout/keyboard check, not full reference-image fidelity or contrast analysis.
- Demo returned 20 records with a larger simulated reported count. The existing
  partial-coverage warning was visible, not a measurement of this host's processes.
- A live focused-row departure, native permission failure/recovery, hardware
  30/60/120 pacing, screen-reader speech and long native lists were NOT exercised.
  The removed-row recovery cases still rely on component tests pending native QA.
- Full Task Manager replacement acceptance remains incomplete. Do not use this
  check to mark native telemetry, safe process operations or release readiness done.
