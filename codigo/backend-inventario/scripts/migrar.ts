/**
 * Migración de esquema (idempotente).
 *
 * CU-24: agrega a tipo_equipo las columnas marca, modelo, descripción técnica,
 * unidad de medida y garantía en días.
 *
 * Uso: npm run migrar
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';

const TABLAS_BASE_SQL = `
CREATE TABLE IF NOT EXISTS empresa (
    id_empresa   SERIAL PRIMARY KEY,
    nombre       VARCHAR(100) NOT NULL
);
CREATE TABLE IF NOT EXISTS rol (
    id_rol      SERIAL PRIMARY KEY,
    nombre_rol  VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(200)
);
CREATE TABLE IF NOT EXISTS usuario (
    id_usuario           SERIAL PRIMARY KEY,
    id_empresa           INTEGER,
    nombre_completo      VARCHAR(150) NOT NULL,
    nombre_usuario       VARCHAR(50) UNIQUE,
    email                VARCHAR(150) UNIQUE,
    password_hash        VARCHAR(255) NOT NULL,
    activo               BOOLEAN DEFAULT TRUE,
    intentos_fallidos    INTEGER NOT NULL DEFAULT 0,
    bloqueado_hasta      TIMESTAMPTZ,
    debe_cambiar_password BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion       TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS usuario_rol (
    id_usuario_rol  SERIAL PRIMARY KEY,
    id_usuario      INTEGER,
    id_rol          INTEGER NOT NULL,
    fecha_asignacion TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT fk_usuario_rol_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
    CONSTRAINT fk_usuario_rol_rol     FOREIGN KEY (id_rol)     REFERENCES rol (id_rol)
);
CREATE TABLE IF NOT EXISTS bodega (
    id_bodega             SERIAL PRIMARY KEY,
    id_empresa            INTEGER,
    nombre                VARCHAR(100) NOT NULL,
    direccion             VARCHAR(200),
    id_usuario_responsable INTEGER,
    activa                BOOLEAN DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS tipo_equipo (
    id_tipo_equipo           SERIAL PRIMARY KEY,
    id_empresa               INTEGER,
    nombre                   VARCHAR(100) NOT NULL,
    categoria                VARCHAR(40),
    marca                    VARCHAR(50),
    modelo                   VARCHAR(50),
    descripcion_tecnica      VARCHAR(500),
    unidad_medida            VARCHAR(20),
    garantia_dias            INTEGER DEFAULT 0,
    requiere_serie_individual BOOLEAN,
    ficha_tecnica_pdf_url    TEXT,
    ficha_tecnica_nombre     VARCHAR(255),
    activo                   BOOLEAN DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS unidad_equipo (
    id_unidad              SERIAL PRIMARY KEY,
    id_tipo_equipo         INTEGER,
    id_empresa             INTEGER,
    numero_serie           VARCHAR(80) NOT NULL UNIQUE,
    modelo                 VARCHAR(80),
    estado                 VARCHAR(30) NOT NULL,
    fecha_adquisicion      DATE,
    fecha_venc_garantia    DATE,
    diagnostico_tecnico    TEXT,
    id_cliente_instalado   INTEGER,
    id_bodega_actual       INTEGER,
    numero_poste           VARCHAR(30),
    id_caja_nap            INTEGER,
    mac_address            VARCHAR(17) UNIQUE,
    proveedor              VARCHAR(80),
    observaciones          VARCHAR(300),
    ubicacion_fisica       VARCHAR(60),
    CONSTRAINT fk_unidad_tipo_equipo FOREIGN KEY (id_tipo_equipo) REFERENCES tipo_equipo (id_tipo_equipo)
);
CREATE TABLE IF NOT EXISTS historial_estado_equipo (
    id_historial     SERIAL PRIMARY KEY,
    id_unidad        INTEGER,
    id_usuario       INTEGER,
    estado_anterior  VARCHAR(30),
    estado_nuevo     VARCHAR(30),
    motivo           TEXT,
    fecha_hora       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_historial_unidad FOREIGN KEY (id_unidad) REFERENCES unidad_equipo (id_unidad) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS log_auditoria (
    id_log             SERIAL PRIMARY KEY,
    id_usuario         INTEGER NOT NULL,
    accion             VARCHAR(100) NOT NULL,
    entidad_afectada   VARCHAR(100),
    id_entidad_afectada INTEGER NOT NULL,
    valor_anterior     JSONB,
    valor_nuevo        JSONB NOT NULL,
    ip_origen          INET,
    fecha_hora         TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS transferencia_equipo (
    id_transferencia      SERIAL PRIMARY KEY,
    id_empresa_origen     INTEGER,
    id_empresa_destino    INTEGER,
    id_usuario_registro   INTEGER,
    fecha_transferencia   DATE,
    observaciones         TEXT
);
CREATE TABLE IF NOT EXISTS movimiento_inventario (
    id_movimiento         SERIAL PRIMARY KEY,
    id_tipo_equipo        INTEGER,
    id_unidad             INTEGER,
    id_empresa_origen     INTEGER,
    id_empresa_destino    INTEGER,
    id_bodega_origen      INTEGER,
    id_bodega_destino     INTEGER,
    id_usuario            INTEGER,
    tipo_movimiento       VARCHAR(30),
    cantidad              NUMERIC(10,2) DEFAULT 1,
    fecha                 TIMESTAMP,
    referencia_id         INTEGER
);
CREATE TABLE IF NOT EXISTS stock_consumible (
    id_stock             SERIAL PRIMARY KEY,
    id_tipo_equipo       INTEGER NOT NULL,
    id_bodega            INTEGER NOT NULL,
    cantidad_disponible  NUMERIC(10,2) DEFAULT 0,
    umbral_minimo        NUMERIC(10,2),
    CONSTRAINT fk_stock_bodega      FOREIGN KEY (id_bodega)      REFERENCES bodega (id_bodega),
    CONSTRAINT fk_stock_tipo_equipo FOREIGN KEY (id_tipo_equipo) REFERENCES tipo_equipo (id_tipo_equipo)
);
CREATE TABLE IF NOT EXISTS prestamo_externo (
    id_prestamo             SERIAL PRIMARY KEY,
    tipo                    VARCHAR(30) NOT NULL,
    id_empresa              INTEGER NOT NULL,
    id_unidad               INTEGER REFERENCES unidad_equipo (id_unidad),
    nombre_receptor         VARCHAR(80) NOT NULL,
    rut_receptor            VARCHAR(12),
    fecha_salida            TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_retorno_estimada  DATE NOT NULL,
    fecha_retorno_real      DATE,
    detalle                 TEXT NOT NULL,
    estado                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    id_usuario_registro     INTEGER NOT NULL
);
`;

const TABLAS_CU49_SQL = `
CREATE TABLE IF NOT EXISTS proveedor (
    id_proveedor     SERIAL PRIMARY KEY,
    nombre_comercial VARCHAR(100) NOT NULL,
    rut              VARCHAR(12) NOT NULL UNIQUE,
    nombre_contacto  VARCHAR(80),
    telefono         VARCHAR(15),
    email            VARCHAR(150),
    activa           BOOLEAN DEFAULT TRUE,
    fecha_creacion   TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS proveedor_tipo_equipo (
    id               SERIAL PRIMARY KEY,
    id_proveedor     INTEGER NOT NULL,
    id_tipo_equipo   INTEGER NOT NULL,
    CONSTRAINT fk_pte_proveedor   FOREIGN KEY (id_proveedor)   REFERENCES proveedor (id_proveedor) ON DELETE CASCADE,
    CONSTRAINT fk_pte_tipo_equipo FOREIGN KEY (id_tipo_equipo) REFERENCES tipo_equipo (id_tipo_equipo) ON DELETE CASCADE,
    CONSTRAINT uq_pte             UNIQUE (id_proveedor, id_tipo_equipo)
);
`;

// CU-52: tablas de órdenes de ingreso desde proveedor
const TABLAS_CU52_SQL = `
CREATE TABLE IF NOT EXISTS orden_ingreso (
    id_orden             SERIAL PRIMARY KEY,
    correlativo          VARCHAR(10) NOT NULL UNIQUE,
    id_proveedor         INTEGER NOT NULL,
    numero_documento     VARCHAR(30) NOT NULL,
    fecha_documento      DATE NOT NULL,
    id_empresa_destino   INTEGER NOT NULL,
    id_bodega_destino    INTEGER NOT NULL,
    estado               VARCHAR(30) NOT NULL DEFAULT 'Pendiente de recepción',
    id_usuario_registro  INTEGER NOT NULL,
    fecha_creacion       TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT fk_oi_proveedor FOREIGN KEY (id_proveedor) REFERENCES proveedor (id_proveedor),
    CONSTRAINT fk_oi_bodega    FOREIGN KEY (id_bodega_destino) REFERENCES bodega (id_bodega)
);
CREATE TABLE IF NOT EXISTS orden_ingreso_detalle (
    id_detalle           SERIAL PRIMARY KEY,
    id_orden             INTEGER NOT NULL,
    id_tipo_equipo       INTEGER NOT NULL,
    cantidad_esperada    INTEGER NOT NULL CHECK (cantidad_esperada > 0),
    garantia_dias        INTEGER NOT NULL DEFAULT 0 CHECK (garantia_dias >= 0 AND garantia_dias <= 3650),
    cantidad_recibida    INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT fk_oid_orden       FOREIGN KEY (id_orden)       REFERENCES orden_ingreso (id_orden) ON DELETE CASCADE,
    CONSTRAINT fk_oid_tipo_equipo FOREIGN KEY (id_tipo_equipo) REFERENCES tipo_equipo (id_tipo_equipo)
);
`;

const SENTENCIAS = [
  // CU-24
  `ALTER TABLE tipo_equipo ADD COLUMN IF NOT EXISTS marca varchar(50)`,
  `ALTER TABLE tipo_equipo ADD COLUMN IF NOT EXISTS modelo varchar(50)`,
  `ALTER TABLE tipo_equipo ADD COLUMN IF NOT EXISTS descripcion_tecnica varchar(500)`,
  `ALTER TABLE tipo_equipo ADD COLUMN IF NOT EXISTS unidad_medida varchar(20)`,
  `ALTER TABLE tipo_equipo ADD COLUMN IF NOT EXISTS garantia_dias integer DEFAULT 0`,
  // CU-29: nombre original del archivo de ficha técnica adjunto
  `ALTER TABLE tipo_equipo ADD COLUMN IF NOT EXISTS ficha_tecnica_nombre varchar(255)`,
  // CU-41/CU-42: responsable de bodega
  `ALTER TABLE bodega ADD COLUMN IF NOT EXISTS id_usuario_responsable integer`,
  // CU-32/CU-33/CU-34: proveedor, observaciones y ubicación física de la unidad
  `ALTER TABLE unidad_equipo ADD COLUMN IF NOT EXISTS proveedor varchar(80)`,
  `ALTER TABLE unidad_equipo ADD COLUMN IF NOT EXISTS observaciones varchar(300)`,
  `ALTER TABLE unidad_equipo ADD COLUMN IF NOT EXISTS ubicacion_fisica varchar(60)`,
  // sc-113 (integración G3): cierres de OT recibidos por webhook, con idempotencia
  `CREATE TABLE IF NOT EXISTS integracion_cierre (
    id_cierre           SERIAL PRIMARY KEY,
    clave_idempotencia  VARCHAR(120) NOT NULL UNIQUE,
    id_ot               INTEGER NOT NULL,
    id_empresa          INTEGER NOT NULL,
    tipo_ot             VARCHAR(30),
    payload             JSONB NOT NULL,
    estado_proceso      VARCHAR(40) NOT NULL DEFAULT 'PROCESADO',
    discrepancias       JSONB,
    acciones_aplicadas  JSONB,
    fecha_proceso       TIMESTAMPTZ DEFAULT now()
  )`,
  // CU-69: cierre de trabajo de reparación recibido en el cierre de OT (doc-12 §1.3)
  `CREATE TABLE IF NOT EXISTS cierre_reparacion (
    id_cierre_reparacion SERIAL PRIMARY KEY,
    id_cierre            INTEGER,
    id_ot                INTEGER NOT NULL,
    id_empresa           INTEGER NOT NULL,
    id_tecnico           INTEGER,
    rut_cliente          VARCHAR(12),
    direccion_servicio   VARCHAR(200),
    falla_reportada      VARCHAR(300) NOT NULL,
    solucion_aplicada    VARCHAR(300) NOT NULL,
    resultado            VARCHAR(30) NOT NULL,
    resuelto_remotamente BOOLEAN NOT NULL DEFAULT false,
    categoria_falla      VARCHAR(120),
    equipos_retirados    JSONB,
    equipos_instalados   JSONB,
    consumibles          JSONB,
    fecha_cierre         TIMESTAMPTZ,
    fecha_registro       TIMESTAMPTZ DEFAULT now()
  )`,
  // CU-70: tipo de trabajo codificado con el que se cerró la reparación
  `ALTER TABLE cierre_reparacion ADD COLUMN IF NOT EXISTS codigo_trabajo varchar(10)`,
  // CU-70: borrador del cierre que el técnico prepara en terreno (uno por OT)
  `CREATE TABLE IF NOT EXISTS borrador_cierre (
    id_borrador         SERIAL PRIMARY KEY,
    id_ot               INTEGER NOT NULL,
    id_empresa          INTEGER NOT NULL,
    id_tecnico          INTEGER NOT NULL,
    codigo_trabajo      VARCHAR(10),
    falla_reportada     VARCHAR(300),
    solucion_aplicada   VARCHAR(300),
    resultado           VARCHAR(30),
    categoria_falla     VARCHAR(120),
    fecha_actualizacion TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_borrador_cierre_ot UNIQUE (id_ot, id_empresa)
)`,
  // CU-57: técnico asignado a la unidad (estado 'Asignado a técnico')
  `ALTER TABLE unidad_equipo ADD COLUMN IF NOT EXISTS id_tecnico_asignado integer`,
  // CU-57: salidas de bodega a técnico (cabecera + detalle)
  `CREATE TABLE IF NOT EXISTS salida_bodega (
    id_salida           SERIAL PRIMARY KEY,
    id_tecnico          INTEGER NOT NULL,
    id_bodega_origen    INTEGER NOT NULL,
    fecha_hora          TIMESTAMPTZ DEFAULT now(),
    id_empresa          INTEGER,
    id_usuario_registro INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS salida_detalle (
    id_detalle      SERIAL PRIMARY KEY,
    id_salida       INTEGER NOT NULL,
    id_tipo_equipo  INTEGER,
    id_unidad       INTEGER,
    cantidad        NUMERIC(10,2),
    CONSTRAINT fk_salida_detalle_salida FOREIGN KEY (id_salida) REFERENCES salida_bodega (id_salida) ON DELETE CASCADE
  )`,
  // CU-58: inventario personal del técnico (solo consumibles, por saldo)
  `CREATE TABLE IF NOT EXISTS inventario_personal_tecnico (
    id_inventario      SERIAL PRIMARY KEY,
    id_tecnico         INTEGER NOT NULL,
    id_tipo_equipo     INTEGER NOT NULL,
    cantidad           NUMERIC(10,2) DEFAULT 0,
    fecha_actualizacion TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_inventario_tecnico_tipo UNIQUE (id_tecnico, id_tipo_equipo)
  )`,
  // CU-76: resultado del servicio (REPARADO/NO_REPARADO) al cerrar el préstamo
  `ALTER TABLE prestamo_externo ADD COLUMN IF NOT EXISTS resultado varchar(20)`,
  // CU-78/CU-80: motivo de la baja definitiva y su descripción cuando es 'Otro'
  `ALTER TABLE unidad_equipo ADD COLUMN IF NOT EXISTS motivo_baja varchar(40)`,
  `ALTER TABLE unidad_equipo ADD COLUMN IF NOT EXISTS motivo_baja_detalle varchar(200)`,
  // CU-81: los préstamos por lote agregan correlativo y bodega de origen sobre la
  // cabecera que ya define CU-75 (misma tabla, un solo dueño de la entidad)
  `ALTER TABLE prestamo_externo ADD COLUMN IF NOT EXISTS correlativo varchar(12)`,
  `ALTER TABLE prestamo_externo ADD COLUMN IF NOT EXISTS id_bodega_origen integer`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ux_prestamo_externo_correlativo ON prestamo_externo (correlativo)`,
  // CU-81: la cabecera de CU-75 exige detalle e id_empresa; los préstamos por lote
  // no fijan una sola unidad, así que id_unidad debe admitir null
  `ALTER TABLE prestamo_externo ALTER COLUMN id_unidad DROP NOT NULL`,
  // sc-158 (acuerdo G8 v1): histórico equipo ↔ servicio. Los IDs de G8 son
  // referencias externas sin FK; id_unidad sí referencia a unidad_equipo.
  `CREATE TABLE IF NOT EXISTS asignacion_equipo_servicio (
    id_asignacion         SERIAL PRIMARY KEY,
    id_unidad             INTEGER NOT NULL,
    id_empresa            INTEGER NOT NULL,
    event_id              VARCHAR(100),
    id_cliente_externo    INTEGER,
    rut_cliente           VARCHAR(20),
    id_servicio_externo   INTEGER NOT NULL,
    id_contrato_externo   INTEGER,
    id_ot                 INTEGER,
    fecha_instalacion     TIMESTAMPTZ NOT NULL,
    fecha_retiro          TIMESTAMPTZ,
    activa                BOOLEAN NOT NULL DEFAULT TRUE,
    origen                VARCHAR(30),
    trace_id              VARCHAR(100),
    CONSTRAINT fk_asignacion_unidad FOREIGN KEY (id_unidad) REFERENCES unidad_equipo (id_unidad)
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ux_asignacion_evento_unidad ON asignacion_equipo_servicio (event_id, id_unidad)`,
  `CREATE INDEX IF NOT EXISTS ix_asignacion_empresa_servicio_activa ON asignacion_equipo_servicio (id_empresa, id_servicio_externo, activa)`,
  // sc-158 (acuerdo G8 v1): cabecera del evento de activación (idempotencia por event_id).
  // event_id nulo = registro PENDIENTE_ACTIVACION de un cierre al que aún no llega la activación.
  `CREATE TABLE IF NOT EXISTS integracion_activacion (
    id_activacion         SERIAL PRIMARY KEY,
    event_id              VARCHAR(100) UNIQUE,
    trace_id              VARCHAR(100),
    id_empresa            INTEGER NOT NULL,
    id_ot                 INTEGER,
    id_cliente_externo    INTEGER,
    rut_cliente           VARCHAR(20),
    id_servicio_externo   INTEGER,
    id_contrato_externo   INTEGER,
    payload               JSONB,
    estado_proceso        VARCHAR(40) NOT NULL,
    equipos_asociados     JSONB,
    discrepancias         JSONB,
    fecha_proceso         TIMESTAMPTZ DEFAULT now()
  )`,
  // CU-64 (D): SRV-YYYY-XXXXX y técnico del cierre + resultado de materiales.
  // El SRV identifica el servicio (OT): un re-cierre conserva el SRV original,
  // por eso no lleva UNIQUE por fila (la secuencia por empresa/año garantiza que
  // dos OTs distintas nunca reciban el mismo SRV).
  `ALTER TABLE integracion_cierre ADD COLUMN IF NOT EXISTS srv varchar(20)`,
  `ALTER TABLE integracion_cierre ADD COLUMN IF NOT EXISTS id_tecnico integer`,
  `ALTER TABLE integracion_cierre ADD COLUMN IF NOT EXISTS materiales_aplicados jsonb`,
  // CU-64 (D): secuencia del identificador de servicio por empresa y año.
  `CREATE TABLE IF NOT EXISTS secuencia_srv (
    id_empresa  INTEGER NOT NULL,
    anio        INTEGER NOT NULL,
    ultimo      INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (id_empresa, anio)
  )`,
  // CU-64 (B): cliente/dirección persistidos del cierre de instalación + SRV vigente.
  `ALTER TABLE unidad_equipo ADD COLUMN IF NOT EXISTS cliente_rut varchar(20)`,
  `ALTER TABLE unidad_equipo ADD COLUMN IF NOT EXISTS cliente_nombre varchar(150)`,
  `ALTER TABLE unidad_equipo ADD COLUMN IF NOT EXISTS direccion_instalacion varchar(300)`,
  `ALTER TABLE unidad_equipo ADD COLUMN IF NOT EXISTS comuna_instalacion varchar(100)`,
  `ALTER TABLE unidad_equipo ADD COLUMN IF NOT EXISTS srv varchar(20)`,
  // CU-48: RUT del usuario para la ubicación externa de equipos asignados.
  `ALTER TABLE usuario ADD COLUMN IF NOT EXISTS rut varchar(12)`,
];

// CU-78/CU-80/CU-81: tablas de bajas, donaciones y detalle de préstamos externos.
// La cabecera prestamo_externo la define TABLAS_BASE_SQL (CU-75): este módulo la
// reutiliza y solo agrega las columnas que necesitan los préstamos por lote.
const TABLAS_G4_SQL = `
CREATE TABLE IF NOT EXISTS solicitud_baja (
    id_solicitud            SERIAL PRIMARY KEY,
    id_unidad               INTEGER NOT NULL,
    id_empresa              INTEGER,
    id_usuario_solicitante  INTEGER NOT NULL,
    motivo                  VARCHAR(40) NOT NULL,
    motivo_otro             VARCHAR(200),
    estado                  VARCHAR(30) NOT NULL,
    id_usuario_aprobador    INTEGER,
    fecha_solicitud         TIMESTAMPTZ DEFAULT now(),
    fecha_resolucion        TIMESTAMPTZ,
    motivo_rechazo          VARCHAR(200),
    CONSTRAINT fk_solicitud_baja_unidad FOREIGN KEY (id_unidad) REFERENCES unidad_equipo (id_unidad)
);
CREATE TABLE IF NOT EXISTS donacion (
    id_donacion        SERIAL PRIMARY KEY,
    nombre_institucion VARCHAR(100) NOT NULL,
    rut_institucion    VARCHAR(12) NOT NULL,
    fecha_donacion     DATE NOT NULL,
    numero_resolucion  VARCHAR(30),
    id_usuario         INTEGER NOT NULL,
    id_empresa         INTEGER,
    fecha_creacion     TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS donacion_detalle (
    id_detalle   SERIAL PRIMARY KEY,
    id_donacion  INTEGER NOT NULL,
    id_unidad    INTEGER NOT NULL,
    CONSTRAINT fk_donacion_detalle_donacion FOREIGN KEY (id_donacion) REFERENCES donacion (id_donacion),
    CONSTRAINT fk_donacion_detalle_unidad   FOREIGN KEY (id_unidad)   REFERENCES unidad_equipo (id_unidad)
);
CREATE TABLE IF NOT EXISTS prestamo_detalle (
    id_detalle         SERIAL PRIMARY KEY,
    id_prestamo        INTEGER NOT NULL,
    id_unidad          INTEGER,
    id_tipo_equipo     INTEGER,
    cantidad           NUMERIC(10,2),
    cantidad_retornada NUMERIC(10,2) DEFAULT 0,
    CONSTRAINT fk_prestamo_detalle_prestamo FOREIGN KEY (id_prestamo) REFERENCES prestamo_externo (id_prestamo) ON DELETE CASCADE,
    CONSTRAINT fk_prestamo_detalle_unidad   FOREIGN KEY (id_unidad)   REFERENCES unidad_equipo (id_unidad)
);
CREATE TABLE IF NOT EXISTS prestamo_retorno (
    id_retorno     SERIAL PRIMARY KEY,
    id_detalle     INTEGER NOT NULL,
    cantidad       NUMERIC(10,2),
    fecha_retorno  TIMESTAMPTZ NOT NULL,
    observacion    VARCHAR(300),
    id_usuario     INTEGER NOT NULL,
    CONSTRAINT fk_prestamo_retorno_detalle FOREIGN KEY (id_detalle) REFERENCES prestamo_detalle (id_detalle) ON DELETE CASCADE
);
`;

// CU-96: notificaciones persistidas de la campana (préstamo vencido + stock
// bajo umbral). clave_dedupe es UNIQUE: es la que garantiza no duplicar una
// notificación ya generada el mismo día para la misma referencia.
const TABLAS_CU96_SQL = `
CREATE TABLE IF NOT EXISTS notificacion (
    id_notificacion   SERIAL PRIMARY KEY,
    tipo              VARCHAR(40) NOT NULL,
    id_empresa        INTEGER NOT NULL,
    descripcion       VARCHAR(150) NOT NULL,
    clave_dedupe      VARCHAR(120) NOT NULL UNIQUE,
    leida             BOOLEAN NOT NULL DEFAULT false,
    fecha_generacion  TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_leida       TIMESTAMPTZ
);
`;

async function main() {
  const ds = new DataSource({ type: 'postgres', url: process.env.DATABASE_URL });
  await ds.initialize();

  // Asegurar que las tablas base existan independientemente del entorno (Railway / Docker local)
  await ds.query(TABLAS_BASE_SQL);
  console.log('✓ Tablas base inicializadas / comprobadas.');

  // CU-49: tablas de proveedores
  await ds.query(TABLAS_CU49_SQL);
  console.log('✓ Tablas proveedor / proveedor_tipo_equipo inicializadas / comprobadas.');

  // CU-52: tablas de órdenes de ingreso
  await ds.query(TABLAS_CU52_SQL);
  console.log('✓ Tablas orden_ingreso / orden_ingreso_detalle inicializadas / comprobadas.');

  // CU-78/CU-80/CU-81: tablas de bajas, donaciones y detalle de préstamos
  await ds.query(TABLAS_G4_SQL);
  console.log('✓ Tablas solicitud_baja / donacion / prestamo_detalle inicializadas / comprobadas.');

  // CU-96: tabla de notificaciones de la campana
  await ds.query(TABLAS_CU96_SQL);
  console.log('✓ Tabla notificacion inicializada / comprobada.');

  for (const sql of SENTENCIAS) {
    await ds.query(sql);
    console.log(`✓ ${sql}`);
  }
  await ds.destroy();
  console.log('Migración completada.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

