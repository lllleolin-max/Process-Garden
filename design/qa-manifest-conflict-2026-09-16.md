# Release manifest conflict diagnosis

Artifact: the 66fd519 Windows executable recorded in qa-release-preflight-2026-09-16.md.
Status: confirmed defect, not repaired or release-approved.

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
