CREATE SEQUENCE IF NOT EXISTS empresa_id_empresa_seq;
CREATE SEQUENCE IF NOT EXISTS usuario_id_usuario_seq;
CREATE SEQUENCE IF NOT EXISTS rol_id_rol_seq;
CREATE SEQUENCE IF NOT EXISTS usuario_rol_id_usuario_rol_seq;
CREATE SEQUENCE IF NOT EXISTS bodega_id_bodega_seq;
CREATE SEQUENCE IF NOT EXISTS tipo_equipo_id_tipo_equipo_seq;
CREATE SEQUENCE IF NOT EXISTS unidad_equipo_id_unidad_seq;
CREATE SEQUENCE IF NOT EXISTS stock_consumible_id_stock_seq;
CREATE SEQUENCE IF NOT EXISTS historial_estado_equipo_id_historial_seq;
CREATE SEQUENCE IF NOT EXISTS transferencia_equipo_id_transferencia_seq;
CREATE SEQUENCE IF NOT EXISTS movimiento_inventario_id_movimiento_seq;
CREATE SEQUENCE IF NOT EXISTS log_auditoria_id_log_seq;

CREATE TABLE IF NOT EXISTS public.empresa (
  id_empresa integer NOT NULL DEFAULT nextval('empresa_id_empresa_seq'::regclass),
  nombre character varying NOT NULL,
  rut_empresa character varying UNIQUE,
  esquema_db character varying,
  CONSTRAINT empresa_pkey PRIMARY KEY (id_empresa)
);

CREATE TABLE IF NOT EXISTS public.usuario (
  id_usuario integer NOT NULL DEFAULT nextval('usuario_id_usuario_seq'::regclass),
  id_empresa integer,
  nombre_completo character varying NOT NULL,
  nombre_usuario character varying UNIQUE,
  email character varying UNIQUE,
  password_hash character varying NOT NULL,
  activo boolean DEFAULT true,
  intentos_fallidos integer NOT NULL DEFAULT 0,
  bloqueado_hasta timestamptz NULL,
  debe_cambiar_password boolean NOT NULL DEFAULT false,
  fecha_creacion timestamptz NULL DEFAULT now(),
  CONSTRAINT usuario_pkey PRIMARY KEY (id_usuario),
  CONSTRAINT fk_usuario_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa)
);

CREATE TABLE IF NOT EXISTS public.rol (
  id_rol integer NOT NULL DEFAULT nextval('rol_id_rol_seq'::regclass),
  nombre_rol character varying NOT NULL UNIQUE,
  descripcion text,
  CONSTRAINT rol_pkey PRIMARY KEY (id_rol)
);

CREATE TABLE IF NOT EXISTS public.usuario_rol (
  id_usuario_rol integer NOT NULL DEFAULT nextval('usuario_rol_id_usuario_rol_seq'::regclass),
  id_usuario integer,
  id_rol integer NOT NULL,
  fecha_asignacion date DEFAULT now(),
  CONSTRAINT usuario_rol_pkey PRIMARY KEY (id_usuario_rol),
  CONSTRAINT fk_usuario_rol_id_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario),
  CONSTRAINT fk_usuario_rol_id_rol FOREIGN KEY (id_rol) REFERENCES public.rol(id_rol)
);

CREATE TABLE IF NOT EXISTS public.bodega (
  id_bodega integer NOT NULL DEFAULT nextval('bodega_id_bodega_seq'::regclass),
  id_empresa integer,
  nombre character varying NOT NULL,
  direccion character varying,
  id_usuario_responsable integer,
  activa boolean DEFAULT true,
  CONSTRAINT bodega_pkey PRIMARY KEY (id_bodega),
  CONSTRAINT fk_bodega_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa)
);

CREATE TABLE IF NOT EXISTS public.tipo_equipo (
  id_tipo_equipo integer NOT NULL DEFAULT nextval('tipo_equipo_id_tipo_equipo_seq'::regclass),
  id_empresa integer,
  nombre character varying(100) NOT NULL,
  categoria character varying(40),
  marca character varying(50),
  modelo character varying(50),
  descripcion_tecnica character varying(500),
  unidad_medida character varying(20),
  garantia_dias integer DEFAULT 0,
  requiere_serie_individual boolean,
  ficha_tecnica_pdf_url text,
  ficha_tecnica_nombre character varying(255),
  activo boolean DEFAULT true,
  CONSTRAINT tipo_equipo_pkey PRIMARY KEY (id_tipo_equipo),
  CONSTRAINT fk_tipo_equipo_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa)
);

CREATE TABLE IF NOT EXISTS public.unidad_equipo (
  id_unidad integer NOT NULL DEFAULT nextval('unidad_equipo_id_unidad_seq'::regclass),
  id_tipo_equipo integer,
  id_empresa integer,
  numero_serie character varying(80) NOT NULL UNIQUE,
  modelo character varying(80),
  estado character varying(30) NOT NULL,
  fecha_adquisicion date,
  fecha_venc_garantia date,
  diagnostico_tecnico text,
  id_cliente_instalado integer,
  id_bodega_actual integer,
  numero_poste character varying(30),
  id_caja_nap integer,
  mac_address character varying(17) UNIQUE,
  proveedor character varying(80),
  observaciones character varying(300),
  ubicacion_fisica character varying(60),
  CONSTRAINT unidad_equipo_pkey PRIMARY KEY (id_unidad),
  CONSTRAINT fk_unidad_equipo_id_tipo_equipo FOREIGN KEY (id_tipo_equipo) REFERENCES public.tipo_equipo(id_tipo_equipo),
  CONSTRAINT fk_unidad_equipo_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa),
  CONSTRAINT fk_unidad_equipo_id_bodega_actual FOREIGN KEY (id_bodega_actual) REFERENCES public.bodega(id_bodega)
);

