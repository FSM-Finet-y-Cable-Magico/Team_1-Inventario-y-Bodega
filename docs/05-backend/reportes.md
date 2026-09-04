# Backend — Módulo `reportes`

## Endpoint

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| GET | `/api/reportes/stock` | `ADMIN_BODEGA`, `ADMIN`, `SUPERUSUARIO` | Genera el reporte agrupado por tipo de equipo y bodega. |

Filtros opcionales: `id_empresa`, `id_bodega` e `id_tipo_equipo`. Los roles distintos de
`SUPERUSUARIO` siempre quedan limitados a su propia empresa.

## Reglas de stock

- Para tipos serializados, las cantidades se obtienen de `unidad_equipo` agrupadas por los
  estados `En bodega`, `Asignado a técnico`, `En revisión` y `En préstamo externo`.
- Para consumibles, `stock_consumible.cantidad_disponible` se muestra en `En bodega`.
- El umbral se obtiene de `stock_consumible.umbral_minimo`; si no existe, vale `0`.
- `total_activo` es la suma de las cuatro columnas y `bajo_umbral` indica si es menor al umbral.

Cada generación registra `GENERAR_REPORTE` en `log_auditoria`, incluyendo los filtros usados.
