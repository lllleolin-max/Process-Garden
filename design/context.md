# Context

## Current objective supersedes the original v1 exclusions

The user now requires a complete Task Manager alternative, including safe process
operations and native wallpaper behavior; the original v1 non-goals below are
historical planning context, not acceptance limits for the current goal.

Logical CPU panel brief (2026-09-16): help identify single-thread saturation that
the total CPU percentage hides. Reuse existing theme tokens and curves, fixed
0–100% scales, bilingual labels, honest unavailable/stale states. Assumption:
an initially collapsed sidebar section preserves the reference composition;
paginate eight logical processors at a time to bound active curves. Success:
every received processor is reachable, zero differs from unavailable, closed
content has no chart animation, and telemetry updates preserve navigation.
Risk: sampler order is not a stable hardware ID; same-count topology replacement
cannot currently be detected. Native desktop and both-theme visual QA remain required.

goal: Build Process Garden v2 as a polished Windows-first desktop product that turns live process activity into a legible, living ecosystem across windowed, fullscreen, and ambient wallpaper experiences.

user: Developers, power users, creative technologists, and showcase audiences who want system monitoring to feel expressive without losing factual clarity.

JTBD: Understand what the computer is doing at a glance, inspect a process when needed, and switch into an ambient or presentation experience without learning a conventional monitoring dashboard.

constraints:
- Stack: Tauri 2, Rust, React, TypeScript, Vite, Zustand, Canvas/Pixi-compatible rendering.
- Platform: Windows 11 MVP; architecture must remain portable.
- Local-first: no account, telemetry, cloud dependency, or user system data sent to image generation.
- Generated-asset fidelity: theme-defining focal subjects must use integrated image-generation assets; procedural Canvas is reserved for motion, deformation, particles, trails and lighting rather than final placeholder artwork.
- Visual direction: the provided Garden and Eldritch references are authoritative mood and composition references.
- Accessibility: keyboard access, reduced motion, high contrast, bilingual labels, readable metrics.
- Localization: complete en-US and zh-CN flows with offline fonts and no runtime cloud translation.
- Themes: Garden and Eldritch are built in; custom themes use a validated, versioned manifest and safe local assets.

success:
- The application builds and launches as a Windows desktop app.
- The primary window communicates CPU, memory, process count, selected process detail, ecosystem relationships, and recent events in under five seconds.
- Theme and language switches apply instantly without reload and persist locally.
- Windowed, fullscreen, and wallpaper/ambient layouts are meaningfully distinct but share one rendering and data core.
- Demo mode remains visually compelling without system permissions; live mode uses real local process data.
- Critical UI paths have automated tests and the release build completes without errors.
- Screenshots in both themes are strong enough for the README and product showcase.

scope v1:
- Windowed app, fullscreen presentation/monitor modes, ambient wallpaper mode.
- Garden and Eldritch visual systems.
- Safe Add Theme editor plus import/export/delete for local custom themes.
- en-US and zh-CN.
- Offline, licensed Garden/Eldritch font roles and CJK fallbacks.
- Demo data and real local process/CPU/memory collection.
- Search, selection, inspector, timeline, pause/resume, density controls, reduced motion.
- Tests, docs, CI configuration, screenshots, and installer-ready build configuration.

non-goals:
- Account, cloud sync, telemetry, remote monitoring, mobile clients.
- Online theme marketplace or execution of theme scripts.
- Process termination controls in v1.
- Complex 3D engine, AI diagnosis, or reading process memory/file contents.
- OS-level replacement of the Windows desktop shell; wallpaper mode ships as a low-interference ambient window foundation.

open assumptions:
- The two provided reference PNGs may be used as design references and repository showcase assets.
- A polished Canvas 2D implementation is preferable to adding WebGL complexity unless profiling proves otherwise.
- A safe ambient/window mode is acceptable for v1 where native WorkerW wallpaper attachment would create platform-specific release risk.

risks:
- Full CJK fonts increase installer size; lazy font loading and audited subsets must preserve full required glyph coverage.
- Real process sampling and renderer updates can contend for resources; delta updates and adaptive frame rates are required.
- Imported themes are untrusted data and require path, file type, schema, and size validation.
- AI-generated raster art can reduce legibility; generated layers must remain subordinate to data and have deterministic fallbacks.
