# Performance model

- One long-lived Rust `System` object is refreshed; the collector is not recreated per tick.
- The sampling command uses Tauri's blocking worker pool. Cloned collectors share the same mutex, process history and CPU baseline; process enumeration cannot block the native UI event loop.
- CPU/memory/process collection defaults to 1 Hz and is configurable from 0.5–5 seconds.
- History is bounded to 120 snapshots and displayed process nodes are ranked and capped.
- Canvas is capped at device pixel ratio 2 and redraws independently from React sampling. Its global 30/60/120 Hz target is paced on `requestAnimationFrame`, so it stays aligned with display vertical refresh and naturally falls back to the monitor's physical maximum.
- `ResizeObserver` resizes only when the canvas container changes.
- Hidden Windowed panels are removed from interaction in fullscreen/wallpaper modes.
- Wallpaper mode uses at most 12 base nodes, reduces particles by 45% and samples no faster than every 2 seconds; it respects the same user-selected animation target as other display modes.
- Executable icons are extracted in a bounded batch on Tauri's blocking worker pool, cached by normalized path (including misses) in Rust, and cached as decoded images in the Canvas layer. Sampling never re-extracts an unchanged icon and first-load Shell work cannot block animation IPC.
- Reduced-motion mode renders a stable frame on data, preference, asset or viewport changes; it does not keep an idle animation loop. Paused and hidden scenes stop scheduling continuous frames, then resume without consuming elapsed wall time.
- Both theme families load their own four-cell habitat and fauna atlases once through the existing decoded-sprite cache. The ambient switch fades particles, habitats and fauna together; off layers stop drawing after settling. Paused/reduced-motion setting changes settle immediately without adding a render loop. Wallpaper limits fauna to three rather than four. The new Eldritch atlases add 2.77 MiB of PNG data (roughly 12 MiB of decoded bitmap content before browser overhead), not per-sample allocations.
- Node separation runs when the population or viewport changes. The frame loop only interpolates the cached targets; focus labels reserve space first and draw last.
- Small resource charts interpolate within 420 ms after a sample without per-frame React renders. They stop on pause, reduced motion, hidden tabs and presentation modes. Memory bars animate with a transform.
- Native sampling is serialized, including while settings change. Hidden or paused collectors discard late results. Icon results are cached independently of component cleanup so a resource sample cannot invalidate a pending icon request.
- Chart/history/event clocks follow accepted snapshots. Paused timelines keep their event positions even when settings or selection changes rerender the UI.
- Agent child actors are persistent and limited to three per parent (two in wallpaper mode), including retiring actors. Reconciliation happens on accepted process/parent/layout/focus changes; pose interpolation uses the existing Canvas clock. Retiring slots finish before pending children enter, bounding rapid churn. Stage crossfades use the existing generated atlas without per-sample image decoding.
- The generated central maw's black matte is converted to alpha once at load and cached with the other core bitmaps. Its 1254×1254 RGBA backing store is approximately 6 MiB before browser overhead; no per-frame pixel readback or processing is used in production.

Release QA watches the app's own CPU/memory footprint in live and wallpaper modes. The monitor must not become a dominant process; future features that require packet capture, GPU vendor SDKs or per-process I/O remain outside v1 until measured.
