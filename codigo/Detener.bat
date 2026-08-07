@echo off
REM ============================================================
REM  INVENTARIO Y BODEGA · Detener (Windows)
REM ============================================================
cd /d "%~dp0"

echo Deteniendo servicios...
docker compose down
echo.
echo OK: servicios detenidos. Los datos quedan guardados.
echo Para volver a usarlo: Iniciar.bat
pause
