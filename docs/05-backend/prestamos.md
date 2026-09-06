# Backend — Módulo `prestamos`

**Carpeta:** `codigo/backend-inventario/src/prestamos/` · **CU-81** · Prepara CU-82/CU-83.

## 1. Endpoints

Controller-level: `@UseGuards(AuthGuard('jwt'), RolesGuard)`. Aislamiento por empresa manual en el
service (patrón de `transferencias`/`bajas`).

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| POST | `/api/prestamos` | `ADMIN_BODEGA`, `ADMIN`, `SUPERUSUARIO` | CU-81: registra el préstamo (transacción completa). |
| GET | `/api/prestamos` | idem | Listado con filtro `?estado=`. **La tabla completa con días restantes y vencimientos es CU-83.** |
| GET | `/api/prestamos/:id` | idem | Detalle con los ítems prestados. |

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

## 7. Pendiente para los CUs siguientes

- **CU-82** (retorno total o parcial): usa `prestamo_retorno` y `prestamo_detalle.cantidad_retornada`;
  al retornar, las unidades pasan a `En revisión` y los consumibles vuelven al stock.
- **CU-83** (tabla de activos): días restantes, aviso `Vencido hace N días` y filtro por empresa.
