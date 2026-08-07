#!/bin/bash
# ============================================================
#  INVENTARIO Y BODEGA · Restablecer desde cero
#  Uso:  ./reset.sh
#  Borra la base de datos y deja todo limpio como el primer día.
#  Después hay que ejecutar ./start.sh para arrancar de nuevo.
# ============================================================
cd "$(dirname "$0")"

echo "Deteniendo y borrando datos (base de datos + archivos subidos)..."
docker compose down -v
echo ""
echo "OK: datos borrados."
echo "Para un arranque limpio, ejecutá: ./start.sh"
