param([Parameter(Mandatory = $true)][string]$Executable)
$ErrorActionPreference = "Stop"

# Read-only release guard. Requires GNU objdump; does not load or execute the app.
$resolvedExecutable = (Resolve-Path -LiteralPath $Executable).Path
if (-not (Test-Path -LiteralPath $resolvedExecutable -PathType Leaf)) {
  throw "Expected an executable file."
}
$dumpTool = (Get-Command objdump -ErrorAction Stop).Source
$resourceDump = (& $dumpTool -x $resolvedExecutable 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0) { throw "objdump could not inspect executable resources." }
$manifestTable = [regex]::Match($resourceDump,
  'Entry: ID: 0x000018, [^\r\n]+\r?\n\s*[0-9a-f]+\s+Name Table: [^\r\n]*Num Names: (\d+), IDs: (\d+)\r?\n\s*[0-9a-f]+\s+Entry: ID: 0x([0-9a-f]+),',
  [Text.RegularExpressions.RegexOptions]::IgnoreCase)
if (-not $manifestTable.Success) { throw "Application manifest resource could not be verified; do not approve this artifact." }
$namedEntries = [int]$manifestTable.Groups[1].Value
$idEntries = [int]$manifestTable.Groups[2].Value
$firstId = [Convert]::ToInt32($manifestTable.Groups[3].Value, 16)
if ($namedEntries -ne 0 -or $idEntries -ne 1 -or $firstId -ne 1) {
  throw "Invalid EXE manifest table: named=$namedEntries IDs=$idEntries firstID=$firstId. Expected one application manifest (ID 1)."
}
Write-Output "PASS: one application manifest resource (ID 1). XML semantics and runtime behavior still require validation."
