#!/bin/bash
# Guarda el estado actual de la base como punto de partida de la demo (lo restaura reset-demo.sh).
set -e; source "$(dirname "$0")/_comun.sh"
docker exec inventario-demo-db pg_dump -U inventario -d inventario -Fc > "$DUMP"
echo "Estado guardado en $DUMP"
