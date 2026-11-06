-- ============================================================
--  Tablas de G1 (Inventario) que faltan en la BDD global
--  (crm_g8_prueba). Las demás tablas de G1 ya existen ahí.
--
--  Lo ejecuta quien administra esa base (dueño del esquema public),
--  conectado a crm_g8_prueba. Es idempotente.
--  Las definiciones son las mismas de database/init.sql.
-- ============================================================

BEGIN;


-- CU-69: cierre de trabajo de reparación (parte de inventario del cierre de OT de G3)
CREATE TABLE IF NOT EXISTS cierre_reparacion (
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
    codigo_trabajo       VARCHAR(10),
    fecha_cierre         TIMESTAMPTZ,
    fecha_registro       TIMESTAMPTZ DEFAULT now()
);

-- CU-70: borrador del cierre preparado por el técnico con el catálogo T-01..T-10
CREATE TABLE IF NOT EXISTS borrador_cierre (
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
);

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

-- CU-97: toma de inventario físico y ajuste de diferencias
CREATE TABLE IF NOT EXISTS toma_inventario (
    id_toma             SERIAL PRIMARY KEY,
    id_bodega           INTEGER NOT NULL REFERENCES bodega(id_bodega),
    id_empresa          INTEGER NOT NULL,
    estado              VARCHAR(20) NOT NULL DEFAULT 'ABIERTA'
                        CHECK (estado IN ('ABIERTA', 'CONFIRMADA', 'CANCELADA')),
    id_usuario_apertura INTEGER NOT NULL REFERENCES usuario(id_usuario),
    id_usuario_cierre   INTEGER REFERENCES usuario(id_usuario),
    fecha_apertura      TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_cierre        TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_toma_abierta_por_bodega
    ON toma_inventario (id_bodega) WHERE estado = 'ABIERTA';
CREATE TABLE IF NOT EXISTS toma_inventario_detalle (
    id_detalle        SERIAL PRIMARY KEY,
    id_toma           INTEGER NOT NULL REFERENCES toma_inventario(id_toma) ON DELETE CASCADE,
    id_tipo_equipo    INTEGER REFERENCES tipo_equipo(id_tipo_equipo),
    id_unidad         INTEGER REFERENCES unidad_equipo(id_unidad),
    numero_serie      VARCHAR(80),
    es_esperada       BOOLEAN NOT NULL DEFAULT true,
    cantidad_esperada NUMERIC(10,2) NOT NULL DEFAULT 0,
    cantidad_contada  NUMERIC(10,2),
    resultado         VARCHAR(20)
);
CREATE INDEX IF NOT EXISTS idx_toma_detalle_toma ON toma_inventario_detalle (id_toma);

COMMIT;
