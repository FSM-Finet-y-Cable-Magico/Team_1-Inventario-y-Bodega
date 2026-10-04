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
`proveedor` · `observaciones` (300) · `ubicacion_fisica` (60) · `motivo_baja` (40) ·
`motivo_baja_detalle` (200)
FK → `tipo_equipo`.

### `solicitud_baja` — solicitudes de baja definitiva (CU-78)
`id_solicitud` PK · `id_unidad` NOT NULL · `id_empresa` · `id_usuario_solicitante` NOT NULL ·
`motivo` (40) NOT NULL · `motivo_otro` (200) · `estado` (30) NOT NULL · `id_usuario_aprobador` ·
`fecha_solicitud` · `fecha_resolucion` · `motivo_rechazo` (200)
FK → `unidad_equipo`. Estados: `Pendiente de aprobación | Aprobada | Rechazada`.
Solo la generan los técnicos de terreno: ADMIN/SUPERUSUARIO/ADMIN_BODEGA aplican la baja directa
y no crean fila aquí.

### `donacion` / `donacion_detalle` — donaciones de equipos dados de baja (CU-80)
`donacion`: `id_donacion` PK · `nombre_institucion` (100) NOT NULL · `rut_institucion` (12) NOT NULL ·
`fecha_donacion` date NOT NULL · `numero_resolucion` (30) · `id_usuario` NOT NULL · `id_empresa` ·
`fecha_creacion`
`donacion_detalle`: `id_detalle` PK · `id_donacion` FK → `donacion` · `id_unidad` FK → `unidad_equipo`
Solo se incluyen unidades en estado `Dado de baja` con `motivo_baja = 'Donación a institución'`,
y una unidad no puede repetirse en dos donaciones.

### `prestamo_externo` / `prestamo_detalle` / `prestamo_retorno` — préstamos a externos (CU-81)
`prestamo_externo`: `id_prestamo` PK · `correlativo` (12) **UNIQUE** (`PE-00001`) · `tipo`
(`PRESTAMO` | `REPARACION_EXTERNA`) · `nombre_receptor` (80) · `rut_receptor` (12) ·
`fecha_salida` timestamptz · `fecha_estimada_retorno` date · `motivo` (200) ·
`descripcion_falla` (300, solo reparación) · `estado` (`Activo` | `Cerrado`) · `id_empresa` ·
`id_bodega_origen` FK → `bodega` · `id_usuario` · `fecha_retorno_real` · `resultado_retorno`
`prestamo_detalle`: `id_detalle` PK · `id_prestamo` FK CASCADE · `id_unidad` FK (individualizable) ·
`id_tipo_equipo` + `cantidad` (consumible) · `cantidad_retornada` (CU-82)
`prestamo_retorno`: `id_retorno` PK · `id_detalle` FK CASCADE · `cantidad` · `fecha_retorno` ·
`observacion` (300) · `id_usuario` — la usa CU-82 para los retornos parciales.

> **Una tabla, dos flujos.** `tipo = 'REPARACION_EXTERNA'` son los envíos por unidad de CU-75 (los
> cierra CU-76) y `tipo = 'PRESTAMO_EXTERNO'` los préstamos por lote de CU-81 (los cierra CU-82).
> `correlativo` e `id_bodega_origen` solo los usan los segundos; el motivo del préstamo va en
> `detalle`. Estados: `ACTIVO` / `CERRADO`.

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

### `notificacion` — campana del sistema (CU-96)
`id_notificacion` PK · `tipo` varchar(40) (comparte los literales de CU-94: `'Stock bajo umbral'`,
`'Préstamo vencido'`) · `id_empresa` · `descripcion` varchar(150) (máx. 100 caracteres útiles,
recortada igual que CU-94) · `clave_dedupe` varchar(120) **UNIQUE** · `leida` boolean (default
`false`) · `fecha_generacion` timestamptz (auto) · `fecha_leida` timestamptz (nullable).

`clave_dedupe` es `'<tipo>:<referencia>:<YYYY-MM-DD>'` (p. ej. `Préstamo vencido:12:2026-09-28`).
El `UNIQUE` es la garantía real de "no duplicar una notificación ya generada": generar dos veces
el mismo día para la misma referencia (préstamo, o bodega+tipo de equipo) intenta insertar la
misma clave y se ignora. Las notificaciones `leida=true` se purgan a los 30 días de
`fecha_generacion` (no hay endpoint de historial: es limpieza de tabla, no algo visible).