CREATE TABLE IF NOT EXISTS public.stock_consumible (
  id_stock integer NOT NULL DEFAULT nextval('stock_consumible_id_stock_seq'::regclass),
  id_tipo_equipo integer NOT NULL,
  id_bodega integer NOT NULL,
  cantidad_disponible numeric(10,2) NOT NULL DEFAULT 0,
  umbral_minimo numeric(10,2),
  CONSTRAINT stock_consumible_pkey PRIMARY KEY (id_stock),
  CONSTRAINT fk_stock_consumible_id_tipo_equipo FOREIGN KEY (id_tipo_equipo) REFERENCES public.tipo_equipo(id_tipo_equipo),
  CONSTRAINT fk_stock_consumible_id_bodega FOREIGN KEY (id_bodega) REFERENCES public.bodega(id_bodega)
);

CREATE TABLE IF NOT EXISTS public.historial_estado_equipo (
  id_historial bigint NOT NULL DEFAULT nextval('historial_estado_equipo_id_historial_seq'::regclass),
  id_unidad integer,
  id_usuario integer,
  estado_anterior character varying(30),
  estado_nuevo character varying(30),
  motivo text,
  fecha_hora timestamp without time zone DEFAULT now(),
  CONSTRAINT historial_estado_equipo_pkey PRIMARY KEY (id_historial),
  CONSTRAINT fk_historial_estado_equipo_id_unidad FOREIGN KEY (id_unidad) REFERENCES public.unidad_equipo(id_unidad),
  CONSTRAINT fk_historial_estado_equipo_id_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario)
);

CREATE TABLE IF NOT EXISTS public.transferencia_equipo (
  id_transferencia integer NOT NULL DEFAULT nextval('transferencia_equipo_id_transferencia_seq'::regclass),
  id_empresa_origen integer,
  id_empresa_destino integer,
  id_usuario_registro integer,
  fecha_transferencia date,
  observaciones text,
  CONSTRAINT transferencia_equipo_pkey PRIMARY KEY (id_transferencia),
  CONSTRAINT fk_transferencia_equipo_id_empresa_origen FOREIGN KEY (id_empresa_origen) REFERENCES public.empresa(id_empresa),
  CONSTRAINT fk_transferencia_equipo_id_empresa_destino FOREIGN KEY (id_empresa_destino) REFERENCES public.empresa(id_empresa),
  CONSTRAINT fk_transferencia_equipo_id_usuario_registro FOREIGN KEY (id_usuario_registro) REFERENCES public.usuario(id_usuario)
);

CREATE TABLE IF NOT EXISTS public.movimiento_inventario (
  id_movimiento bigint NOT NULL DEFAULT nextval('movimiento_inventario_id_movimiento_seq'::regclass),
  id_tipo_equipo integer,
  id_unidad integer,
  id_empresa_origen integer,
  id_empresa_destino integer,
  id_bodega_origen integer,
  id_bodega_destino integer,
  id_usuario integer,
  tipo_movimiento character varying(30),
  cantidad numeric(10,2) DEFAULT 1,
  fecha timestamp without time zone,
  referencia_id integer,
  CONSTRAINT movimiento_inventario_pkey PRIMARY KEY (id_movimiento),
  CONSTRAINT fk_movimiento_inventario_id_tipo_equipo FOREIGN KEY (id_tipo_equipo) REFERENCES public.tipo_equipo(id_tipo_equipo),
  CONSTRAINT fk_movimiento_inventario_id_unidad FOREIGN KEY (id_unidad) REFERENCES public.unidad_equipo(id_unidad),
  CONSTRAINT fk_movimiento_inventario_id_empresa_origen FOREIGN KEY (id_empresa_origen) REFERENCES public.empresa(id_empresa),
  CONSTRAINT fk_movimiento_inventario_id_empresa_destino FOREIGN KEY (id_empresa_destino) REFERENCES public.empresa(id_empresa),
  CONSTRAINT fk_movimiento_inventario_id_bodega_origen FOREIGN KEY (id_bodega_origen) REFERENCES public.bodega(id_bodega),
  CONSTRAINT fk_movimiento_inventario_id_bodega_destino FOREIGN KEY (id_bodega_destino) REFERENCES public.bodega(id_bodega),
  CONSTRAINT fk_movimiento_inventario_id_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario)
);

CREATE TABLE IF NOT EXISTS public.log_auditoria (
  id_log bigint NOT NULL DEFAULT nextval('log_auditoria_id_log_seq'::regclass),
  id_usuario integer NOT NULL,
  accion character varying NOT NULL,
  entidad_afectada character varying,
  id_entidad_afectada integer NOT NULL,
  valor_anterior jsonb,
  valor_nuevo jsonb NOT NULL,
  ip_origen inet,
  fecha_hora timestamptz DEFAULT now(),
  CONSTRAINT log_auditoria_pkey PRIMARY KEY (id_log),
  CONSTRAINT fk_log_auditoria_id_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario)
);
