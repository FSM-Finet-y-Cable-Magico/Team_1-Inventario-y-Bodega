# Backend — Módulo `prestamos`

**Carpeta:** `codigo/backend-inventario/src/prestamos/` · **CU-81**, **CU-82** y **CU-83**.

## 1. Endpoints

Controller-level: `@UseGuards(AuthGuard('jwt'), RolesGuard)`. Aislamiento por empresa manual en el
service (patrón de `transferencias`/`bajas`).

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| POST | `/api/prestamos` | `ADMIN_BODEGA`, `ADMIN`, `SUPERUSUARIO` | CU-81: registra el préstamo (transacción completa). |
| GET | `/api/prestamos` | idem | CU-83: tabla con filtros `?estado=` y `?id_empresa=`, días restantes y resumen de ítems. |
| GET | `/api/prestamos/:id` | idem | Detalle con los ítems prestados y sus retornos previos. |
| POST | `/api/prestamos/:id/retorno` | idem | CU-82: retorno total o parcial. |

## 2. Un solo dueño de la tabla (coordinación con Grupo 3)

`prestamo_externo.tipo` distingue `PRESTAMO` (CU-81) de `REPARACION_EXTERNA` (CU-75, Grupo 3).
**Ambos flujos comparten tabla**; no crear entidades paralelas. Las columnas `descripcion_falla`,
`fecha_retorno_real` y `resultado_retorno` existen para esa variante y para el cierre de CU-82.

## 3. Validaciones (mensajes acumulados)

| Campo | Regla |
|-------|-------|
| `nombre_receptor` | Obligatorio, 3–80. |
| `rut_receptor` | **Opcional**; si viene, formato `XXXXXXXX-X`. |
| `fecha_salida` | La pone el sistema (`now()`), no se pide al actor. |
| `fecha_estimada_retorno` | Obligatoria y **posterior a la fecha de salida**. |
| `motivo` | Obligatorio, 5–200. |
| ítems | Al menos un equipo o un consumible. |

## 4. Excepción 1 — un error por cada NS inválido (mensajes de CU-59)

| Situación | Mensaje |
|-----------|---------|
| El NS no existe (o es de otra empresa) | `<NS>: Número de serie no encontrado.` |
| El NS no está `En bodega`, o está en otra bodega | `El equipo [NS] no está disponible en esta bodega. Estado actual: [ESTADO].` |

Los errores de todos los NS se devuelven juntos en un único `BadRequestException`.

## 5. Concurrencia (lo delicado de este CU)

1. **Correlativo `PE-XXXXX`:** se genera dentro de la transacción tras tomar
   `pg_advisory_xact_lock('prestamo_externo_correlativo')`, y la columna es `UNIQUE` como red de
   seguridad. Verificado con 6 préstamos simultáneos: `PE-00002`…`PE-00007`, sin repetidos.
2. **Unidades:** la validación previa (Excepción 1) usa datos que pueden quedar obsoletos, así que
   dentro de la transacción las unidades se **releen con `FOR UPDATE`** (`lock: pessimistic_write`,
   con `loadEagerRelations: false` porque Postgres no admite `FOR UPDATE` sobre el lado nullable de
   un outer join) y se revalida el estado contra `TRANSICIONES_PERMITIDAS`. Sin esto, dos préstamos
   simultáneos se llevaban la misma unidad.
3. **Consumibles:** el descuento es un `UPDATE ... SET cantidad_disponible = cantidad_disponible - :n
   WHERE id_stock = :id AND cantidad_disponible >= :n`. Si no afecta filas, el saldo cambió y el
   préstamo completo se revierte. Leer-y-escribir el saldo provocaba *lost updates*.

Todo ocurre en un `QueryRunner`: si cualquier paso falla, no queda préstamo, ni estados cambiados,
ni stock descontado.

## 6. Efectos del registro

- Unidades: `En bodega` → `En préstamo externo`, se limpian `id_bodega_actual`, `numero_poste` y
  `ubicacion_fisica` (CU-79), y se escribe el historial con
  `Salida por préstamo externo PE-XXXXX. Receptor: ...`.
