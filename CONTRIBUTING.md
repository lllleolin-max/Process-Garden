# Contributing

Run `npm ci` and `npm run verify` before opening a change. Native changes must also pass `cargo test --lib` and `cargo check` in `src-tauri`.

Keep user-visible text in both i18n catalogs, preserve theme manifest compatibility, and document new OS data fields and privacy implications. Do not add telemetry, remote fonts, theme scripts, process-control actions or unbounded history.

Generated assets require a prompt record in `docs/assets.md`, an explicit theme role, a deterministic fallback and a real consuming code path.
