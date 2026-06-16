param(
  [switch]$ForcePorts,
  [switch]$Hidden
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root "backend_django"
$FrontendDir = Join-Path $Root "frontend"
$PidFile = Join-Path $Root ".siep-pids.json"
$BackendPort = 8091
$FrontendPort = 4200

function Write-Step($Text) {
  Write-Host ""
  Write-Host "==> $Text"
}

function Require-Command($Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "No se encontro '$Name' en PATH."
  }
}

function Stop-PortIfRequested($Port) {
  $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if (-not $listeners) { return }

  foreach ($listener in $listeners) {
    $process = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
    $label = if ($process) { "$($process.ProcessName) PID $($process.Id)" } else { "PID $($listener.OwningProcess)" }
    if (-not $ForcePorts) {
      throw "El puerto $Port ya esta en uso por $label. Ejecuta .\iniciar_siep.ps1 -ForcePorts si quieres cerrarlo."
    }
    Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
  }
}

function Ensure-LocalEnv {
  $rootEnv = Join-Path $Root ".env"
  $backendEnv = Join-Path $BackendDir ".env"
  $envContent = @"
POSTGRES_DB=psychosim
POSTGRES_USER=psychosim
POSTGRES_PASSWORD=psychosim_secret
DB_NAME=psychosim
DB_USER=psychosim
DB_PASSWORD=psychosim_secret
DB_HOST=127.0.0.1
DB_PORT=5433
DATABASE_URL=postgres://psychosim:psychosim_secret@127.0.0.1:5433/psychosim
DJANGO_SETTINGS_MODULE=psychosim.settings.local
DJANGO_SECRET_KEY=dev-local-secret-key-for-running-siep
SECRET_KEY=dev-local-secret-key-for-running-siep
DEBUG=true
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:4200,http://127.0.0.1:4200
CSRF_TRUSTED_ORIGINS=http://localhost:4200,http://127.0.0.1:4200
JWT_SECRET=psychosim-jwt-secret-key-must-be-at-least-256-bits-long-for-hs256
VITE_API_URL=http://localhost:8091
REACT_APP_API_URL=http://localhost:8091
"@
  if (-not (Test-Path $rootEnv)) { Set-Content -Path $rootEnv -Value $envContent -Encoding UTF8 }
  if (-not (Test-Path $backendEnv)) { Set-Content -Path $backendEnv -Value $envContent -Encoding UTF8 }

  $localSettings = Join-Path $BackendDir "psychosim\settings\local.py"
  if (-not (Test-Path $localSettings)) {
    $localContent = @"
from .base import *  # noqa

DEBUG = env.bool("DEBUG", default=True)
SECRET_KEY = env("DJANGO_SECRET_KEY", default=env("SECRET_KEY", default="dev-local-secret-key-for-running-siep"))
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:4200", "http://127.0.0.1:4200"],
)
CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS",
    default=["http://localhost:4200", "http://127.0.0.1:4200"],
)
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
"@
    Set-Content -Path $localSettings -Value $localContent -Encoding UTF8
  }
}

function Wait-Port($Port, $Name) {
  for ($i = 0; $i -lt 60; $i++) {
    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($listener) { return }
    Start-Sleep -Seconds 1
  }
  throw "$Name no abrio el puerto $Port."
}

Write-Step "Validando herramientas"
Require-Command docker
Require-Command npm

if (-not (Get-Command python -ErrorAction SilentlyContinue) -and -not (Test-Path (Join-Path $BackendDir ".venv\Scripts\python.exe"))) {
  throw "No se encontro 'python' en PATH y tampoco existe backend_django\.venv."
}

Write-Step "Validando puertos"
Stop-PortIfRequested $BackendPort
Stop-PortIfRequested $FrontendPort

Write-Step "Preparando variables locales"
Ensure-LocalEnv

