# Módulo `ordenes-ingreso` — CU-52

**Carpeta:** `codigo/backend-inventario/src/ordenes-ingreso/`

Registro de las órdenes de ingreso de mercadería enviada por un proveedor. La orden es la
**cabecera de la recepción**: declara qué se espera recibir, de quién y en qué bodega. La
recepción propiamente tal (cantidades recibidas, números de serie) es CU-54/CU-55 y todavía
no está implementada, por eso `cantidad_recibida` nace en 0 y el estado nace en
`Pendiente de recepción`.

## Entidades

### `orden_ingreso`
| Columna | Tipo | Notas |
|---------|------|-------|
| `id_orden` | SERIAL PK | |
| `correlativo` | VARCHAR(10) UNIQUE NOT NULL | Formato `OI-%04d` (`OI-0001`, `OI-0002`, …) |
| `id_proveedor` | INTEGER FK → `proveedor` | |
| `numero_documento` | VARCHAR(30) NOT NULL | 1–30 caracteres alfanuméricos |
| `fecha_documento` | DATE NOT NULL | No puede ser futura |
| `id_empresa_destino` | INTEGER NOT NULL | FK desnuda: `empresa` es la constante `EMPRESAS` |
| `id_bodega_destino` | INTEGER FK → `bodega` | Debe estar activa y ser de la empresa destinataria |
| `estado` | VARCHAR(30) NOT NULL DEFAULT `'Pendiente de recepción'` | |
| `id_usuario_registro` | INTEGER NOT NULL | |
| `fecha_creacion` | TIMESTAMPTZ DEFAULT now() | |

**Estados (literales exactos, con tildes — deben coincidir front/back):**

```
'Pendiente de recepción' | 'Recepción parcial' | 'Completada'
```

CU-52 solo emite `Pendiente de recepción`; las otras dos las escribirá CU-54.

### `orden_ingreso_detalle`
| Columna | Tipo | Notas |
|---------|------|-------|
| `id_detalle` | SERIAL PK | |
| `id_orden` | INTEGER FK → `orden_ingreso` | ON DELETE CASCADE |
| `id_tipo_equipo` | INTEGER FK → `tipo_equipo` | Debe estar activo |
| `cantidad_esperada` | INTEGER NOT NULL | CHECK > 0 |
| `garantia_dias` | INTEGER NOT NULL DEFAULT 0 | CHECK entre 0 y 3650 |
| `cantidad_recibida` | INTEGER NOT NULL DEFAULT 0 | La actualizará CU-54 |

Ambas tablas se crean con `CREATE TABLE IF NOT EXISTS` en `scripts/migrar.ts` y en
`database/init.sql`.

## Endpoints

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `POST` | `/api/ordenes-ingreso` | ADMIN_BODEGA, ADMIN, SUPERUSUARIO | CU-52: registrar orden de ingreso |
| `GET` | `/api/ordenes-ingreso` | ADMIN_BODEGA, ADMIN, SUPERUSUARIO | Listado (filtros: `buscar`, `estado`) |

> El `GET` existe para que la página pueda mostrar lo que se acaba de crear. La consulta
> con filtros completos (proveedor, rango de fechas, empresa) es **CU-53**, aún pendiente.

## Generación del correlativo (concurrencia)

`OrdenesIngresoService.create` abre una transacción con `QueryRunner` y, **antes** de calcular
el número, toma un advisory lock de PostgreSQL:

```ts
await queryRunner.query(`SELECT pg_advisory_xact_lock($1)`, [CORRELATIVO_LOCK_KEY]);
const result = await queryRunner.query(
  `SELECT correlativo FROM orden_ingreso ORDER BY id_orden DESC LIMIT 1`,
);
```

El lock se libera solo al `COMMIT`/`ROLLBACK`, así que dos órdenes simultáneas se serializan y
obtienen correlativos distintos. **No sirve `SELECT ... FOR UPDATE`** aquí: con la tabla vacía
no hay filas que bloquear y ambas transacciones calcularían `OI-0001`. El `UNIQUE` sobre
`correlativo` queda como red de seguridad.

> El prefijo `OI-` está reservado para G1 (T1) según `docs/13-guia-global-endpoints-4-grupos.md`
> §1, fila "Correlativos" (`SRV-`, `OI-`, `PE-` son de G1; ningún grupo repite prefijos).
> Ningún otro módulo debe emitirlo ni reutilizar `CORRELATIVO_LOCK_KEY`.

## Validaciones (CU-52 Excepción 1)

En el DTO (`create-orden-ingreso.dto.ts`), con mensajes en español:

- `numero_documento`: 1–30 caracteres, `^[a-zA-Z0-9]+$`.
- `fecha_documento`: `^\d{4}-\d{2}-\d{2}$`.
- `items`: `@ArrayMinSize(1)` → *"Debe agregar al menos un ítem a la orden de ingreso"*.
- Cada ítem: `@ValidateNested({ each: true })` + `@Type(() => ItemOrdenIngresoDto)`,
  `cantidad_esperada` entero ≥ 1, `garantia_dias` entero 0–3650.

> La validación anidada funciona con el `ValidationPipe` global tal como está en `main.ts`: el
> pipe hace `plainToInstance` antes de validar, así que `@ValidateNested` se aplica sin
> necesidad de activar la opción `transform`.

En el service, con `BadRequestException` / `NotFoundException`:

- El proveedor existe.
- La bodega existe, está activa y pertenece a la empresa destinataria.
- La fecha del documento no es futura.
- Cada tipo de equipo existe y está activo.

## Aislamiento por empresa

Manual en el service con el flag `esSuperusuario` (patrón de `usuarios`/`bodegas`, **no**
`CompanyIsolationGuard`):

- **Superusuario:** indica `id_empresa_destino` en el body. Si no lo envía →
  *"La empresa destinataria es obligatoria."*
- **Resto de roles:** se ignora lo que venga en el body y se fuerza `id_empresa_destino` a la
  empresa del actor. Por eso `id_empresa_destino` es **opcional** en el DTO (igual que
  `id_empresa` en `CreateBodegaDto`, CU-41), y el frontend solo muestra el selector de empresa
  al Superusuario.
- El `GET` filtra por `id_empresa_destino` del actor salvo que sea Superusuario.

## Auditoría

- `CREAR` sobre la entidad `orden_ingreso` al registrar la orden. `valor_nuevo` guarda
  correlativo, proveedor, documento, fecha, empresa, bodega e ítems.

## CUs cubiertos

| CU | Descripción |
|----|-------------|
| CU-52 | Registrar orden de ingreso desde proveedor (correlativo automático, estado `Pendiente de recepción`) |
