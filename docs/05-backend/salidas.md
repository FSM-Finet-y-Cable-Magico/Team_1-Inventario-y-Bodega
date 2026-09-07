# Módulo `salidas` — Salida de bodega a técnico (CU-57/58/59/60/62)

> **CUs:** CU-57 (salida de equipos y/o consumibles a técnico), CU-58 (inventario personal),
> CU-59 (validación de NS en salida), CU-60 (salida de consumibles), CU-62 (validación de stock).
> Acuerdo de descuento único con G3 (Opción A): T1 valida saldo y descuenta **una sola vez**.

## 1. Endpoints (`salidas.controller.ts` + `TecnicosController`)

| Método | Ruta | Roles | CU |
|--------|------|-------|----|
| POST | `/api/salidas` | `ADMIN`, `SUPERUSUARIO`, `ADMIN_BODEGA` | CU-57/60 registrar salida (mixta o solo consumibles) |
| GET | `/api/salidas` | ídem | listado de salidas (aislamiento manual por empresa) |
| GET | `/api/tecnicos/:id/inventario` | `ADMIN`, `SUPERUSUARIO`, `ADMIN_BODEGA`, `TECNICO_TERRENO` (solo el propio) | CU-58 inventario personal |
| GET | `/api/unidades/serie/:numeroSerie?id_bodega=N` | 4 roles | CU-59 validación en vivo del NS |

Guards: `@UseGuards(AuthGuard('jwt'), CompanyIsolationGuard, RolesGuard)` (patrón inventario).

## 2. Lógica (`salidas.service.ts`)

**POST /salidas** — DTO `{ id_tecnico, id_bodega_origen, items: [{ tipo: 'UNIDAD'|'CONSUMIBLE', numero_serie?, id_tipo_equipo?, cantidad? }] }`.
Precondiciones: técnico activo con rol `TECNICO_TERRENO` de la empresa; bodega activa de la empresa.
**Transacción QueryRunner atómica** (cualquier fallo → rollback total):

1. Cabecera `salida_bodega` (`fecha_hora` automática).
2. **UNIDAD (CU-57/59):** NS existe en la empresa → si no, `NotFoundException('Número de serie no encontrado.')`
   (404 genérico cross-empresa). Debe estar `estado='En bodega'` y `id_bodega_actual = bodega de origen`;
   si no → `BadRequestException('El equipo [NS] no está disponible en esta bodega. Estado actual: [ESTADO].')`.
   Aplica transición → `'Asignado a técnico'`, setea `id_tecnico_asignado`, **limpia `id_bodega_actual` y
   `ubicacion_fisica`** (regla CU-47), inserta `historial_estado_equipo`
   (`motivo='Salida de bodega a técnico. Salida #N.'`) y `movimiento_inventario` con
   `tipo_movimiento='SALIDA_A_TECNICO'`, `referencia_id=id_salida`.
3. **CONSUMIBLE (CU-60/62):** cantidad > 0 (`'La cantidad debe ser mayor a cero.'`, también en DTO) y
   máx. 2 decimales; tipo existente y `requiereSerialNumber=false`. `verificarStockDisponible`
   lee `stock_consumible` **con `SELECT ... FOR UPDATE`** (fila por `(id_bodega, id_tipo_equipo)`;
   sin fila = disponible 0); si no alcanza →
   `BadRequestException('Stock insuficiente de [TIPO] en [BODEGA]. Disponible: [CANT] [UNIDAD].')`.
   Descuenta stock y **suma al inventario personal** (`InventarioPersonalService.sumar`, upsert con bloqueo).
4. Ítem en `salida_detalle` (o `id_unidad`, o `id_tipo_equipo`+`cantidad`) y movimiento por ítem.
5. Auditoría `SALIDA_BODEGA` tras el commit con el detalle completo.

**CU-58 (`inventario-personal.service.ts`)** — tabla `inventario_personal_tecnico` con
UNIQUE(id_tecnico, id_tipo_equipo); saldo NUNCA negativo:
`descontar` (bloqueo de fila) lanza `'Saldo insuficiente. No es posible registrar esta operación.'`
(quedará listo para cierres CU-64/68 y devoluciones CU-82). Consulta →
`{ tecnico, ns_asignados (de unidad_equipo), saldos (con unidad_medida del tipo) }`.

**CU-59 (`units.service.ts → verificarSerie`)** — endpoint liviano de pre-validación:
`{ existe, numero_serie, estado, id_bodega_actual, disponible }` (sin excepciones; el front
marca el NS y deshabilita Confirmar). La validación de verdad es la del service en la transacción.

## 3. Entidades

- `salida_bodega` / `salida_detalle` / `inventario_personal_tecnico` (ver `docs/03-base-de-datos.md`).
- `unidad_equipo.id_tecnico_asignado` (integer, nullable) — nueva columna desde CU-57.
- Nuevo literal de `movimiento_inventario.tipo_movimiento`: `SALIDA_A_TECNICO`.

## 4. DTOs (`dto/crear-salida.dto.ts`)

`CrearSalidaDto` con `@ValidateNested` por ítem; mensajes en español; cantidad `@Min(0.01)`.

## 5. Integración

- CU-58 habilita el wrapper **G1-5** (`GET /api/integraciones/tecnicos/{id}/inventario-personal`,
  doc 13) pendiente de implementar en el módulo `integraciones` (tarea 118 de sc-113).
- CU-57/58/62 desbloquean los cruzados T1-CU-64 (descuento en cierre) y CU-68 (saldo).

## 6. Pendientes

- [ ] Capturas `Casos de uso/CU-57../CU-62/` (requieren navegador).
- [ ] Devoluciones a bodega (CU-82) y uso en cierres (CU-64/68) para completar el ciclo del saldo.
