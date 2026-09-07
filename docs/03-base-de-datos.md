# Base de datos — Esquema, migraciones y seed

La base de datos es **PostgreSQL 16**. Se definen **3 artefactos** que conviven:

| Artefacto | Ruta | Cuándo se usa |
|-----------|------|---------------|
| `init.sql` | `codigo/database/init.sql` | Esquema base, se ejecuta **solo la primera vez** que arranca el contenedor `db` con volumen vacío. |
| `migrar.ts` | `codigo/backend-inventario/scripts/migrar.ts` | **Migraciones idempotentes** (`npm run migrar`). El entrypoint del backend lo ejecuta en cada arranque. |
| `seed-qa.ts` | `codigo/backend-inventario/scripts/seed-qa.ts` | Datos de prueba (usuarios, empresas, bodegas). Idempotente. El entrypoint del backend lo ejecuta en cada arranque. |

> También existe `archivos-incremento-1/esquema-bdd-incremento1.sql`: la versión "objetivo" y más
> formal del esquema (con `IF NOT EXISTS`, FKs adicionales, tipos `bigint` para tablas de alto
> volumen). Es la referencia de integridad que se quiere alcanzar; `init.sql` es la base funcional.

---

## 1. Tablas (esquema actual según `init.sql`)

### `empresa` — empresas del ISP (solo 2 en uso)
`id_empresa` PK · `nombre` NOT NULL
> Nota: la entidad **no existe en TypeORM**. El backend usa la constante `EMPRESAS`
> (`companies.service.ts`): `[{id:1,'Finet'},{id:2,'Cable Mágico'}]`.

### `rol` — roles del sistema
`id_rol` PK · `nombre_rol` UNIQUE NOT NULL · `descripcion`
Roles en uso: `SUPERUSUARIO`, `ADMIN`, `ADMIN_BODEGA`, `TECNICO_TERRENO`.

### `usuario` — usuarios
`id_usuario` PK · `id_empresa` (nullable) · `nombre_completo` NOT NULL ·
`nombre_usuario` UNIQUE · `email` UNIQUE · `password_hash` NOT NULL · `activo` (default true) ·
`intentos_fallidos` (default 0) · `bloqueado_hasta` timestamptz · `debe_cambiar_password` (default false) ·
`fecha_creacion`

### `usuario_rol` — relación N:M usuario ↔ rol
`id_usuario_rol` PK · `id_usuario` · `id_rol` · `fecha_asignacion`
FKs → `usuario`, `rol`.

### `bodega` — bodegas
`id_bodega` PK · `id_empresa` · `nombre` NOT NULL · `direccion` · `id_usuario_responsable` (CU-41) · `activa` (default true)

### `tipo_equipo` — catálogo de tipos de equipo (CU-24..31)
`id_tipo_equipo` PK · `id_empresa` · `nombre` NOT NULL · `categoria` · `marca` · `modelo` ·
`descripcion_tecnica` · `unidad_medida` · `garantia_dias` (default 0) ·
`requiere_serie_individual` boolean · `ficha_tecnica_pdf_url` text · `ficha_tecnica_nombre` (CU-29) ·
`activo` (default true)

### `unidad_equipo` — unidades individuales (CU-32..40)
`id_unidad` PK · `id_tipo_equipo` · `id_empresa` · `numero_serie` UNIQUE NOT NULL · `modelo` ·
`estado` NOT NULL · `fecha_adquisicion` date · `fecha_venc_garantia` date · `diagnostico_tecnico` text ·
`id_cliente_instalado` · `id_bodega_actual` · `numero_poste` · `id_caja_nap` · `mac_address` UNIQUE ·
`proveedor` · `observaciones` (300) · `ubicacion_fisica` (60)
FK → `tipo_equipo`.

### `historial_estado_equipo` — historial de transiciones de estado
`id_historial` PK · `id_unidad` · `id_usuario` · `estado_anterior` · `estado_nuevo` · `motivo` text ·
`fecha_hora`
FK → `unidad_equipo` con `ON DELETE CASCADE`.

### `log_auditoria` — bitácora de auditoría
`id_log` PK · `id_usuario` NOT NULL · `accion` NOT NULL · `entidad_afectada` · `id_entidad_afectada` NOT NULL ·
`valor_anterior` jsonb · `valor_nuevo` jsonb NOT NULL · `ip_origen` inet · `fecha_hora`

