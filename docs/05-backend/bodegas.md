# Backend — Módulo `bodegas`

**Carpeta:** `codigo/backend-inventario/src/bodegas/`

## 1. Endpoints

Controller-level: `@UseGuards(AuthGuard('jwt'), RolesGuard)`. **No usa `CompanyIsolationGuard`**:
el aislamiento se hace manualmente en el service con `isSuperuser` y `verificarPertenencia`.

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| POST | `/api/bodegas` | `ADMIN`, `SUPERUSUARIO` | CU-17/CU-41: crear bodega (con responsable). |
| PATCH | `/api/bodegas/:id` | `ADMIN`, `SUPERUSUARIO` | CU-18/CU-42: editar bodega. |
| DELETE | `/api/bodegas/:id/desactivar` | `ADMIN`, `SUPERUSUARIO` | CU-19: desactivar bodega. |
| GET | `/api/bodegas` | los 4 roles | CU-44: listar con filtros `activa`/`activo` y `nombre`. |
| GET | `/api/bodegas/empresa/:idEmpresa` | `ADMIN`, `SUPERUSUARIO` | CU-20: bodegas activas de una empresa (para destino de transferencia). |
| GET | `/api/bodegas/:id` | los 4 roles | Detalle. |
| GET | `/api/bodegas/:id/stock` | los 4 roles | CU-45: stock de la bodega (por tipo/estado). |
| POST | `/api/bodegas/:id/umbral` | `ADMIN`, `SUPERUSUARIO`, `ADMIN_BODEGA` | CU-46: configurar umbral mínimo. |

## 2. Lógica del service (`bodegas.service.ts`)

### `verificarPertenencia(bodega, userEmpresaId, esSuperusuario)` — mecanismo central
- Si no es superusuario y `bodega.id_empresa !== empresa del actor`: **audita `ACCESO_DENEGADO`**
  y lanza `NotFoundException('Bodega no encontrada')` — **el mismo 404 que una bodega inexistente**
  para no revelar existencia. (CU-16/18/19 Excepción 1.)

### `create` (CU-17/CU-41)
- Si el actor no es SUPERUSUARIO, `id_empresa` = empresa del actor (el SUPERUSUARIO sí puede
  indicar `dto.id_empresa`).
- **Unicidad:** no puede existir bodega con el mismo `nombre + id_empresa` →
  `BadRequestException('Ya existe una bodega con ese nombre en esta empresa.')`.
- Crea con `activa: true`. Audita `CREAR`.

### `update` (CU-18/CU-42)
- Verifica pertenencia. Cambio de nombre valida unicidad por empresa.
- Edita `direccion` y `id_usuario_responsable` (**CU-42**). Audita `MODIFICAR`.

### `deactivate` (CU-19)
- Verifica pertenencia. Si ya inactiva, retorna.
- **Restricción:** no se puede desactivar la **última bodega activa** de la empresa →
  `BadRequestException('No es posible desactivar la última bodega activa de la empresa.')`.
- Audita `DESACTIVAR`.

### `findAll` (CU-44)
- No superusuario → filtra por su `id_empresa`. Filtros `activa` y `nombre ILIKE`.
- Resuelve responsable: explícito (`id_usuario_responsable`, CU-41) o respaldo = creador según
  log de auditoría `CREAR`.
- `resumen_stock_total` = `SUM(cantidad_disponible)` de consumibles + `COUNT` de unidades
  `'En bodega'`.
- Nombre de empresa hardcodeado: `id_empresa === 1 ? 'Finet' : 'Cable Mágico'`.

### `findActivasByEmpresa` (CU-20)
- Solo `id_bodega` + `nombre` de bodegas **activas** de la empresa indicada, orden alfabético
  (para elegir destino de transferencia).

### `getStock` (CU-45)
- Verifica pertenencia. `stockPorTipo`:
  - **Unidades serializadas:** `desglose_estados` (contadores por estado) y
    `cantidad_disponible` = unidades físicas `'En bodega'`.
  - **Consumibles:** si el tipo es serializado, la fila `stock_consumible` solo guarda el umbral
    (el stock real es el conteo de unidades, CU-46). Si no, los consumibles se expresan en su
    `unidad_medida` con `cantidad_disponible = stock.cantidad_disponible` (CU-45).

### `configurarUmbral` (CU-46)
- Verifica pertenencia. Busca el tipo y hace **upsert** de la fila `stock_consumible` para
  `(id_bodega, id_tipo_equipo)` seteando `umbral_minimo`.
- Audita `CONFIGURAR_UMBRAL`.
- **Alerta inmediata:** `alerta_generada = dto.umbral > 0 && stockActual < dto.umbral`.
  Para serializados, stockActual = conteo de unidades `'En bodega'`.

## 3. Entidades

- **`bodega`** → `bodega.entity.ts`: `id_bodega`, `id_empresa`, `nombre` NOT NULL, `direccion`,
  `id_usuario_responsable` (nullable, CU-41), `activa` (default true).
- **`stock_consumible`** → `stock-consumible.entity.ts`: `id_stock`, `id_tipo_equipo` NOT NULL,
  `id_bodega` NOT NULL, `cantidad_disponible` numeric(10,2) default 0, `umbral_minimo` numeric(10,2).
  `ManyToOne` → Bodega y TipoEquipo. Fila única por `(id_bodega, id_tipo_equipo)`.

## 4. DTOs

- `create-bodega.dto.ts`: `nombre` (3–60, not empty), `id_empresa` (opcional, solo superusuario),
  `id_usuario_responsable` (opcional, CU-41), `direccion` (0–200).
- `update-bodega.dto.ts`: `nombre`, `direccion`, `id_usuario_responsable` (CU-42).
- `configurar-umbral.dto.ts`: `id_tipo_equipo` (número, not empty), `umbral`
  (`IsInt` + `@Min(0)` + `@Max(9999)`; mensaje: `'El umbral debe ser un número entero entre 0 y 9999.'`)
  — CU-46 Excepción 1.

## 5. CU cubiertos
CU-16 (aislamiento/404), CU-17 (crear), CU-18 (editar), CU-19 (desactivar + última bodega activa),
CU-20 (bodegas destino), CU-41 (responsable), CU-42 (editar responsable), CU-44 (listado con stock),
CU-45 (stock por tipo/estado/unidad de medida), CU-46 (umbral mínimo + alertas).
