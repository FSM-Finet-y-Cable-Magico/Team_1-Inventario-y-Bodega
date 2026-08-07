#!/bin/bash
# ============================================================
#  INVENTARIO Y BODEGA · Iniciar (doble clic en macOS)
#
#  Hace TODO solo:
#   1) Si falta Docker Desktop, lo descarga e instala.
#   2) Lo arranca y espera a que esté listo.
#   3) Levanta la aplicación y abre el navegador.
# ============================================================
cd "$(dirname "$0")"

echo "=============================================="
echo "  INVENTARIO Y BODEGA · INICIO"
echo "=============================================="

# 1) Docker ya instalado y corriendo
if docker info >/dev/null 2>&1; then
  echo "  OK: Docker listo."
  exec ./start.sh
fi

# 2) Docker instalado pero apagado
if [ -d "/Applications/Docker.app" ]; then
  echo "  Docker Desktop no está corriendo. Abriéndolo..."
  open -a Docker
  echo "  Esperando a que el motor arranque (hasta 3 min)..."
  for _ in $(seq 1 90); do
    if docker info >/dev/null 2>&1; then break; fi
    sleep 2
  done
  if docker info >/dev/null 2>&1; then
    echo "  OK: Docker listo."
    exec ./start.sh
  fi
  echo "  Error: Docker no respondió. Abrí Docker Desktop (Aplicaciones) y volvé a intentar."
  exit 1
fi

# 3) Instalar Docker Desktop desde cero
echo "  Docker Desktop no está instalado."
echo "  Se descargará Docker Desktop (~700 MB) e instalará automáticamente."
echo ""

ARCH="$(uname -m)"
if [ "$ARCH" = "arm64" ]; then
  URL="https://desktop.docker.com/mac/main/arm64/Docker.dmg"
else
  URL="https://desktop.docker.com/mac/main/amd64/Docker.dmg"
fi

DMG="/tmp/Docker.dmg"
echo "  Descargando Docker Desktop..."
if ! curl -L --fail --progress-bar -o "$DMG" "$URL"; then
  echo "  Error al descargar. Revisá tu conexión a internet y volvé a intentar."
  exit 1
fi

echo "  Instalando en /Applications..."
hdiutil attach "$DMG" -nobrowse -quiet
cp -R "/Volumes/Docker/Docker.app" /Applications/
hdiutil detach "/Volumes/Docker" -quiet
rm -f "$DMG"

echo "  Abriendo Docker Desktop por primera vez..."
open -a Docker

echo "  IMPORTANTE: la primera vez Docker pide aceptar los términos y puede"
echo "  pedir tu contraseña. Aceptá y esperá a que arranque (hasta 5 min)..."
for _ in $(seq 1 150); do
  if docker info >/dev/null 2>&1; then break; fi
  sleep 2
done

if docker info >/dev/null 2>&1; then
  echo "  OK: Docker listo."
  exec ./start.sh
else
  echo "  Error: Docker tardó demasiado. Abrí Docker Desktop (Aplicaciones),"
  echo "  aceptá los términos y ejecutá de nuevo Iniciar.command"
  exit 1
fi
