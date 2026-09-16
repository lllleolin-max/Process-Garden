# Windows release preflight — 2026-09-16

Source: isolated asset-motion worktree, code commit 66fd519.
Verdict: NOT READY for release or Task Manager replacement acceptance.

## Verified

- `npm run verify`: 326 tests passed; TypeScript and Vite production build passed.
- Tauri CLI release build with `--no-bundle --ci`, locked/offline Cargo and the
  isolated `cargo-target-coverage` directory completed successfully in 2m 15s.
- Tauri's before-build step targets Chrome 105 through TAURI_ENV_PLATFORM, unlike
  the ordinary Vite preflight's Safari 13 target. Different hashes/sizes are
  therefore expected. Verified the resulting worktree JS contains the I/O command,
  logical CPU panel and absolute CPU scale; compiler logs identify this worktree.
- Local executable: `C:/Users/34178/AppData/Local/ProcessGarden/cargo-target-coverage/release/process-garden.exe`
- Size: 79,337,804 bytes.
- SHA256: `A2EE5C824BFEBBC5CB998D254E1827B27EE471EB4C8CD02F07DBCA49A11D543D`
- Authenticode inspection reports NotSigned. No signing, installation, execution,
  GitHub release publication or shared-worktree modifications were performed.

## Required follow-up

### Superseding network + table-motion rebuild at 3623cfe

The isolated branch now builds the network collector and row-order/numeric-motion
changes together. `tauri build --no-bundle --ci -- --locked --offline`, using
`cargo-target-coverage`, completed successfully; release compilation took 1m 21s.
Frontend production bundling also completed. Current executable size: 79,393,675
bytes; SHA256: `08A9944175883CB4D1F62709BC041542B5C714DE6F53AA91C492DB4D36A30686`.
Read-only signature inspection: NotSigned. Actual embedded manifest guard: PASS
(one application manifest, asInvoker, longPathAware, Common Controls v6).
This replaces the earlier EXE/hash at the same local path, not the old NSIS
installer. No program execution, installation, signing or release publication.
Log: `%TEMP%/process-garden-network-motion-native-build.log`. Runtime network IPC,
visual/performance, wallpaper and full Task Manager acceptance remain unverified.

### Superseding rebuild at ecd8534

The isolated worktree was rebuilt using `tauri build --no-bundle --ci` with
locked/offline Cargo dependencies and the `cargo-target-coverage` directory.
Release compilation completed in 50.01 seconds after frontend bundling. The
current EXE at the path above is 79,339,468 bytes, SHA256
`1CE94E911BCB6D3BA412893FBE9381FF4ACBF7253E08BCBECF577B0208DA2658`.
Read-only Authenticode inspection reports NotSigned. The actual embedded manifest
validator passes (single manifest, asInvoker, longPathAware, Common Controls v6).
This supersedes the original EXE/hash and closes the original manifest warning
listed below; see the separate manifest diagnosis for the project-scoped repair.
The previously generated NSIS installer was not rebuilt in this run and does not
contain these latest frontend changes. No EXE/installer execution, installation,
signing or release publication occurred. Log: `%TEMP%/process-garden-current-native-build.log`.
Runtime/visual/performance and complete capability acceptance remain open.

1. Investigate the GNU linker warning: `.rsrc merge failure: multiple non-default
   manifests`. A successful exit code is not proof of a correct embedded manifest.
2. Validate actual packaged command invocation, selected-process I/O, permissions,
   lifetime rejection and failure recovery. Unit tests do not validate IPC/desktop UI.
3. Both-theme screenshots, native 30/60/120 pacing, wallpaper behavior and sustained
   overhead checks remain open. Previous browser-service failures are not visual passes.
4. Produce and validate installers separately; `--no-bundle` only built an executable.
5. Signing and the full Task Manager capability matrix remain outstanding.

Transient build logs: `%TEMP%/process-garden-release-preflight.log` and
`%TEMP%/process-garden-release-build.log`. The executable is not committed to Git.
