# Observation status labels

TopBar sampling status, ProcessExplorer source caption and Sidebar process/thread
details now share a status selector. It describes the displayed collector rather
than requested demoMode: demo remains Demo (including initial native failure),
paused observations are Paused, native acquisition failure/stall is Stale data,
and only healthy unpaused native observations use Live. Native failure takes
precedence over pause so stale data does not lose its warning.

The separate data-source toggle now says Native / 本机, not Live / 实时. Its
pressed state and requested source behavior are unchanged. The pause button
retains Resume wording when paused and its original action accessibility label.

The hook subscribes only to collector, pause, locale and failure booleans, not
snapshot timestamps, avoiding a render on every successful sample. Unit cases
cover demo, demo pause, native pause, native error, paused native error, recovery
and initial failure with a still-demo snapshot. Shared theme/locales/store files
were not edited. This is a text/status correction, not new telemetry.

Outstanding: wallpaper status and responsive visual review of longer status
strings. This does not mark the whole monitoring UI or Task Manager parity done.
