#!/bin/bash
# Detiene la demo (conserva los datos). Para borrar todo: docker compose -p inventario-demo down -v
source "$(dirname "$0")/_comun.sh"; "${COMPOSE[@]}" stop
