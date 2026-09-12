# Research: reusable system-monitoring foundations

flow: Local system sampling, process exploration, history visualization, and Windows ambient wallpaper integration.

## Patterns to adopt

- Keep one long-lived sampler instance and refresh it; CPU usage is delta-based and is inaccurate if the collector is recreated every tick.
- Separate collection cadence from render cadence. A 1 s collector does not require a 60 Hz React update; Canvas animation can interpolate independently.
- Search and filtering should include name and PID, with tree/group mode as a distinct view rather than an implicit layout change.
- Persist layout/theme/preferences locally and keep demo data available when native APIs are unavailable.
- Treat true Windows wallpaper attachment as a platform adapter, never as a rendering concern.

## Directly reusable foundations

### sysinfo

Source: https://github.com/GuillaumeGomez/sysinfo

Decision: integrate directly as the primary cross-platform CPU, memory, uptime, PID, parent PID, process start time, and process resource collector.

Why: actively maintained, Windows/macOS/Linux support, Rust-native, and its documented long-lived `System` refresh model fits the required delta pipeline.

Boundary: sysinfo does not make all platform semantics identical. Network ownership, detailed thread counts, command lines, and privileged process fields remain optional platform capabilities.

### tauri-plugin-wallpaper

Source: https://github.com/meslzy/tauri-plugin-wallpaper

Decision: integrate behind a Windows-only `WallpaperAdapter` and pin the dependency after verifying its release. Expose attach/detach/reset without allowing UI code to call Win32 details.

Why: it implements the WorkerW technique required to place a Tauri window behind desktop icons and uses an MIT license.

Risk: the project is small and its own README recommends adapting the underlying Win32 technique for production applications. Keep a clean replacement boundary and always provide safe ambient-window fallback.

## Reference implementations, not wholesale dependencies

### bottom

Source: https://github.com/ClementTsang/bottom

Adopt: stable sampling/history separation, process tree expectations, sorting/search patterns, platform-aware tests, and focus mode.

Do not copy: terminal UI, process-kill behavior, or its complete application model.

### NeoHtop

Source: https://github.com/Abdenasser/neohtop

Adopt: Tauri/Rust split, live search, persistent settings, process-detail modal expectations, and cross-platform packaging lessons.

Do not copy: Svelte-specific frontend or visual design. Process Garden is an ecosystem visualization, not a table-first htop clone.

### HardwareVisualizer

Source: https://github.com/shm11C3/HardwareVisualizer

Adopt: Windows packaging and release QA ideas, real-time dashboard cadence, and optional hardware capability handling.

Do not copy: complete UI or GPU vendor integrations before the CPU/memory/process MVP is stable.

## Candidates rejected for the core

- rust-psutil: its README describes irregular maintenance and its platform support does not satisfy the Windows-first requirement.
- Deep packet inspection stacks: excessive privilege, privacy, dependency, and performance cost for v1. Network activity should begin with interface totals and optional safe platform attribution.
- Full process-management code from other monitors: v1 intentionally excludes process termination.

## Opportunities

- Process Garden can make parent/child activity understandable without exposing users to a dense process table.
- Demo/live parity keeps the application visually testable on CI and on systems with restricted process data.
- A real wallpaper adapter is a meaningful differentiator, provided it can fail back without trapping or hiding the app window.
- Explicit collection-cost metrics can ensure the monitor does not become the busiest organism in its own garden.