Push-Location $Root
try {
  Write-Step "Iniciando PostgreSQL con Docker Compose"
  docker compose -p siep up -d db
  $dbContainer = docker compose -p siep ps -q db
  if (-not $dbContainer) { throw "No se encontro el contenedor db de Docker Compose." }

  $dbHealthy = $false
  for ($i = 0; $i -lt 60; $i++) {
    $health = docker inspect --format "{{.State.Health.Status}}" $dbContainer 2>$null
    if ($health -eq "healthy") {
      $dbHealthy = $true
      break
    }
    Start-Sleep -Seconds 1
  }
  if (-not $dbHealthy) {
    throw "PostgreSQL no quedo healthy. Revisa: docker compose -p siep logs db"
  }

  $PythonExe = Join-Path $BackendDir ".venv\Scripts\python.exe"
  if (-not (Test-Path $PythonExe)) {
    Write-Step "Creando entorno virtual de Django"
    python -m venv (Join-Path $BackendDir ".venv")
    & $PythonExe -m pip install --upgrade pip
    & $PythonExe -m pip install -r (Join-Path $BackendDir "requirements.txt")
  }

  Write-Step "Aplicando migraciones y datos demo"
  Push-Location $BackendDir
  & $PythonExe manage.py migrate
  & $PythonExe manage.py seed_default_rubric
  & $PythonExe manage.py seed_demo_access
  Pop-Location

  if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    Write-Step "Instalando dependencias del frontend"
    Push-Location $FrontendDir
    npm install
    Pop-Location
  }

  Write-Step "Arrancando backend en puerto $BackendPort"
  $backendLog = Join-Path $Root "backend_run.log"
  $backendErr = Join-Path $Root "backend_run.err.log"
  if ($Hidden) {
    $backendProcess = Start-Process -FilePath $PythonExe -ArgumentList @("manage.py", "runserver", "127.0.0.1:$BackendPort", "--noreload") -WorkingDirectory $BackendDir -RedirectStandardOutput $backendLog -RedirectStandardError $backendErr -WindowStyle Hidden -PassThru
  } else {
    $backendCommand = "Set-Location '$BackendDir'; & '$PythonExe' manage.py runserver 127.0.0.1:$BackendPort --noreload"
    $backendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $backendCommand) -WorkingDirectory $BackendDir -WindowStyle Normal -PassThru
  }

  Write-Step "Arrancando frontend en puerto $FrontendPort"
  $frontendLog = Join-Path $Root "frontend_run.log"
  $frontendErr = Join-Path $Root "frontend_run.err.log"
  if ($Hidden) {
    $frontendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", "npm", "start") -WorkingDirectory $FrontendDir -RedirectStandardOutput $frontendLog -RedirectStandardError $frontendErr -WindowStyle Hidden -PassThru
  } else {
    $frontendCommand = "Set-Location '$FrontendDir'; npm start"
    $frontendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $frontendCommand) -WorkingDirectory $FrontendDir -WindowStyle Normal -PassThru
  }

  Write-Step "Esperando servicios HTTP"
  Wait-Port $BackendPort "Backend"
  Wait-Port $FrontendPort "Frontend"

  $backendPid = (Get-NetTCPConnection -LocalPort $BackendPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess
  $frontendPid = (Get-NetTCPConnection -LocalPort $FrontendPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess
  if (-not $backendPid) { $backendPid = $backendProcess.Id }
  if (-not $frontendPid) { $frontendPid = $frontendProcess.Id }
  [pscustomobject]@{
    backendPid = $backendPid
    frontendPid = $frontendPid
    backendPort = $BackendPort
    frontendPort = $FrontendPort
    dbProject = "siep"
  } | ConvertTo-Json | Set-Content -Path $PidFile -Encoding UTF8

  Write-Host ""
  Write-Host "SIEP iniciado."
  Write-Host "Frontend: http://127.0.0.1:$FrontendPort"
  Write-Host "Backend:  http://127.0.0.1:$BackendPort"
  Write-Host "Swagger:  http://127.0.0.1:$BackendPort/swagger-ui.html"
  Write-Host "Logs:     backend_run.log, backend_run.err.log, frontend_run.log, frontend_run.err.log"
  Write-Host ""
  Write-Host "Credenciales:"
  Write-Host "ADMIN       admin@psychosim.edu.co       Admin123!"
  Write-Host "PROFESOR    profesora@psychosim.edu.co   Profesor123!"
  Write-Host "ESTUDIANTE  estudiante@psychosim.edu.co  Estudiante123!"
} finally {
  Pop-Location
}
