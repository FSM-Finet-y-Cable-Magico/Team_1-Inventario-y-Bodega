# Backend — Módulo `tomas-inventario`

**Carpeta:** `codigo/backend-inventario/src/tomas-inventario/` · **CU-97** (RF-71, Incremento 4):
Registrando toma de inventario físico y ajuste de diferencias.

> CU-97 y RF-71 son un requerimiento nuevo del Incremento 4. La especificación formal (UR ESA,
> caso extendido, matriz RF–CU y validación con el cliente) se completa en el ticket sc-176.
> `docs/casos-de-uso.json` es de solo lectura y no se modificó.

## 1. Endpoints

`@UseGuards(AuthGuard('jwt'), RolesGuard)`. Roles: `ADMIN`, `SUPERUSUARIO`, `ADMIN_BODEGA`.
`RolesGuard` lee `@Roles` del método, por eso va en cada endpoint. Aislamiento por empresa manual en
el service; fuera de la empresa la bodega o toma responde 404.

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/tomas-inventario` | Abre una toma de `id_bodega` y guarda la foto de lo esperado. |
| GET | `/api/tomas-inventario` | Lista las tomas (filtro opcional `id_bodega`). |
| GET | `/api/tomas-inventario/:id` | Detalle con líneas, diferencias y resumen. |
| PATCH | `/api/tomas-inventario/:id/conteo` | Guarda `consumibles` y `series`; se puede repetir. `series` es la lista completa. |
| POST | `/api/tomas-inventario/:id/confirmar` | Ajusta el stock y cierra la toma. `forzar_movimientos` confirma tras el aviso E3. |
| POST | `/api/tomas-inventario/:id/cancelar` | Cancela la toma sin tocar el inventario. |

## 2. Reglas

- La foto incluye las unidades `En bodega` de la bodega, su stock de consumibles y los consumibles
  activos del catálogo sin stock (esperado 0).
- Para confirmar, todos los consumibles deben estar contados.
- Cada diferencia de consumible genera un movimiento `AJUSTE_INVENTARIO` con
  `referencia_id = id_toma`: bodega de destino si sobra, de origen si falta.
- El ajuste suma la diferencia al stock **actual**, para no pisar movimientos registrados durante
  el conteo. Si dejaría stock negativo, se rechaza y no se aplica nada.
- Las series faltantes solo se informan: no cambian de estado ni se agrega un estado nuevo.
- Auditoría: `ABRIR_TOMA_INVENTARIO`, `CONFIRMAR_TOMA_INVENTARIO`, `CANCELAR_TOMA_INVENTARIO`.

## 3. Excepciones

| Id | Caso | Respuesta |
|----|------|-----------|
| E1 | La bodega ya tiene una toma abierta | 409. Además lo impide el índice único parcial `uq_toma_abierta_por_bodega`. |
| E2 | Serie que no estaba en la bodega | Línea `OTRA_UBICACION` o `NO_REGISTRADA`. Una serie de otra empresa se informa como `NO_REGISTRADA`. |
| E3 | Stock o unidades cambiaron durante el conteo | 409 con `codigo: MOVIMIENTOS_DURANTE_CONTEO`; no ajusta hasta reenviar con `forzar_movimientos: true`. |
