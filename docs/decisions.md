# Decisions

## React + Tauri + Rust

React keeps the interface and theme ecosystem straightforward; Tauri supplies a small native boundary without bundling a Node runtime. Rust owns all OS access.

## `sysinfo` as the collector foundation

`sysinfo` is mature, cross-platform and designed for a reused `System` instance. Windows Toolhelp is added only for thread counts missing from the portable contract.

## Canvas 2D over DOM nodes or WebGL

Canvas makes hundreds of particles, glow layers, parent curves and lifecycle effects cheap while preserving deterministic fallbacks. The product does not need a 3D engine in v1.

## WorkerW plugin behind an adapter

`tauri-plugin-wallpaper` 3.0.0 supplies Windows WorkerW attachment. Its small-maintainer risk is contained in `src/platform/wallpaper.ts`; the visual mode still works when attachment fails, and a Rust tray always restores the app.

## Manifest-only custom packages in schema v1

Remote/custom binaries create licensing, font-metadata, zip-bomb and rendering risks. v1 supports complete token authoring and inheritance from audited built-in assets/fonts. A later schema may add signed/validated asset roles without weakening v1 safety.

## Complete offline CJK over a tiny hand-picked subset

Process names are not predictable static copy. Complete Noto SC partitions are shipped so arbitrary Chinese process names do not produce tofu glyphs, accepting a larger installer as the correct privacy/offline tradeoff.

## Stable application ecology with explicit user overrides

Executable names and lightweight command/path hints map processes into application and resource categories, then into a stable visual family. Stable mapping makes a returning application recognizable; a persisted per-application override lets the user pin any application to another family without changing the underlying metrics.

## Agent parent process as brain, child processes as embryos

Known local agents such as Claude, Codex, Trae and WorkBuddy are represented by a theme-specific neural core. Their child processes are grouped with the parent instead of becoming unrelated organisms, and progress through three visual stages based only on process age. This creates a readable lifecycle while preserving the local-only privacy boundary.
