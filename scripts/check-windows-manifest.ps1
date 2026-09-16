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
$leaf = [regex]::Match($resourceDump.Substring($manifestTable.Index), 'Leaf: Addr: 0x([0-9a-f]+), Size: 0x([0-9a-f]+)', 'IgnoreCase')
$section = [regex]::Match($resourceDump, '(?m)^\s*\d+\s+\.rsrc\s+[0-9a-f]+\s+([0-9a-f]+)\s+[0-9a-f]+\s+([0-9a-f]+)', 'IgnoreCase')
$imageBase = [regex]::Match($resourceDump, '(?m)^ImageBase\s+([0-9a-f]+)', 'IgnoreCase')
if (-not ($leaf.Success -and $section.Success -and $imageBase.Success)) { throw "Cannot locate manifest bytes safely." }
$length = [Convert]::ToInt64($leaf.Groups[2].Value, 16)
$offset = [Convert]::ToInt64($leaf.Groups[1].Value, 16) + [Convert]::ToInt64($imageBase.Groups[1].Value, 16) - [Convert]::ToInt64($section.Groups[1].Value, 16) + [Convert]::ToInt64($section.Groups[2].Value, 16)
$stream = [IO.File]::OpenRead($resolvedExecutable)
try {
  if ($length -le 0 -or $length -gt 65536 -or $offset -lt 0 -or $offset + $length -gt $stream.Length) { throw "Manifest byte range is invalid." }
  $null = $stream.Seek($offset, [IO.SeekOrigin]::Begin)
  $bytes = New-Object byte[] $length
  if ($stream.Read($bytes, 0, $bytes.Length) -ne $length) { throw "Manifest bytes are incomplete." }
} finally { $stream.Dispose() }
$settings = New-Object Xml.XmlReaderSettings
$settings.DtdProcessing = [Xml.DtdProcessing]::Prohibit
$settings.XmlResolver = $null
$reader = [Xml.XmlReader]::Create([IO.StringReader]::new([Text.Encoding]::UTF8.GetString($bytes)), $settings)
try { $manifest = New-Object Xml.XmlDocument; $manifest.XmlResolver = $null; $manifest.Load($reader) } finally { $reader.Dispose() }
$execution = $manifest.SelectSingleNode('//*[local-name()="requestedExecutionLevel"]')
$longPaths = $manifest.SelectSingleNode('//*[local-name()="longPathAware"]')
$controls = $manifest.SelectSingleNode('//*[local-name()="assemblyIdentity" and @name="Microsoft.Windows.Common-Controls"]')
if ($execution.level -ne 'asInvoker' -or $execution.uiAccess -ne 'false' -or $longPaths.InnerText -ne 'true' -or $controls.version -ne '6.0.0.0') {
  throw "Manifest is missing required ordinary-user, long-path or Common Controls v6 settings."
}
Write-Output "PASS: one manifest with asInvoker, longPathAware and Common Controls v6. Native runtime validation is still required."
