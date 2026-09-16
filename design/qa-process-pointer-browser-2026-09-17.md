# Process list pointer / pagination browser verification

Source: c4a34c7, isolated asset-motion worktree, localhost:1437.
2026-09-17; Codex in-app browser tab 20; Garden, English, demo data,
1280 x 720. Other task's tab 19 / port 1420 was not operated.

## Observed

- Opened Processes and filtered `chrome` through the actual UI.
- Clicked Inspect chrome, PID 5521. Modal closed, inspector showed chrome and
  PID 5521, and accessibility focus returned to the Processes trigger.
- Reopened list: chrome filter retained and input focused.
- Ten Tab presses reached unavailable Previous. Enter retained Page 1 of 1
  and Previous focus. Tab then Enter on unavailable Next also retained Page 1
  of 1 and Next focus. Accessibility tree exposed both as disabled.
- Screenshot showed the Next focus outline, intact one-row layout and the
  explicit simulated-total/not-measured coverage copy. Screenshot was inspected
  inline, not exported as a repository artifact.

## Limits / remaining acceptance

This proves ordinary browser pointer navigation still works after the press-target
guard and boundary pagination remains keyboard accessible. It does not reproduce
the sampling-between-press-and-release race (covered by component tests), native
IPC, touch cancellation, screen-reader speech, multi-page native count collapse,
other theme/language combinations or physical 30/60/120 Hz frame performance.
No destructive process action was performed. Full replacement/release acceptance
remains incomplete. Preview left with chrome filter and Next focused for follow-up.
