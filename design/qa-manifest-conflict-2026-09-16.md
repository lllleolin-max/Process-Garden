# Release manifest conflict diagnosis

Artifact: the 66fd519 Windows executable recorded in qa-release-preflight-2026-09-16.md.
Status: original defect confirmed; project-scoped repair and rebuilt artifact
check now pass (follow-up below). Still not release-approved.

Read-only `objdump -x` found RT_MANIFEST (0x18) with two name entries, both ID 1,
both language 0x409. The resource leaves have sizes 334 and 387 bytes.
Extracting those byte ranges without loading the executable confirms:

- Tauri's generated manifest contains Microsoft.Windows.Common-Controls v6.
- The second manifest contains only longPathAware=true.

Local GCC 16.1.0 WinLibs r3 `-dumpspecs` automatically adds
`%{!shared:%:if-exists(default-manifest.o%s)}` in the endfile specification.
`-print-file-name=default-manifest.o` resolves inside the globally installed
WinLibs directory. GNU ld is 2.46.1. Tauri's build-generated resource.rc accounts
for the first manifest. This explains the linker conflict without attributing it
to the other worktree or to the I/O implementation.

The same toolchain version/conflict is reported in the upstream
[WinLibs issue #299](https://github.com/brechtsanders/winlibs_mingw/issues/299).
Do not remove the global default-manifest object as a project workaround: that
would affect unrelated builds. Do not drop Tauri's Common Controls dependency or
ignore the warning merely to get a clean build log.

Added `scripts/check-windows-manifest.ps1` as a read-only GNU-objdump guard against
missing/duplicate EXE application-manifest entries. It is only a resource-table
check, not XML-semantic validation or a substitute for native runtime acceptance.
Next: choose and verify a project-scoped linker/build solution that produces one
manifest retaining required settings, then rebuild and inspect the result.

## Verified repair

build.rs now uses a single project-owned manifest containing Common Controls v6,
longPathAware=true and requestedExecutionLevel=asInvoker/uiAccess=false. On Windows
GNU, a detected known GCC insertion is removed from an OUT_DIR-only endfile spec
override for the Process Garden executable. All other endfile/CRT objects remain;
MSVC and compilers without the insertion are unchanged. Unknown insertion syntax
is rejected rather than guessed. The approach uses GCC's documented
[spec-file override](https://gcc.gnu.org/onlinedocs/gccint/Spec-Files.html), not a
global compiler modification. Two Rust integration tests validate rule handling.

The first repaired build removed duplication but artifact XML parsing caught an
XML declaration preceded by whitespace added during resource compilation. Removed
that unnecessary declaration from the source manifest, without weakening validation.

Second release rebuild completed in 59.52s without the manifest merge warning.
`check-windows-manifest.ps1` passed on the actual EXE: exactly one ID 1 manifest,
well-formed XML, asInvoker/uiAccess=false, longPathAware and Common Controls v6.
Size: 79,337,786 bytes. SHA256:
`D729206B5CF28D6045D74A4F5BDD6D534E04819709F752B1441A86D3FFE1F26A`.
This supersedes the earlier executable/hash, not the remaining signing, installer,
runtime, visual and full Task Manager capability gates. No app was launched.

## NSIS packaging follow-up

At source commit `65a4c9a`, `tauri build --bundles nsis --ci --no-sign`
completed with locked/offline Cargo dependencies and the isolated
`C:/Users/34178/AppData/Local/ProcessGarden/cargo-target-coverage` target directory.
The installer is `release/bundle/nsis/Process Garden_0.1.0_x64-setup.exe` below
that directory, 60,312,386 bytes, SHA256
`B90CCB6C68D11D59DCDD6038DDD95472C92F7CA742F3392B27B6B4B2481466AF`.
The bundler patched the application with bundle-type metadata; its current SHA256
is `CA733EDF661AF55886F84B66C17C02F380F5F95B133AC651763568C63593BDE4`.
The embedded application manifest check passed again after bundling.

This proves installer generation, not installation or native runtime correctness.
No installer/application was executed, signed, uploaded or published. These are
branch-local test artifacts, not an integrated release containing the other
task's uncommitted changes. Installer/runtime, motion and capability acceptance
remain open. Build log: `%TEMP%/process-garden-nsis-build.log`.
