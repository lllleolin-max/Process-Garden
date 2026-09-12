param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$TauriArgs
)

$ErrorActionPreference = "Stop"
$cargoTarget = Join-Path $env:LOCALAPPDATA "ProcessGarden\cargo-target"
New-Item -ItemType Directory -Force -Path $cargoTarget | Out-Null
$env:CARGO_TARGET_DIR = $cargoTarget

$projectRoot = Split-Path -Parent $PSScriptRoot
$driveName = @("R", "T", "V") | Where-Object { -not (Test-Path ("{0}:\" -f $_)) } | Select-Object -First 1
if (-not $driveName) {
  throw "No free temporary drive letter is available for the Unicode-safe Tauri build."
}

$drive = "$driveName`:"
& subst.exe $drive $projectRoot
if ($LASTEXITCODE -ne 0) { throw "Unable to create the temporary build drive $drive" }

try {
  Push-Location "$drive\"
  & npm.cmd exec -- tauri @TauriArgs
  $exitCode = $LASTEXITCODE
  Pop-Location
} finally {
  if ((Get-Location).Path.StartsWith($drive, [StringComparison]::OrdinalIgnoreCase)) { Pop-Location }
  & subst.exe $drive /D | Out-Null
}

exit $exitCode
