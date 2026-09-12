# Architecture

## Runtime boundaries

The frontend is React 19 + TypeScript + Vite. It owns layout, theme tokens, localization, interaction, a bounded history buffer and Canvas rendering. Zustand is the single application state boundary.

The native layer is a small Tauri 2 / Rust process collector. It owns OS access and returns a stable camelCase `SystemSnapshot`; it never sends UI concepts into Rust. `sysinfo::System` is stored behind one `Mutex` and reused across samples so delta-based CPU values remain meaningful. Windows thread counts are gathered with one Toolhelp snapshot and joined by PID.

## Data flow

`SystemSnapshot.power` carries `{ watts: number | null, source: "battery" | "intel" | "unavailable" }`. The Windows power collector reads battery discharge first, then supported Intel Level Zero Sysman package energy deltas. It keeps separate shared sampling state; power failures never fail the process snapshot. The frontend uses a separate `"demo"` source only for explicitly selected demo data, clears unavailable/stale readings, and charts only the uninterrupted tail of the current source. See [power.md](power.md) for measurement boundaries.

1. `useSystemFeed` samples at the user-selected cadence.
2. Tauri invokes `sample_system`; browser builds use deterministic demo snapshots.
3. The store appends at most 120 snapshots and derives native birth, spawn, exit and CPU-spike events from consecutive process maps.
4. `useProcessIcons` resolves each executable identity through the native icon cache, then an offline brand catalog, then initials. The cache is memory-only and the executable icon wins in every theme.
5. React renders cards and details; Canvas reads the same immutable snapshot and animates between sample ticks.
6. Wallpaper mode reduces its process limit, particle budget and native sample cadence. The user-selected 30/60/120 Hz animation target remains global.

## Ecology semantics

`src/ecology/organisms.ts` is the single classification registry. It maps known application families (browser, editor, runtime, database, container, media, system and AI Agent) to eight theme-independent organism styles. Unknown high-CPU/high-thread processes become compute constructs; remaining unknowns use the adaptive family. Names are normalized so `chrome` and `chrome.exe` share one identity.

User overrides are stored as a validated `process name → organism style` map. They replace only automatic visual classification and never affect collection or process behavior. The semantic style is then resolved to a Garden or Eldritch sprite/procedural representation.

Claude, Codex, Trae, WorkBuddy/Workbudy and other registered Agent names resolve to the Agent neural core. Direct child processes are grouped under that Agent rather than duplicated as ordinary nodes. Their real start times select seeded, neural-formation or near-hatching embryo artwork. The UI does not claim access to private prompt/task content.

The Garden visual base adds two deterministic sprite variants per non-Agent semantic family. Habitat plates are composited below relationship curves, while small pollinator sprites move above the process layer. These decorative layers share the ambient-particle toggle and use a reduced count in wallpaper mode so additional richness does not change the underlying data contract or collection cost.

## Platform adapters

- `src/platform/display.ts` isolates browser/Tauri fullscreen differences.
- `src/platform/wallpaper.ts` isolates the Windows-only community plugin. Any failure leaves the app in a usable ambient fullscreen preview.
- The Rust tray can detach wallpaper and focus the main window even if the embedded window cannot receive keyboard focus.

## Privacy boundary

Only local CPU, memory, PID, parent PID, process name, executable path, start time, uptime, thread counts and scoped power readings cross the Rust/JS boundary. Windows Shell extracts the executable's own icon once per unique path and returns an in-memory PNG data URL; it never reads executable code or arbitrary file content. There is no HTTP client, analytics SDK, account system, remote font, packet inspection or process-content access.
