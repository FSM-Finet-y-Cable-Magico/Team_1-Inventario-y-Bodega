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
];

async function main() {
  const ds = new DataSource({ type: 'postgres', url: process.env.DATABASE_URL });
  await ds.initialize();

  // Asegurar que las tablas base existan independientemente del entorno (Railway / Docker local)
  await ds.query(TABLAS_BASE_SQL);
  console.log('✓ Tablas base inicializadas / comprobadas.');

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

