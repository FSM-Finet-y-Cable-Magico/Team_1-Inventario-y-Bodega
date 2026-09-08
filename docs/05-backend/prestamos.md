# Backend — Módulo `prestamos`

**Carpeta:** `codigo/backend-inventario/src/prestamos/` · **CU-81** a **CU-84**.

## 1. Endpoints

Controller-level: `@UseGuards(AuthGuard('jwt'), RolesGuard)`. Aislamiento por empresa manual en el
service (patrón de `transferencias`/`bajas`).

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| POST | `/api/prestamos` | `ADMIN_BODEGA`, `ADMIN`, `SUPERUSUARIO` | CU-81: registra el préstamo (transacción completa). |
| GET | `/api/prestamos` | idem | CU-83: tabla con filtros `?estado=` y `?id_empresa=`, días restantes y resumen de ítems. |
| GET | `/api/prestamos/:id` | idem | Detalle con los ítems prestados y sus retornos previos. |
| POST | `/api/prestamos/:id/retorno` | idem | CU-82: retorno total o parcial. |

## 2. Tabla compartida con CU-75/CU-76

`prestamo_externo` es **una sola tabla con dos flujos**, y su entidad vive en
`src/inventario/entities/prestamo-externo.entity.ts` (la definió CU-75):

| `tipo` | Flujo | Ítems | Cierre |
|--------|-------|-------|--------|
| `REPARACION_EXTERNA` | CU-75 desde la ficha de la unidad | `id_unidad` (una unidad) | CU-76 (reingreso) |
| `PRESTAMO_EXTERNO` | CU-81 desde `/prestamos` | `prestamo_detalle` (varios equipos y consumibles) | CU-82 (retorno total o parcial) |

Columnas que agregó CU-81 sobre esa cabecera: `correlativo` (`PE-00001`, único) e
`id_bodega_origen`; ambas quedan **NULL** en los registros de reparación. El motivo del préstamo se
guarda en `detalle`, que es la columna que ya usaba CU-75.

Consecuencias que hay que respetar al tocar este módulo:

- El listado de `/prestamos` y el retorno de CU-82 filtran por `tipo = 'PRESTAMO_EXTERNO'`: las
  reparaciones tienen su propio flujo y no deben aparecer ni cerrarse desde aquí.
- El generador del correlativo ignora las filas con `correlativo IS NULL` (si no, revienta al
  encontrar una reparación).
- Los estados son los de la cabecera compartida: **`ACTIVO` / `CERRADO`** en mayúsculas.

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

### 7.2 Validaciones previas

| Regla | Mensaje |
|-------|---------|
| Préstamo `Activo` | `El préstamo PE-XXXXX ya está cerrado: no admite nuevos retornos.` |
| **Excepción 1:** fecha futura | `La fecha de retorno no puede ser futura.` |
| Observación ≤ 300 | mensaje específico |

Las validaciones de trazabilidad por ítem son **CU-84** (ver §9).

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
- Es una consulta: **no audita**.
- Excepción 1: la lista vacía no es error; el `EmptyState` del frontend muestra
  `No hay préstamos externos activos actualmente.` cuando el filtro activo es `Activo`.

## 9. CU-84 — Trazabilidad de la devolución

Validaciones que corren **antes de abrir la transacción**, acumulando un error por cada ítem
inválido. Si hay al menos uno, no se procesa nada (ni estados, ni stock, ni `cantidad_retornada`).

| # | Regla | Mensaje |
|---|-------|---------|
| A | El ítem pertenece al préstamo | `El equipo [NS] no pertenece al préstamo [PE-XXXXX].` (o `El ítem #N no pertenece al préstamo [PE-XXXXX].` si se identificó por `id_detalle`) |
| B | La unidad sigue `En préstamo externo` y no tiene retorno registrado | `El equipo [NS] ya fue retornado o no está en préstamo externo.` |
| C | Lo retornado no supera lo prestado | `La cantidad retornada supera la cantidad prestada del ítem [TIPO].` |

Detalles de implementación:

- Cada ítem se identifica por **`numero_serie` o `id_detalle`**: enviar el NS permite dar los
  mensajes del caso de uso tal cual, y `id_detalle` sigue funcionando para los consumibles.
- (B) mira las **dos** fuentes: `prestamo_detalle.cantidad_retornada` y las filas de
  `prestamo_retorno`, además del estado real de la unidad.
- (C) suma los retornos previos **y lo pedido en el mismo envío**: mandar el mismo consumible dos
  veces (6 + 6 sobre 10 prestados) se rechaza.
- Dentro de la transacción se repite el chequeo de estado con la unidad bloqueada (`FOR UPDATE`),
  como red de seguridad ante retornos simultáneos; el mensaje es el mismo de (B).

Pruebas: `src/prestamos/prestamos.service.spec.ts` cubre los casos del caso de uso (NS de otro
préstamo, NS nunca prestado, NS ya retornado, unidad que ya no está en préstamo, cantidad mayor a
la prestada, acumulado en el mismo envío, errores múltiples y fecha futura) y comprueba que el
`DataSource` **no se usa** cuando alguna validación falla:

```bash
cd codigo/backend-inventario && npx jest src/prestamos
```

## 10. Pendiente para los CUs siguientes

- **CU-76** (Grupo 3): el reingreso desde reparación externa reutiliza esta tabla; la acción
  "Reingreso" en la fila queda para ese CU.
