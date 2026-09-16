# Canvas icon replacement

Requirement: organisms show their application's icon without a loading-time blank.

The Canvas image cache previously skipped every key already present. The icon store writes offline fallback artwork first and may later replace it with a native executable icon at the same path key; the Canvas therefore could permanently retain the fallback even though the dock updated.

ProcessIconImages now tracks requested content, preserves the previous ready image while a replacement loads, and publishes the replacement only on load. Late callbacks are guarded by entry identity. Failed loads retain the prior ready image. Explicit null removes the image. The cache belongs to the Canvas component and detaches pending handlers on unmount instead of retaining module-global image state.

Four regression cases cover fallback-to-native replacement/deduplication, a queued stale callback, failure then recovery, and removal/unmount invalidation. Existing native icon collection and Canvas tests also pass. This is an image-cache correctness fix, not a claim of icon crossfade or native visual acceptance; no artwork was generated or altered.

Integration touches GardenCanvas's icon-cache import/state/effect, plus the new processIconImages module and test. Preserve the parallel task's scene artwork/theme changes when merging. Shared worktree/native binaries were not modified.
