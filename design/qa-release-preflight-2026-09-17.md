# Windows build evidence — 2026-09-17

Verdict: BUILD VERIFIED, NOT RELEASE READY. This is the isolated PR #7 branch,
not the other task's uncommitted theme/termination integration worktree.

- Code source: `073820b` on `perf/scene-asset-preparation`.
- Frontend: 479 tests, typecheck and production build passed.
- Most recent native suite: 55 passed / 12 ignored; explicit DXGI and GPU worker
  probes passed separately. Ignored tests are not automatically counted as passes.
- Command: `npm exec -- tauri build --no-bundle --ci -- --locked --offline`.
- Isolated target: `C:/Users/34178/AppData/Local/ProcessGarden/cargo-target-coverage`.
- Release build completed successfully in 3m 30s; build log:
  `%TEMP%/process-garden-gpu-retention-native-build.log`.

## Actual executable

Path: `C:/Users/34178/AppData/Local/ProcessGarden/cargo-target-coverage/release/process-garden.exe`

- Bytes: 79,712,629.
- SHA256: `9028219DC69DD48A70B82D1FCAF77303C065AE731863A403216A0F768A94173F`.
- Authenticode: NotSigned.
- Actual PE resource inspection via `scripts/check-windows-manifest.ps1` passed:
  exactly one manifest, asInvoker, longPathAware, Common Controls v6.

This rebuild includes GPU PDH acquisition/grouping, bounded shared worker logic,
DXGI device labels, demand-driven panel and explicitly stale retained layouts.
It supersedes the prior 49c1d81 executable evidence at this same target path.
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
