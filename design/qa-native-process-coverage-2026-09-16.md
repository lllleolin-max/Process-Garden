# Native process coverage beyond 500

Requirement: process records must not silently disappear because an ecological presentation budget was applied to native telemetry.

Removed collector.rs's unconditional truncate(500). Resource sorting remains unchanged, and ecological node caps / 50-row explorer pages still bound rendering separately. The reported process count continues to come from the same refreshed sysinfo table; it is not rewritten to hide missing rows.

## Direct Windows evidence

Ran `cargo test --locked --offline --manifest-path src-tauri/Cargo.toml --target-dir C:/Users/34178/AppData/Local/ProcessGarden/cargo-target-coverage --lib collector::tests::samples_real_system_data -- --nocapture` in the isolated asset-motion worktree.

The regression checks both returned count and exact sorted PID set against that collector's locked sysinfo enumeration. Actual output: **566 enumerated, 566 returned**. The test passed in 1.37 seconds after the isolated dependency build. This is a real run above the old cap, not only a synthetic fixture. No process names, paths or command lines were printed by this added diagnostic.

A frontend component regression supplies 1500 records, verifies 50 rendered data rows and 30 pages, filters for the last executable, and selects PID 1500 into Inspector. This verifies no extra frontend cap is introduced, but is not a 1500-live-process native performance benchmark.

Full follow-up verification passed: all 13 Rust library tests (including real Windows icon extraction and read-only power sampling), frontend typecheck, 219 tests across 44 files, and production frontend build. The existing process-explorer head 8fc9857 also had successful GitHub CI before this change; CI for this new change must be checked separately after push.

## Limits and coordination

- The comparison proves preservation of this sysinfo enumeration; it does not independently prove coverage beyond Windows permissions, detect every short-lived process between samples, or compare every field against Windows Task Manager.
- No packaged application/installer was rebuilt or launched. Native CPU normalization, IPC throughput, large-history memory use and integrated WebView2 performance remain separate gates.
- Shared Cargo.toml/lib.rs/termination.rs edits owned by the parallel task were not touched. The explicit isolated target directory avoids the shared cargo-target path used by scripts/tauri.ps1.
- Build-generated schema files had no semantic diff and are not part of the feature change.
- Process termination, priority changes, privilege escalation and registry operations were not performed.