- Consumibles: se descuentan del `stock_consumible` de la bodega de origen.
- Auditoría: acción **`PRESTAMO_EXTERNO`** con correlativo, receptor, RUT, fecha estimada, NS y
  consumibles incluidos.

## 7. CU-82 — Retorno del préstamo

`POST /api/prestamos/:id/retorno` con
`{ fecha_retorno, observacion?, items: [{ id_detalle, cantidad? }] }`.

> **Diferencia con el ticket:** cada unidad individualizable ocupa **su propio `id_detalle`**, así
> que no se envía una lista de NS por ítem: se marca el detalle y listo. La `cantidad` solo aplica a
> los consumibles.

### 7.1 Transición ampliada (ratificada)

El retorno deja las unidades en **`En revisión`**. Esa transición desde `En préstamo externo` no
existía: se agregó a `TRANSICIONES_PERMITIDAS` con la ratificación del jefe de grupo (misma decisión
que necesita CU-76). El frontend replica la tabla en `/unidades/[id]`, y ambos se actualizaron a la
vez. El retorno **no** exige diagnóstico técnico (la obligación de CU-40 es del cambio de estado
manual, no de este flujo).

### 7.2 Validaciones

| Regla | Mensaje |
|-------|---------|
| Préstamo `Activo` | `El préstamo PE-XXXXX ya está cerrado: no admite nuevos retornos.` |
| **Excepción 1:** fecha futura | `La fecha de retorno no puede ser futura.` |
| Observación ≤ 300 | mensaje específico |
| (CU-84) ítem de otro préstamo | `El ítem #N no pertenece al préstamo PE-XXXXX.` |
| (CU-84) unidad ya retornada | `El ítem #N ya fue retornado.` |
| (CU-84) cantidad > pendiente | `La cantidad retornada del ítem #N (X) supera lo pendiente (Y).` |

Los errores de todos los ítems se acumulan **antes** de abrir la transacción: si uno falla, no se
aplica ninguno.

### 7.3 Efectos

- Unidad devuelta → `En revisión` (releída con `FOR UPDATE`) + historial
  `Retorno de préstamo externo PE-XXXXX`.
- Consumible devuelto → `stock_consumible.cantidad_disponible += cantidad` en la **bodega de origen
  del préstamo** (con `INSERT` si la fila ya no existiera).
- `prestamo_detalle.cantidad_retornada += cantidad` y una fila en `prestamo_retorno` por ítem.
- El préstamo pasa a `Cerrado` (con `fecha_retorno_real` y `resultado_retorno`) **solo** cuando no
  queda nada pendiente; si queda algo, sigue `Activo`.
- Auditoría **`RETORNO_PRESTAMO`** con correlativo, fecha, unidades, consumibles y estado resultante.

## 8. CU-83 — Tabla de préstamos activos

- `dias_restantes` se calcula **en el servidor** (`fecha_estimada_retorno - hoy`, zona
  `America/Santiago`) y es `null` en los préstamos ya cerrados. Negativo = vencido; el frontend
  lo muestra como `Vencido hace N días` en rojo.
- `items_resumen` acompaña cada fila con el tipo, la descripción y la cantidad de cada ítem.
- Filtros: `estado` (por defecto la página pide `Activo`) e `id_empresa`. **El filtro por empresa
  solo lo aplica el Superusuario**: a los demás se les fija su propia empresa, así que pasar
  `id_empresa` de otra empresa no cambia nada.
- La tabla incluye los préstamos `tipo = 'REPARACION_EXTERNA'` (CU-75, Grupo 3): comparten tabla y
  se distinguen con un badge.
- Es una consulta: **no audita**.
- Excepción 1: la lista vacía no es error; el `EmptyState` del frontend muestra
  `No hay préstamos externos activos actualmente.` cuando el filtro activo es `Activo`.

## 9. Pendiente para los CUs siguientes

- **CU-84**: las validaciones de trazabilidad ya viven aquí; ese CU las formaliza y documenta.
- **CU-76** (Grupo 3): el reingreso desde reparación externa reutiliza esta tabla; la acción
  "Reingreso" en la fila queda para ese CU.
