# Canvas icon replacement

Requirement: organisms show their application's icon without a loading-time blank.

The Canvas image cache previously skipped every key already present. The icon store writes offline fallback artwork first and may later replace it with a native executable icon at the same path key; the Canvas therefore could permanently retain the fallback even though the dock updated.

ProcessIconImages now tracks requested content, preserves the previous ready image while a replacement loads, and publishes the replacement only on load. Late callbacks are guarded by entry identity. Failed loads retain the prior ready image. Explicit null removes the image. The cache belongs to the Canvas component and detaches pending handlers on unmount instead of retaining module-global image state.

Four regression cases cover fallback-to-native replacement/deduplication, a queued stale callback, failure then recovery, and removal/unmount invalidation. Existing native icon collection and Canvas tests also pass. This is an image-cache correctness fix, not a claim of icon crossfade or native visual acceptance; no artwork was generated or altered.

Integration touches GardenCanvas's icon-cache import/state/effect, plus the new processIconImages module and test. Preserve the parallel task's scene artwork/theme changes when merging. Shared worktree/native binaries were not modified.

## DOM icon failure follow-up

The separate ProcessIcon component (dock/inspector/task details) had no image error handler. Two new regressions failed on the old implementation because an undecodable image remained mounted instead of showing the existing initials fallback. It now remembers the failed source, displays initials, and retries automatically when different icon data arrives; unrelated store updates do not retry the known broken source. Image elements are keyed by source so a replacement has its own load/error lifecycle. The decorative aria-hidden wrapper is preserved; this is not a full accessibility audit.

Local verification after the behavior change: typecheck, 203 tests across 39 files, production build passed. Native icon-cache commit 7f63f3c also passed GitHub CI. This follow-up changes ProcessIcon.tsx and its dedicated test, not theme styles or generated artwork. Browser/native failure-state screenshots were not captured.
