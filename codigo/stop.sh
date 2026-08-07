#!/bin/bash
# ============================================================
#  INVENTARIO Y BODEGA · Detener (los datos se conservan)
#  Uso:  ./stop.sh
# ============================================================
cd "$(dirname "$0")"

echo "Deteniendo servicios..."
docker compose down
echo ""
echo "OK: servicios detenidos. Los datos quedan guardados."
echo "Para volver a usarlo: ./start.sh"
