# Native feed failure notice

Native collection rejection now sets session-only acquisition health. Successful
ingestion clears failure and records the sample timestamp. Only an active,
visible, unpaused request may publish either transition, using the same guard
as snapshot ingestion. Explicit demo mode resets health; nothing is persisted.

A dedicated child of TopBar renders a polite bilingual status notice with:

- collection failure and automatic retry wording;
- paused retry wording when the user pauses;
- last successful native timestamp, labelled stale rather than live;
- an explicit no-native-sample statement on initial failure.

The notice reuses existing theme colors and surface treatment, does not take
focus, and does not resize the Canvas. Its success-time selector returns null
while healthy, avoiding successful-sample UI updates. Existing TopBar telemetry
render isolation tests remain green. Translation copy is local to the isolated
component to avoid simultaneous edits to the integration branch locale files.

Validation: `npm run verify` passes 227 tests in 45 files, typecheck and build.
Component tests exercise English initial failure/pause and Chinese stale data,
recovery and demo suppression. Hook regression exercises rejection then native
recovery with health assertions. Browser visual verification is still pending.

Limits: an indefinitely pending native call is not yet detected by a watchdog;
the notice is inside TopBar and therefore is hidden with wallpaper controls.
Existing Live controls describe requested mode and are not yet fully redesigned
around acquisition health. Do not call this complete stale-state coverage or
Task Manager reliability parity. These remain follow-up acceptance gates.
