# Inspector history work bounds

Inspector renders 42 observations but previously searched all 120 retained
snapshots on every component render, then discarded the older results. With
the complete native process table this could scan up to 120 × process-count
records for a single visible process.

The helper now accepts a maximum observation count. Inspector requests 42,
memoizes by history, selected record and tab, and skips chart derivation outside
the overview tab. PID comparison precedes timestamp identity construction so
unrelated process records do not allocate identity strings. Retained store
history, chart geometry and PID-lifetime/gap semantics are unchanged.

A regression fixture throws if an older, out-of-window snapshot is read,
proving the scan stops after 42 observations rather than slicing afterwards.
Zero-window and bounded missing-observation tests accompany the existing
lifetime and timestamp-unit cases. This demonstrates a work bound, not a
measured FPS improvement. Worst-case visible-window lookup is still linear in
42 × process count; total retained history memory remains a separate concern.
