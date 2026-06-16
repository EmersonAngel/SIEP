@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0detener_siep.ps1" %*
if errorlevel 1 (
  echo.
  echo No se pudo detener SIEP. Revisa el error de arriba.
  echo.
  pause
  exit /b 1
)
echo.
echo SIEP detenido.
pause
