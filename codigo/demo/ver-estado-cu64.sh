#!/bin/bash
# Muestra en la base el efecto del cierre (para la explicación técnica de CU-64).
source "$(dirname "$0")/_comun.sh"
ONT="${1:-DEMO-ONT-0004}"; DECO="${2:-DEMO-DEC-0001}"
psql_demo -c "SELECT numero_serie, estado, id_tecnico_asignado FROM unidad_equipo WHERE numero_serie IN ('$ONT','$DECO');"
psql_demo -c "SELECT t.nombre, i.cantidad FROM inventario_personal_tecnico i JOIN tipo_equipo t USING (id_tipo_equipo) JOIN usuario u ON u.id_usuario=i.id_tecnico WHERE u.nombre_usuario='tecnico_qa' ORDER BY 1;"
psql_demo -c "SELECT id_ot, clave_idempotencia, estado_proceso, fecha_proceso FROM integracion_cierre ORDER BY fecha_proceso DESC LIMIT 3;"
psql_demo -c "SELECT id_ot, srv, id_tecnico, tipo_ot FROM integracion_cierre WHERE srv IS NOT NULL ORDER BY fecha_proceso DESC LIMIT 3;"