### `transferencia_equipo` — cabecera de transferencias inter-empresa
`id_transferencia` PK · `id_empresa_origen` · `id_empresa_destino` · `id_usuario_registro` ·
`fecha_transferencia` date · `observaciones` text
> El **estado** de la transferencia NO vive aquí: está en `movimiento_inventario.tipo_movimiento`.

### `movimiento_inventario` — movimientos de inventario (transferencias)
`id_movimiento` PK · `id_tipo_equipo` · `id_unidad` · `id_empresa_origen` · `id_empresa_destino` ·
`id_bodega_origen` · `id_bodega_destino` · `id_usuario` · `tipo_movimiento` varchar(30) ·
`cantidad` numeric(10,2) default 1 · `fecha` · `referencia_id` (→ `transferencia_equipo.id_transferencia`)
Valores de `tipo_movimiento` vigentes para reportes: `INGRESO`, `ASIGNACION`, `SALIDA_A_TECNICO`, `DEVOLUCION`, `BAJA`, `TRANSFERENCIA`, `PRESTAMO`, `TRANSFERENCIA_PENDIENTE`, `TRANSFERENCIA_APROBADA`, `TRANSFERENCIA_RECHAZADA`. Los tres últimos son los estados de transferencia implementados actualmente; `SALIDA_A_TECNICO` (CU-57/60, `referencia_id` → `salida_bodega.id_salida`); los demás quedan disponibles para los módulos de Incremento 2 que registren esos movimientos.

### `stock_consumible` — stock por cantidad de consumibles
`id_stock` PK · `id_tipo_equipo` NOT NULL · `id_bodega` NOT NULL · `cantidad_disponible` numeric(10,2) default 0 ·
`umbral_minimo` numeric(10,2)
FKs → `bodega`, `tipo_equipo`. Fila única por `(id_bodega, id_tipo_equipo)`.

### `proveedor` — proveedores (CU-49)
`id_proveedor` PK · `nombre_comercial` VARCHAR(100) NOT NULL · `rut` VARCHAR(12) UNIQUE NOT NULL ·
`nombre_contacto` VARCHAR(80) · `telefono` VARCHAR(15) · `email` VARCHAR(150) ·
`activa` BOOLEAN DEFAULT TRUE · `fecha_creacion` TIMESTAMPTZ
> Sin `id_empresa`: el proveedor es global (compartido entre ambas empresas).

### `proveedor_tipo_equipo` — relación N:M proveedor ↔ tipo_equipo (CU-49)
`id` PK · `id_proveedor` FK → `proveedor` (ON DELETE CASCADE) · `id_tipo_equipo` FK → `tipo_equipo` (ON DELETE CASCADE)
UNIQUE en `(id_proveedor, id_tipo_equipo)`.

### `orden_ingreso` — órdenes de ingreso desde proveedor (CU-52)
`id_orden` PK · `correlativo` VARCHAR(10) UNIQUE NOT NULL (OI-%04d) ·
`id_proveedor` FK → `proveedor` · `numero_documento` VARCHAR(30) NOT NULL ·
`fecha_documento` DATE NOT NULL · `id_empresa_destino` INTEGER NOT NULL ·
`id_bodega_destino` FK → `bodega` · `estado` VARCHAR(30) DEFAULT 'Pendiente de recepción'
(valores: `Pendiente de recepción` | `Recepción parcial` | `Completada`) ·
`id_usuario_registro` INTEGER NOT NULL · `fecha_creacion` TIMESTAMPTZ

### `orden_ingreso_detalle` — ítems de una orden de ingreso (CU-52)
`id_detalle` PK · `id_orden` FK → `orden_ingreso` (ON DELETE CASCADE) ·
`id_tipo_equipo` FK → `tipo_equipo` · `cantidad_esperada` INT > 0 ·
`garantia_dias` INT 0–3650 · `cantidad_recibida` INT DEFAULT 0

### `salida_bodega` + `salida_detalle` — salidas de bodega a técnico (CU-57/59/60/62)
`salida_bodega`: `id_salida` PK · `id_tecnico` · `id_bodega_origen` · `fecha_hora` timestamptz (auto) ·
`id_empresa` · `id_usuario_registro`.
`salida_detalle`: `id_detalle` PK · `id_salida` FK CASCADE · **o bien** `id_unidad` (equipo individualizable)
**o bien** `id_tipo_equipo` + `cantidad` numeric(10,2) (consumible).