### `cierre_reparacion` — parte de inventario del cierre de reparación (CU-69)
`id_cierre_reparacion` PK · `id_cierre` (el `integracion_cierre` que lo originó) · `id_ot` ·
`id_empresa` · `id_tecnico` · `rut_cliente` · `direccion_servicio` · `falla_reportada` /
`solucion_aplicada` varchar(300) · `resultado` varchar(30) (`'Resuelto'`,
`'Resuelto parcialmente'`, `'Sin solución'`) · `resuelto_remotamente` · `categoria_falla` ·
`equipos_retirados` / `equipos_instalados` / `consumibles` JSONB · `codigo_trabajo` varchar(10)
(CU-70) · `fecha_cierre` · `fecha_registro`.

El cierre de la OT lo ejecuta G3; esta tabla guarda lo que nos toca (qué se retiró, qué se instaló
en reemplazo y qué consumibles se descontaron). Sin FK a `integracion_cierre`, igual que el resto
de las tablas de integración.

### `borrador_cierre` — cierre preparado por el técnico (CU-70)
`id_borrador` PK · `id_ot` · `id_empresa` · `id_tecnico` · `codigo_trabajo` varchar(10)
(`'T-01'`..`'T-10'`, nullable por la Excepción 1: el técnico completa a mano) · `falla_reportada` /
`solucion_aplicada` varchar(300) · `resultado` varchar(30) (`RESUELTO` | `PARCIAL` |
`SIN_SOLUCION`, los literales que envía G3) · `categoria_falla` varchar(120) ·
`fecha_actualizacion`. **UNIQUE(id_ot, id_empresa)**: un borrador por OT, que el técnico edita
hasta que llega el cierre.

El catálogo T-01..T-10 **no es una tabla**: son los 10 códigos fijos de la especificación y viven
en `src/integraciones/tipos-trabajo.ts` con los campos que precompletan cada cierre.


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
- Al pasar a `Dado de baja` (CU-78) el **motivo es obligatorio** cuando la baja se registra por el
  módulo `bajas` (lista cerrada: `Pérdida no recuperable`, `Robo confirmado`, `Falla irreparable`,
  `Obsolescencia`, `Donación a institución`, `Otro`; con `Otro` exige descripción de 5–200). Queda
  en `unidad_equipo.motivo_baja` / `motivo_baja_detalle` y se audita como `BAJA_DEFINITIVA`.
  `Dado de baja` es **terminal e irreversible**: no se agregan transiciones de salida.
- **CU-82 (transición ampliada, ratificada por el jefe de grupo):** `En préstamo externo` admite
  ahora `En revisión`, porque el retorno de un préstamo externo deja el equipo en revisión (el JSON
  del CU lo exige, y CU-76 usa la misma salida). Antes solo permitía `En bodega`. El retorno **no**
  pide diagnóstico técnico: la obligación de CU-40 aplica al cambio de estado manual, no a este flujo.
- **CU-81:** el paso a `En préstamo externo` lo hace `PrestamosService` dentro de su propia
  transacción, validando con la constante **`TRANSICIONES_PERMITIDAS`** que exporta
  `UnitsService` (la máquina de estados tiene un solo dueño). Las unidades se releen con
  `FOR UPDATE` antes de cambiarlas para que dos préstamos simultáneos no tomen la misma.
- **CU-79:** al salir de `En bodega` la unidad pierde `id_bodega_actual`, `numero_poste` y
  `ubicacion_fisica`. Las unidades `Dado de baja` quedan fuera de los conteos de stock activo
  (`bodegas`, `companies`) pero conservan su fila y su historial completo, consultables por NS.

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
- `diagramas/diagrama_modelo_fisico/modelo_relacional.png` + `.puml` — Modelo relacional (32 tablas; PK/FK).
- `diagramas/diagrama_modelo_fisico/modelo_bdd.png` + `.puml` — Modelo físico PostgreSQL 16 (32 tablas, columnas/tipos y relaciones del esquema tras migraciones de dev). Se generó desde una base QA vacía, ejecutando `init.sql` y `npm run migrar`; el esquema desplegable se mantiene en `init.sql` + `scripts/migrar.ts`.
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
