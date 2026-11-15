#!/bin/bash
# CU-64 desde la terminal: pide al simulador que G3 envíe el cierre de instalación de la OT 7001
# (mismo evento que el botón del panel http://localhost:8091).
source "$(dirname "$0")/_comun.sh"
curl -s -X POST "$SIMULADOR/panel/accion/${1:-g3-cierre-instalacion}" -H 'Content-Type: application/json' -d '{}' | python3 -m json.tool
