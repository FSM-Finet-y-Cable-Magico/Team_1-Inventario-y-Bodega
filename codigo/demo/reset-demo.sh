#!/bin/bash
# Vuelve la demo al estado inicial: base de datos y órdenes de trabajo del simulador.
set -e; source "$(dirname "$0")/_comun.sh"
[ -f "$DUMP" ] || { echo "No existe $DUMP; corre primero levantar-demo.sh"; exit 1; }
"${COMPOSE[@]}" stop backend >/dev/null 2>&1
psql_demo -q -c "SET client_min_messages=warning; DROP SCHEMA public CASCADE; CREATE SCHEMA public;" >/dev/null
docker exec -i inventario-demo-db pg_restore -U inventario -d inventario --no-owner < "$DUMP"
"${COMPOSE[@]}" start backend >/dev/null 2>&1
esperar_backend; recargar_nginx
curl -sf -X POST "$SIMULADOR/panel/reiniciar" >/dev/null || echo "Aviso: el simulador no respondió (¿está levantado?)."
echo "Demo restaurada al estado inicial."
