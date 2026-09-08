-- ============================================================
--  Inventario y Bodega · Esquema PostgreSQL inicial
--  Se ejecuta automáticamente la primera vez que el contenedor
--  de la base de datos arranca con un volumen vacío.
--  Refleja las entidades de TypeORM del backend.
-- ============================================================

-- Empresas del sistema (Finet = 1, Cable Mágico = 2)
CREATE TABLE IF NOT EXISTS empresa (
    id_empresa   SERIAL PRIMARY KEY,
    nombre       VARCHAR(100) NOT NULL
);

-- Roles
CREATE TABLE IF NOT EXISTS rol (
    id_rol      SERIAL PRIMARY KEY,
    nombre_rol  VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(200)
);

-- Usuarios
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

-- Relación usuario <-> rol
CREATE TABLE IF NOT EXISTS usuario_rol (
    id_usuario_rol  SERIAL PRIMARY KEY,
    id_usuario      INTEGER,
    id_rol          INTEGER NOT NULL,
    fecha_asignacion TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT fk_usuario_rol_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
    CONSTRAINT fk_usuario_rol_rol     FOREIGN KEY (id_rol)     REFERENCES rol (id_rol)
);

-- Bodegas
CREATE TABLE IF NOT EXISTS bodega (
    id_bodega             SERIAL PRIMARY KEY,
    id_empresa            INTEGER,
    nombre                VARCHAR(100) NOT NULL,
    direccion             VARCHAR(200),
    id_usuario_responsable INTEGER,
    activa                BOOLEAN DEFAULT TRUE
);

-- Tipos de equipo (catálogo)
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

-- Unidades de equipo (serializadas)
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
    motivo_baja            VARCHAR(40),
    motivo_baja_detalle    VARCHAR(200),
    CONSTRAINT fk_unidad_tipo_equipo FOREIGN KEY (id_tipo_equipo) REFERENCES tipo_equipo (id_tipo_equipo)
);

-- Historial de estados de una unidad
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

-- Log de auditoría
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

-- Transferencias entre empresas
CREATE TABLE IF NOT EXISTS transferencia_equipo (
    id_transferencia      SERIAL PRIMARY KEY,
    id_empresa_origen     INTEGER,
    id_empresa_destino    INTEGER,
    id_usuario_registro   INTEGER,
    fecha_transferencia   DATE,
    observaciones         TEXT
);

-- Movimientos de inventario
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

-- Proveedores (CU-49) — globales, sin id_empresa (compartidos entre ambas empresas)
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

-- Tabla puente N:M proveedor ↔ tipo_equipo (CU-49)
CREATE TABLE IF NOT EXISTS proveedor_tipo_equipo (
    id               SERIAL PRIMARY KEY,
    id_proveedor     INTEGER NOT NULL,
    id_tipo_equipo   INTEGER NOT NULL,
    CONSTRAINT fk_pte_proveedor   FOREIGN KEY (id_proveedor)   REFERENCES proveedor (id_proveedor) ON DELETE CASCADE,
    CONSTRAINT fk_pte_tipo_equipo FOREIGN KEY (id_tipo_equipo) REFERENCES tipo_equipo (id_tipo_equipo) ON DELETE CASCADE,
    CONSTRAINT uq_pte             UNIQUE (id_proveedor, id_tipo_equipo)
);

-- Órdenes de ingreso desde proveedor (CU-52)
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

-- Detalle de ítems de una orden de ingreso (CU-52)
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

-- CU-78: solicitudes de baja definitiva generadas por técnicos de terreno
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

-- CU-80: donaciones de equipos dados de baja
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

-- CU-81/CU-82: ítems y retornos de los préstamos externos por lote
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

-- Stock de consumibles por bodega
CREATE TABLE IF NOT EXISTS stock_consumible (
    id_stock             SERIAL PRIMARY KEY,
    id_tipo_equipo       INTEGER NOT NULL,
    id_bodega            INTEGER NOT NULL,
    cantidad_disponible  NUMERIC(10,2) DEFAULT 0,
    umbral_minimo        NUMERIC(10,2),
    CONSTRAINT fk_stock_bodega      FOREIGN KEY (id_bodega)      REFERENCES bodega (id_bodega),
    CONSTRAINT fk_stock_tipo_equipo FOREIGN KEY (id_tipo_equipo) REFERENCES tipo_equipo (id_tipo_equipo)
);

-- Reparación externa y préstamos externos
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
    resultado               VARCHAR(20),
    id_usuario_registro     INTEGER NOT NULL,
    -- CU-81: préstamos por lote sobre la misma cabecera
    correlativo             VARCHAR(12) UNIQUE,
    id_bodega_origen        INTEGER
);

-- Cierres de OT recibidos por integración (webhook de G3) — sc-113
-- Idempotencia por clave_idempotencia: "{id_ot}:{fecha_completada ISO}"
CREATE TABLE IF NOT EXISTS integracion_cierre (
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
);

-- Salidas de bodega a técnico (CU-57/59/60/62)
CREATE TABLE IF NOT EXISTS salida_bodega (
    id_salida           SERIAL PRIMARY KEY,
    id_tecnico          INTEGER NOT NULL,
    id_bodega_origen    INTEGER NOT NULL,
    fecha_hora          TIMESTAMPTZ DEFAULT now(),
    id_empresa          INTEGER,
    id_usuario_registro INTEGER
);

-- Detalle de la salida: o id_unidad (equipo individualizable) o id_tipo_equipo + cantidad (consumible)
CREATE TABLE IF NOT EXISTS salida_detalle (
    id_detalle      SERIAL PRIMARY KEY,
    id_salida       INTEGER NOT NULL,
    id_tipo_equipo  INTEGER,
    id_unidad       INTEGER,
    cantidad        NUMERIC(10,2),
    CONSTRAINT fk_salida_detalle_salida FOREIGN KEY (id_salida) REFERENCES salida_bodega (id_salida) ON DELETE CASCADE
);

-- Inventario personal del técnico (CU-58): saldo de consumibles por tipo
CREATE TABLE IF NOT EXISTS inventario_personal_tecnico (
    id_inventario       SERIAL PRIMARY KEY,
    id_tecnico          INTEGER NOT NULL,
    id_tipo_equipo      INTEGER NOT NULL,
    cantidad            NUMERIC(10,2) DEFAULT 0,
    fecha_actualizacion TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_inventario_tecnico_tipo UNIQUE (id_tecnico, id_tipo_equipo)
);

-- CU-57: técnico que tiene asignada la unidad
ALTER TABLE unidad_equipo ADD COLUMN IF NOT EXISTS id_tecnico_asignado INTEGER;