### `inventario_personal_tecnico` — inventario personal del técnico (CU-58)
`id_inventario` PK · `id_tecnico` · `id_tipo_equipo` · `cantidad` numeric(10,2) · `fecha_actualizacion`.
**UNIQUE(id_tecnico, id_tipo_equipo)**. Solo consumibles (los individualizables se leen de
`unidad_equipo WHERE estado='Asignado a técnico' AND id_tecnico_asignado=:id`).

> `unidad_equipo` suma la columna `id_tecnico_asignado` (integer, nullable) desde CU-57.


---

## 2. Conceptos críticos para no romper el modelo

### 2.1 El catálogo bifurca en dos tablas (pivote `requiere_serie_individual`)
Cuando se crea un tipo de equipo, `requiereSerialNumber` define su naturaleza:

| `requiere_serie_individual` | Naturaleza | Tabla destino | Reglas |
|---|---|---|---|
| `true` | INDIVIDUALIZABLE | `unidad_equipo` | obliga número de serie único, ubicación en bodega, garantía |
| `false` | CONSUMIBLE / VOLUMEN | `stock_consumible` | se maneja por `cantidad_disponible` + `unidad_medida`; se acumula por `(id_bodega, id_tipo_equipo)` |

El método pivote es `CatalogService.determinarNaturalezaEquipo()`
(`codigo/backend-inventario/src/inventario/catalog.service.ts`). Úsalo antes de registrar cualquier
ítem nuevo. Intentar registrar un consumible como unidad individual da error CU-32.

### 2.2 Estados de unidad (`unidad_equipo.estado`)
Valores literales (con tildes, deben coincidir EXACTO en front y back):

```
'En bodega' | 'Asignado a técnico' | 'Instalado en cliente' | 'En revisión' | 'En préstamo externo' | 'Dado de baja'
```

Máquina de transiciones permitidas (valida el backend en `UnitsService.transicionarEstado` y la
replica el frontend):

| Estado actual | Estados destino permitidos |
|---|---|
| `En bodega` | `Asignado a técnico`, `En préstamo externo`, `Dado de baja` |
| `Asignado a técnico` | `Instalado en cliente`, `En bodega`, `En revisión` |
| `Instalado en cliente` | `En revisión` |
| `En revisión` | `En bodega`, `En préstamo externo`, `Dado de baja` |
| `En préstamo externo` | `En bodega`, `En revisión` |
| `Dado de baja` | *(ninguno, estado terminal)* |

Reglas asociadas:
- Al pasar a `En revisión` el **diagnóstico técnico es obligatorio** (CU-40), con lista permitida
  (`No enciende`, `Se reinicia continuamente`, `Sin señal óptica`, `Copla o puerto dañado`,
  `Falla de configuración`, `Daño físico visible`, `Causa desconocida`, `Otro`). Si es `Otro`,
  requiere descripción de 5–200 caracteres. **Excepción:** el retorno de reparación externa
  (CU-76) pasa directo a `En revisión` sin pedir diagnóstico (usa observación propia).
- Cada transición escribe en `historial_estado_equipo` (transacción con reintentos, CU-36).
- **CU-76 (ratificado por el jefe de grupo, 2026-09-07):** `En préstamo externo → En revisión`
  se agregó a la máquina para que el retorno de un equipo enviado a reparación externa
  (reparado o no) quede siempre en revisión para reevaluación interna. Aplica también a CU-82.

### 2.3 Transferencias y estado de inventario
- La solicitud de transferencia crea `transferencia_equipo` + un `movimiento_inventario` por unidad
  con `tipo_movimiento = TRANSFERENCIA_PENDIENTE`.
- Al **aprobar** (solo SUPERUSUARIO): movimientos → `TRANSFERENCIA_APROBADA` y la unidad cambia
  `id_empresa` + `id_bodega_actual` al destino (CU-21).
- Al **rechazar** (solo SUPERUSUARIO, motivo obligatorio ≤200, CU-22): movimientos →
  `TRANSFERENCIA_RECHAZADA`, no toca inventario.
