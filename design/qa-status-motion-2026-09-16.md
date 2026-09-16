# Status motion reflects acquisition state

The existing global CSS already pauses the status breathing animation and theme
preview orbit when paused, and reduces CSS animations when reduced-motion is
requested. However, the toolbar dot remained green and breathing on native
sampling failure even after its text correctly said Stale data.

TopBar now exposes an explicit observation state. Only healthy, unpaused native
acquisition uses the breathing dot. Demo uses a static muted dot, while paused
or stale observations use a static warning dot without the old green glow.
Failure and recovery update the state without restarting the feed or Canvas.
Status text and accessible pause/resume actions remain independent of color.

The component regression exercises demo → native → failure → pause → recovery,
checking state attributes and stale text. The existing Profiler regression
continues to ensure 20 telemetry-only updates do not commit TopBar renders.
This is a CSS state correction; runtime pseudo-element computed-style and
reduced-motion visual checks remain separate acceptance work.
