# Backend — Módulo `transferencias`

**Carpeta:** `codigo/backend-inventario/src/transferencias/`

## 1. Endpoints

Controller-level: `@UseGuards(AuthGuard('jwt'), RolesGuard)`. **No usa `CompanyIsolationGuard`**:
el aislamiento es manual en el service.

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| POST | `/api/transferencias` | `ADMIN`, `SUPERUSUARIO` | CU-20: solicitar transferencia inter-empresa. |
| PATCH | `/api/transferencias/:id/aprobar` | **solo `SUPERUSUARIO`** | CU-21: aprobar. |
| PATCH | `/api/transferencias/:id/rechazar` | **solo `SUPERUSUARIO`** | CU-22: rechazar (motivo obligatorio). |
| GET | `/api/transferencias/:id` | `ADMIN`, `SUPERUSUARIO` | CU-21: detalle. |
| GET | `/api/transferencias` | `ADMIN`, `SUPERUSUARIO` | CU-23: listar con filtros `estado`, `id_empresa`, `fecha_inicio`, `fecha_fin`. |

## 2. Concepto clave

**El estado de la transferencia NO está en `transferencia_equipo`.** Vive en
`movimiento_inventario.tipo_movimiento`:

```
'TRANSFERENCIA_PENDIENTE' | 'TRANSFERENCIA_APROBADA' | 'TRANSFERENCIA_RECHAZADA'
```

El estado de una cabecera se **deriva** del primer movimiento (`referencia_id = id_transferencia`).

## 3. Lógica del service (`transferencias.service.ts`)

### `registrarTransferencia` (CU-20)
- Origen = `actor.id_empresa`.
- **Restricciones:**
  - Empresa origen ≠ destino → `BadRequestException('La empresa de origen y destino no pueden ser
    la misma.')`.
  - Mínimo 1 unidad (`ids_unidades` no vacío).
  - Por unidad: debe pertenecer a la empresa del actor →
    `ForbiddenException('La unidad [...] no pertenece a su empresa.')`; estado debe ser `'En bodega'`;
    `id_bodega_actual` debe coincidir con `id_bodega_origen`.
- **Transacción (QueryRunner):** crea `Transferencia` + un `MovimientoInventario` por unidad con
  `tipo_movimiento: TRANSFERENCIA_PENDIENTE`, `cantidad: 1`, `referencia_id = id_transferencia`.
- Audita `SOLICITAR_TRANSFERENCIA`. Respuesta: "Pendiente de aprobación del Superusuario".

### `aprobarTransferencia` (CU-21)
- Busca movimientos `referencia_id + TRANSFERENCIA_PENDIENTE`; si no hay →
  `NotFoundException('No existe una transferencia pendiente con ID [...]')`.
- **CU-21 Excepción 1:** verifica que **ninguna unidad haya cambiado de estado** desde el registro;
  si alguna no está `'En bodega'` → `BadRequestException` listando seriales con su estado actual.
- **Transacción:** actualiza cada movimiento a `TRANSFERENCIA_APROBADA` y **cambia la unidad**:
  `id_empresa = id_empresa_destino`, `id_bodega_actual = id_bodega_destino`.
- Audita `APROBAR_TRANSFERENCIA`.

### `rechazarTransferencia` (CU-22)
- **Excepción 1:** motivo de rechazo obligatorio →
  `BadRequestException('Debe ingresar un motivo de rechazo para continuar.')`.
- **Excepción 2:** motivo ≤200 caracteres.
- Actualiza movimientos a `TRANSFERENCIA_RECHAZADA`. **No modifica inventario.**
- Audita `RECHAZAR_TRANSFERENCIA`.

### `consultarDetalle` (CU-21)
- Aislamiento manual: un Admin solo ve transferencias donde su empresa es origen o destino; si no →
  `NotFoundException('Transferencia no encontrada')` (sin revelar existencia).
- Resuelve nombres de bodegas (query SQL cruda), solicitante y empresas. Incluye unidades con
  `numero_serie`, `tipo_equipo` y `estado`.

### `consultarTransferencias` (CU-23)
- No superusuario → filtra por `id_empresa_origen = :empresa OR id_empresa_destino = :empresa`.
- Filtros: `id_empresa`, `fecha_inicio`/`fecha_fin`.
- El filtro de estado acepta ambos formatos: `'PENDIENTE'` o `'TRANSFERENCIA_PENDIENTE'`.
- Estado de cada cabecera derivado del primer movimiento. Incluye nombre del solicitante.

## 4. Entidades

- **`transferencia_equipo`** → `transferencia.entity.ts`: `id_transferencia`, `id_empresa_origen`,
  `id_empresa_destino`, `id_usuario_registro`, `fecha_transferencia` (date), `observaciones` (text).
  **Sin relaciones TypeORM** (FKs desnudas).
- **`movimiento_inventario`** → `movimiento-inventario.entity.ts`: `id_movimiento`, `id_tipo_equipo`,
  `id_unidad`, `id_empresa_origen`, `id_empresa_destino`, `id_bodega_origen`, `id_bodega_destino`,
  `id_usuario`, `tipo_movimiento` (varchar 30), `cantidad` (numeric 10,2 default 1), `fecha`,
  `referencia_id` (→ `transferencia_equipo.id_transferencia`).

## 5. DTO
- `create-transferencia.dto.ts`: `id_empresa_destino`, `id_bodega_origen`, `id_bodega_destino`,
  `ids_unidades[]`, `observaciones?`. **Sin decoradores class-validator** (validación manual en el service).

## 6. Notas para implementar flujos nuevos

- Usa `QueryRunner` para operaciones multi-escritura y respeta el flujo PENDIENTE → APROBADA/RECHAZADA.
- La **campana de notificaciones** del frontend consume `getTransferenciasPendientes`
  (`companies.service`). Si tu CU cambia los estados de transferencia, revisa que esa agregación
  siga siendo correcta.
- Aprobar/rechazar cambia inventario (empresa y bodega de la unidad) — no duplicar esa lógica.

## 7. CU cubiertos
CU-20 (solicitar transferencia + notificación), CU-21 (aprobar + detalle), CU-22 (rechazar),
CU-23 (listar/filtrar).
