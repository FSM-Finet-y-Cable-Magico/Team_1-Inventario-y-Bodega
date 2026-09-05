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
    id_usuario_registro     INTEGER NOT NULL
);