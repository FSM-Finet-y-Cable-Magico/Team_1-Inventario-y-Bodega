@echo off
REM ============================================================
REM  INVENTARIO Y BODEGA · Iniciar (doble clic en Windows)
REM
REM  Hace TODO solo:
REM   1) Si falta Docker Desktop, lo descarga e instala.
REM   2) Lo arranca y espera a que este listo.
REM   3) Levanta la aplicacion y abre el navegador.
REM ============================================================
cd /d "%~dp0"
setlocal

echo ==============================================
echo   INVENTARIO Y BODEGA - INICIO
echo ==============================================

REM 1) Docker instalado y corriendo
docker info >nul 2>&1
if %errorlevel%==0 (
    echo   OK: Docker listo.
    call :iniciar
    exit /b 0
)

REM 2) Docker instalado pero apagado
where docker >nul 2>&1
if %errorlevel%==0 (
    echo   Docker esta instalado pero no corriendo. Abriendolo...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    goto esperar
)

REM 3) Instalar Docker Desktop
echo   Docker Desktop no esta instalado.
echo   Se descargara Docker Desktop (~700 MB) e instalara automaticamente.
echo.

REM 3a) Primer intento con winget (ya viene con Windows 11)
where winget >nul 2>&1
if %errorlevel%==0 (
    echo   Instalando Docker Desktop con winget...
    winget install -e --id Docker.DockerDesktop --accept-package-agreements --accept-source-agreements
    if %errorlevel%==0 goto lanzar
)

REM 3b) Respaldo: descarga directa del instalador
echo   Descargando instalador de Docker Desktop...
powershell -Command "Invoke-WebRequest -Uri 'https://desktop.docker.com/win/main/amd64/Docker%%20Desktop%%20Installer.exe' -OutFile '%TEMP%\DockerDesktopInstaller.exe'"
if not exist "%TEMP%\DockerDesktopInstaller.exe" (
    echo   Error al descargar. Revise su conexion a internet y vuelva a intentar.
    pause
    exit /b 1
)
echo   Ejecutando instalacion (puede tardar varios minutos)...
"%TEMP%\DockerDesktopInstaller.exe" install --quiet --accept-license

:lanzar
echo.
echo   Docker Desktop instalado.
echo   Si Windows pide reiniciar: reinicie y vuelva a ejecutar Iniciar.bat
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

:esperar
echo.
echo   Esperando a que Docker arranque (hasta 3 min)...
set /a cont=0
:loop
docker info >nul 2>&1
if %errorlevel%==0 goto listo
timeout /t 5 /nobreak >nul
set /a cont+=1
if %cont% LSS 36 goto loop
echo   Docker tardo demasiado. Abralo manualmente (menu Inicio ^> Docker Desktop)
echo   y acepte los terminos la primera vez. Despues ejecute Iniciar.bat
pause
exit /b 1

:listo
echo   OK: Docker listo.

:iniciar
echo.
echo   Levantando la aplicacion (la 1ra vez compila y puede tardar varios minutos)...
docker compose up -d --build
if errorlevel 1 (
    echo   Error al levantar los servicios.
    pause
    exit /b 1
)
echo.
echo   Esperando a que la aplicacion este lista...
timeout /t 20 /nobreak >nul
echo.
echo ==============================================
echo   LISTO: la aplicacion quedo en http://localhost
echo   Usuario:    superusuario
echo   Contrasena: Super1234
echo ==============================================
timeout /t 3 /nobreak >nul
start http://localhost
pause
exit /b 0
