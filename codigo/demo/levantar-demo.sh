#!/bin/bash
# Levanta la demo: app en http://localhost:8090 y simulador de G3/G8 en http://localhost:8091.
# La primera vez construye las imágenes, completa los datos de demo y guarda el estado inicial.
set -e; source "$(dirname "$0")/_comun.sh"
"${COMPOSE[@]}" up -d --build
echo "Esperando al backend..."
esperar_backend || { echo "El backend no respondió. Revisa: ${COMPOSE[*]} logs backend"; exit 1; }
if [ ! -f "$DUMP" ]; then
  python3 "$DEMO_DIR/preparar_datos_demo.py"
  "$DEMO_DIR/guardar-estado-demo.sh"
fi
recargar_nginx
echo "Listo: app $URL · simulador $SIMULADOR"
