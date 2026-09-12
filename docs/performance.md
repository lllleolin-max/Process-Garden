# Performance model

- One long-lived Rust `System` object is refreshed; the collector is not recreated per tick.
- CPU/memory/process collection defaults to 1 Hz and is configurable from 0.5–5 seconds.
- History is bounded to 120 snapshots and displayed process nodes are ranked and capped.
- Canvas is capped at device pixel ratio 2 and redraws independently from React sampling. Its global 30/60/120 Hz target is paced on `requestAnimationFrame`, so it stays aligned with display vertical refresh and naturally falls back to the monitor's physical maximum.
- `ResizeObserver` resizes only when the canvas container changes.
- Hidden Windowed panels are removed from interaction in fullscreen/wallpaper modes.
- Wallpaper mode uses at most 12 base nodes, reduces particles by 45% and samples no faster than every 2 seconds; it respects the same user-selected animation target as other display modes.
- Executable icons are extracted in a bounded batch on Tauri's blocking worker pool, cached by normalized path (including misses) in Rust, and cached as decoded images in the Canvas layer. Sampling never re-extracts an unchanged icon and first-load Shell work cannot block animation IPC.
- Reduced-motion mode renders one stable frame and CSS animations collapse to near-zero duration.

Release QA watches the app's own CPU/memory footprint in live and wallpaper modes. The monitor must not become a dominant process; future features that require packet capture, GPU vendor SDKs or per-process I/O remain outside v1 until measured.
