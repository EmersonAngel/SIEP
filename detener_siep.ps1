param(
  [switch]$KeepDb
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$PidFile = Join-Path $Root ".siep-pids.json"
$Ports = @(8091, 4200)

function Stop-Pid($ProcessId) {
  if (-not $ProcessId) { return }
  $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
  if ($process) {
    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
  }
}

if (Test-Path $PidFile) {
  $pids = Get-Content $PidFile -Raw | ConvertFrom-Json
  Stop-Pid $pids.backendPid
  Stop-Pid $pids.frontendPid
}

foreach ($port in $Ports) {
  $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($listener in $listeners) {
    Stop-Pid $listener.OwningProcess
  }
}

if (-not $KeepDb) {
  Push-Location $Root
  try {
    docker compose -p siep stop db | Out-Host
  } finally {
    Pop-Location
  }
}

if (Test-Path $PidFile) {
  Remove-Item -LiteralPath $PidFile -Force
}

Write-Host "Servicios SIEP detenidos. No se eliminaron volumenes ni datos."
if ($KeepDb) {
  Write-Host "PostgreSQL se dejo encendido por -KeepDb."
}
