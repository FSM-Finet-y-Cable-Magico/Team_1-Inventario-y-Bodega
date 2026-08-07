#!/bin/bash
# ============================================================
#  INVENTARIO Y BODEGA · Inicio automático
#  Uso:  ./start.sh      (o doble clic en Iniciar.command)
#  Hace: levanta la app, espera a que esté lista y abre el navegador
# ============================================================
set -e

cd "$(dirname "$0")"

echo "=============================================="
echo "  INVENTARIO Y BODEGA · INICIO"
echo "=============================================="

# 1) Verificar que Docker esté corriendo
if ! docker info >/dev/null 2>&1; then
  echo ""
  echo "  Docker Desktop no está corriendo."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "  Abriendo Docker Desktop..."
    open -a Docker
    echo "  Esperando a que arranque (hasta 2 min)..."
    for _ in $(seq 1 60); do
      if docker info >/dev/null 2>&1; then break; fi
      sleep 2
    done
  else
    echo "  Abrí Docker Desktop y volvé a ejecutar este script."
    exit 1
  fi
fi

if ! docker info >/dev/null 2>&1; then
  echo "  Error: Docker no responde. Abrí Docker Desktop manualmente e intentá de nuevo."
  exit 1
fi
echo "  OK: Docker está en ejecución."

# 2) Levantar todos los servicios
echo ""
echo "  Levantando servicios (la 1ra vez compila y puede tardar varios minutos)..."
docker compose up -d --build

# 3) Esperar a que la aplicación responda
echo ""
echo "  Esperando a que la aplicación esté lista..."
URL="http://localhost/api/health/ping"
LISTA=false
for i in $(seq 1 90); do
  if curl -sf "$URL" >/dev/null 2>&1; then
    LISTA=true
    break
  fi
  sleep 2
done

if [ "$LISTA" != "true" ]; then
  echo ""
  echo "  La aplicación tardó demasiado en iniciar."
  echo "  Revisá los logs con:  docker compose logs"
  exit 1
fi

# 4) Abrir el navegador
echo ""
echo "=============================================="
echo "  LISTO: la aplicación quedó en http://localhost"
echo "  Usuario:    superusuario"
echo "  Contraseña: Super1234"
echo "=============================================="
sleep 1

if [[ "$OSTYPE" == "darwin"* ]]; then
  open http://localhost
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open http://localhost
else
  echo "  Abrí http://localhost manualmente en tu navegador."
fi
