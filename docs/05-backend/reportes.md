# Backend — Módulo `reportes`

## CU-85: reporte de stock actual

- `GET /api/reportes/stock?id_empresa=&id_bodega=&id_tipo_equipo=`
- Roles: `ADMIN_BODEGA`, `ADMIN`, `SUPERUSUARIO`.
- Los filtros son opcionales. Un usuario que no sea superusuario queda limitado a su empresa; solicitar otra empresa responde `403`.
- El resultado contiene una fila por combinación de tipo de equipo y bodega, con los cuatro estados exactos, `total_activo`, `umbral_minimo` y `bajo_umbral`.
- Para equipos serializados, el stock se obtiene contando `unidad_equipo` por estado y el total activo suma esos cuatro estados.
- Para consumibles, `stock_consumible.cantidad_disponible` se muestra en `en_bodega`; el umbral proviene de `umbral_minimo` y el total activo es esa cantidad.
- El umbral no configurado se entrega como `0`; `bajo_umbral` es verdadero cuando `total_activo < umbral_minimo`.
- Cada generación, incluso sin resultados, registra `GENERAR_REPORTE` en `log_auditoria` con los filtros utilizados.
- Sin resultados, el frontend muestra `No se encontraron datos para los filtros seleccionados.`.

## CU-89: reporte de inventario actual de técnicos

- `GET /api/reportes/tecnicos/inventario?id_empresa=&id_usuario=`
- Roles: `ADMIN_BODEGA`, `ADMIN`, `SUPERUSUARIO`.
- El filtro `id_usuario` es opcional; vacío devuelve todos los técnicos activos con rol `TECNICO_TERRENO`.
- Los usuarios no superusuario quedan limitados a su empresa; solicitar otra empresa responde `403`.
- Los equipos individualizables se leen desde `unidad_equipo` en estado `Asignado a técnico`.
- `fecha_asignacion` usa la última transición a `Asignado a técnico` en `historial_estado_equipo` para ese técnico; si no existe historial, se entrega `null`.
- Los consumibles se leen desde `inventario_personal_tecnico`, solo con saldo positivo y tipos no serializados; la unidad proviene de `tipo_equipo.unidad_medida`.
- `dias_transcurridos` se calcula en PostgreSQL con `CURRENT_DATE - fecha_asignacion`.
- Cada generación registra `GENERAR_REPORTE` con entidad `reporte_inventario_tecnicos`.
- Un técnico sin ambos tipos de ítems conserva su tarjeta y muestra `Este técnico no tiene ítems en su inventario personal.`.
