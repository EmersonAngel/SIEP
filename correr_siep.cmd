@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0iniciar_siep.ps1" %*
if errorlevel 1 (
  echo.
  echo No se pudo iniciar SIEP. Revisa el error de arriba.
  echo Si el problema es que los puertos 8091 o 4200 ya estan ocupados, ejecuta:
  echo   correr_siep.cmd -ForcePorts
  echo.
  pause
  exit /b 1
)
echo.
echo SIEP quedo iniciado.
pause
