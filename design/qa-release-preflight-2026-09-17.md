# Windows build evidence — 2026-09-17

Verdict: BUILD VERIFIED, NOT RELEASE READY. This is the isolated PR #7 branch,
not the other task's uncommitted theme/termination integration worktree.

- Code source: `71cfeb0` on `perf/scene-asset-preparation`.
- Frontend: 490 tests, typecheck and production build passed.
- Most recent native suite: 55 passed / 12 ignored; explicit DXGI and GPU worker
  probes passed separately. Ignored tests are not automatically counted as passes.
- Command: `npm exec -- tauri build --no-bundle --ci -- --locked --offline`.
- Isolated target: `C:/Users/34178/AppData/Local/ProcessGarden/cargo-target-coverage`.
- Release build completed successfully in 47.69s; build log:
  `%TEMP%/process-garden-latest-motion-native-build.log`.

## Actual executable

Path: `C:/Users/34178/AppData/Local/ProcessGarden/cargo-target-coverage/release/process-garden.exe`

- Bytes: 79,714,212.
- SHA256: `A1A178E9EE81EAA359D77F437189CC07C4EACB5DA2E261818188135ED03FD5DB`.
- Authenticode: NotSigned.
- Actual PE resource inspection via `scripts/check-windows-manifest.ps1` passed:
  exactly one manifest, asInvoker, longPathAware, Common Controls v6.

This rebuild includes GPU PDH acquisition/grouping, bounded shared worker logic,
DXGI device labels, demand-driven panel and explicitly stale retained layouts.
It also includes network/process-I/O retention, immediate OS reduced-motion
response, safe process-list focus recovery, demo count disclosures and stale CPU
animation cancellation. It supersedes the prior 073820b executable at this path.
It does not update or validate the old NSIS installer. No installation, signing,
release publication or executable launch was performed in this check.

## Remaining acceptance

- Integration task's uncommitted changes and controlled safe-process operations.
- Actual packaged IPC and GPU/disk failure/recovery UI, names and hotplug.
- Controlled workload numerical parity, full adapter identity coverage, process GPU.
- Actual 30/60/120 frame pacing, long-run overhead, manual AT and theme fidelity.
- Wallpaper behavior, installation/update/signing and other Task Manager workflows.

See `../docs/task-manager-replacement.md` for the unchanged full objective; these
build/test results do not establish complete Task Manager replacement.
