@echo off
REM ============================================================
REM  INVENTARIO Y BODEGA · Restablecer desde cero (Windows)
REM  Borra la base de datos y deja todo limpio como el primer dia.
REM ============================================================
cd /d "%~dp0"

echo Deteniendo y borrando datos (base de datos + archivos subidos)...
docker compose down -v
echo.
echo OK: datos borrados. Ejecute Iniciar.bat para un arranque limpio.
pause