- Antes de aprobar se verifica que todas las unidades sigan `En bodega` (CU-21 Excepción 1).

### 2.4 Garantía
`unidad_equipo.fecha_venc_garantia = fecha_adquisicion + tipo_equipo.garantia_dias` (CU-38).
Si falta fecha o `garantia_dias` → "Garantía no calculable".

### 2.5 Stock de consumibles y umbral (CU-45/CU-46)
- `stock_consumible.cantidad_disponible` es la cantidad real del consumible en una bodega.
- `umbral_minimo` activa alertas de stock bajo umbral. Para tipos **serializados**, el stock real es
  el **conteo de unidades `En bodega`** (la fila `stock_consumible` solo guarda el umbral).
- Umbral permitido: entero entre 0 y 9999.

---

## 3. Migraciones: cómo agregar columnas (patrón obligatorio)

Como TypeORM tiene `synchronize: false`, **todo cambio de esquema se declara en
`codigo/backend-inventario/scripts/migrar.ts`** con sentencias idempotentes
(`ADD COLUMN IF NOT EXISTS`), y se registra en las entidades TypeORM correspondientes.

Patrón (ejemplo real de CU-41):

```ts
// scripts/migrar.ts
const SENTENCIAS = [
  // ...
  `ALTER TABLE bodega ADD COLUMN IF NOT EXISTS id_usuario_responsable integer`,
];

async function main() {
  const ds = new DataSource({ type: 'postgres', url: process.env.DATABASE_URL });
  await ds.initialize();
  for (const sql of SENTENCIAS) {
    await ds.query(sql);
    console.log(`✓ ${sql}`);
  }
  await ds.destroy();
  console.log('Migración completada.');
}
```

Pasos para un CU que agregue columnas:
1. Agregar la columna en `migrar.ts` (con comentario del CU).
2. Agregarla en la **entidad TypeORM** del backend (`entities/*.entity.ts`).
3. Si corresponde, actualizar `database/init.sql` y/o `esquema-bdd-incremento1.sql` para que
   ambientes nuevos ya vengan con el esquema completo.
4. Ejecutar `cd codigo/backend-inventario && npm run migrar` para aplicar (en local con
   `DATABASE_URL` apuntando a tu BD, o simplemente reiniciar el contenedor backend que corre
   la migración automáticamente).

> Si el CU necesita una **tabla nueva**: créala en el esquema SQL y en `init.sql`, y registra la
> entidad TypeORM en el módulo correspondiente (`TypeOrmModule.forFeature([...])`).

## 4. Datos de prueba (seed)

`scripts/seed-qa.ts` (idempotente, `npm run seed:qa`) crea:

- Empresas: Finet (1), Cable Mágico (2).
- Bodegas: una por empresa ("Bodega Finet Central", "Bodega Cable Mágico Central").
- Roles y 5 usuarios (ver tabla de credenciales en `02-arquitectura.md`).

No toques el seed para CUs de negocio; úsalo solo como ambiente de prueba. Si un CU necesita datos
de prueba específicos, agregarlos con verificación de existencia (idempotente).

## 5. Referencias a diagramas de BDD

- `diagramas/diagrama_mere/mere-chen.png` — Modelo Entidad-Relación (notación Chen).
- `diagramas/diagrama_modelo_fisico/modelo_bdd.png` — Modelo físico de tablas.
- `diagramas/diagrama-clases/` — diagrama de clases backend con las entidades TypeORM.

---

## 6. Preguntas frecuentes

**¿Dónde agrego una nueva columna para mi CU?**
En `migrar.ts` + entidad TypeORM + `init.sql`. Nunca confiar en `synchronize`.

**¿`empresa` es una tabla editable?**
No desde el código: es la constante `EMPRESAS`. Si un CU debe listar/crear/editar empresas, hay que
consultar al jefe de grupo (hoy no se soporta).

**¿Los FKs existen en TypeORM?**
Parcialmente. Muchas columnas `id_*` son "FKs desnudas" (números sin relación TypeORM) para evitar
acoplamiento. Las relaciones explícitas TypeORM más usadas son: `UnidadEquipo.tipoEquipo` (eager),
`UnidadEquipo.historial`, `StockConsumible.bodega/tipoEquipo`, `Usuario.usuarioRoles.rol`.
