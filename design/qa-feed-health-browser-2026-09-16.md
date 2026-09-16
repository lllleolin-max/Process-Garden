# Feed-health visual QA — NOT READY

## Follow-up: CPU occlusion fixed

The notice now occupies the existing branding slot instead of an absolute
overlay. Original brand children are hidden only while the notice is present.
Full status text remains available to assistive technology and in the title;
overflow is bounded to its own slot. The notice is keyboard-focusable.

Rechecked dedicated browser at 1280×720: Chinese Garden and fully translated
English Eldritch screenshots show the CPU summary unobscured. Measured notice
bounds y=11.11–51.89, header y=0–64, workspace y=64–720. Thus no workspace resize
or overlap is introduced. Fixed Eldritch's inherited brand heading font-size
override; the verified notice heading is 12px. English stalled copy was shortened
without claiming an extra retry. On recovery, notice count is zero, brand mark
display is grid, and workspace top remains 64. Warning/error logs were empty.

`npm run verify`: 231 tests / 45 files, typecheck and production build pass.
Fixture stores and i18next locale were restored and the test tab closed.
This resolves the HIGH CPU-occlusion finding below. Overall health UX still has
open wallpaper, Live-label and narrow-width gates; this is not full app sign-off.

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
