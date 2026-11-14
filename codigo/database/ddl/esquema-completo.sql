--
-- PostgreSQL database dump
--



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: asignacion_equipo_servicio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asignacion_equipo_servicio (
    id_asignacion integer NOT NULL,
    id_unidad integer NOT NULL,
    id_empresa integer NOT NULL,
    event_id character varying(100),
    id_cliente_externo integer,
    rut_cliente character varying(20),
    id_servicio_externo integer NOT NULL,
    id_contrato_externo integer,
    id_ot integer,
    fecha_instalacion timestamp with time zone NOT NULL,
    fecha_retiro timestamp with time zone,
    activa boolean DEFAULT true NOT NULL,
    origen character varying(30),
    trace_id character varying(100)
);


--
-- Name: asignacion_equipo_servicio_id_asignacion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.asignacion_equipo_servicio_id_asignacion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: asignacion_equipo_servicio_id_asignacion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.asignacion_equipo_servicio_id_asignacion_seq OWNED BY public.asignacion_equipo_servicio.id_asignacion;


--
-- Name: bodega; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bodega (
    id_bodega integer NOT NULL,
    id_empresa integer,
    nombre character varying(100) NOT NULL,
    direccion character varying(200),
    id_usuario_responsable integer,
    activa boolean DEFAULT true
);


--
-- Name: bodega_id_bodega_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bodega_id_bodega_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bodega_id_bodega_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bodega_id_bodega_seq OWNED BY public.bodega.id_bodega;


--
-- Name: borrador_cierre; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.borrador_cierre (
    id_borrador integer NOT NULL,
    id_ot integer NOT NULL,
    id_empresa integer NOT NULL,
    id_tecnico integer NOT NULL,
    codigo_trabajo character varying(10),
    falla_reportada character varying(300),
    solucion_aplicada character varying(300),
    resultado character varying(30),
    categoria_falla character varying(120),
    fecha_actualizacion timestamp with time zone DEFAULT now()
);


--
-- Name: borrador_cierre_id_borrador_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.borrador_cierre_id_borrador_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: borrador_cierre_id_borrador_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.borrador_cierre_id_borrador_seq OWNED BY public.borrador_cierre.id_borrador;


--
-- Name: cierre_reparacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cierre_reparacion (
    id_cierre_reparacion integer NOT NULL,
    id_cierre integer,
    id_ot integer NOT NULL,
    id_empresa integer NOT NULL,
    id_tecnico integer,
    rut_cliente character varying(12),
    direccion_servicio character varying(200),
    falla_reportada character varying(300) NOT NULL,
    solucion_aplicada character varying(300) NOT NULL,
    resultado character varying(30) NOT NULL,
    resuelto_remotamente boolean DEFAULT false NOT NULL,
    categoria_falla character varying(120),
    equipos_retirados jsonb,
    equipos_instalados jsonb,
    consumibles jsonb,
    codigo_trabajo character varying(10),
    fecha_cierre timestamp with time zone,
    fecha_registro timestamp with time zone DEFAULT now()
);


--
-- Name: cierre_reparacion_id_cierre_reparacion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cierre_reparacion_id_cierre_reparacion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cierre_reparacion_id_cierre_reparacion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cierre_reparacion_id_cierre_reparacion_seq OWNED BY public.cierre_reparacion.id_cierre_reparacion;


--
-- Name: donacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.donacion (
    id_donacion integer NOT NULL,
    nombre_institucion character varying(100) NOT NULL,
    rut_institucion character varying(12) NOT NULL,
    fecha_donacion date NOT NULL,
    numero_resolucion character varying(30),
    id_usuario integer NOT NULL,
    id_empresa integer,
    fecha_creacion timestamp with time zone DEFAULT now()
);


--
-- Name: donacion_detalle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.donacion_detalle (
    id_detalle integer NOT NULL,
    id_donacion integer NOT NULL,
    id_unidad integer NOT NULL
);


--
-- Name: donacion_detalle_id_detalle_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.donacion_detalle_id_detalle_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: donacion_detalle_id_detalle_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.donacion_detalle_id_detalle_seq OWNED BY public.donacion_detalle.id_detalle;


--
-- Name: donacion_id_donacion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.donacion_id_donacion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: donacion_id_donacion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.donacion_id_donacion_seq OWNED BY public.donacion.id_donacion;


--
-- Name: empresa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empresa (
    id_empresa integer NOT NULL,
    nombre character varying(100) NOT NULL
);


--
-- Name: empresa_id_empresa_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.empresa_id_empresa_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: empresa_id_empresa_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.empresa_id_empresa_seq OWNED BY public.empresa.id_empresa;


--
-- Name: historial_estado_equipo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.historial_estado_equipo (
    id_historial integer NOT NULL,
    id_unidad integer,
    id_usuario integer,
    estado_anterior character varying(30),
    estado_nuevo character varying(30),
    motivo text,
    fecha_hora timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: historial_estado_equipo_id_historial_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.historial_estado_equipo_id_historial_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: historial_estado_equipo_id_historial_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.historial_estado_equipo_id_historial_seq OWNED BY public.historial_estado_equipo.id_historial;


--
-- Name: integracion_activacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integracion_activacion (
    id_activacion integer NOT NULL,
    event_id character varying(100),
    trace_id character varying(100),
    id_empresa integer NOT NULL,
    id_ot integer,
    id_cliente_externo integer,
    rut_cliente character varying(20),
    id_servicio_externo integer,
    id_contrato_externo integer,
    payload jsonb,
    estado_proceso character varying(40) NOT NULL,
    equipos_asociados jsonb,
    discrepancias jsonb,
    fecha_proceso timestamp with time zone DEFAULT now()
);


--
-- Name: integracion_activacion_id_activacion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.integracion_activacion_id_activacion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: integracion_activacion_id_activacion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.integracion_activacion_id_activacion_seq OWNED BY public.integracion_activacion.id_activacion;


--
-- Name: integracion_cierre; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integracion_cierre (
    id_cierre integer NOT NULL,
    clave_idempotencia character varying(120) NOT NULL,
    id_ot integer NOT NULL,
    id_empresa integer NOT NULL,
    tipo_ot character varying(30),
    payload jsonb NOT NULL,
    estado_proceso character varying(40) DEFAULT 'PROCESADO'::character varying NOT NULL,
    discrepancias jsonb,
    acciones_aplicadas jsonb,
    fecha_proceso timestamp with time zone DEFAULT now(),
    srv character varying(20),
    id_tecnico integer,
    materiales_aplicados jsonb
);


--
-- Name: integracion_cierre_id_cierre_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.integracion_cierre_id_cierre_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: integracion_cierre_id_cierre_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.integracion_cierre_id_cierre_seq OWNED BY public.integracion_cierre.id_cierre;


--
-- Name: inventario_personal_tecnico; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventario_personal_tecnico (
    id_inventario integer NOT NULL,
    id_tecnico integer NOT NULL,
    id_tipo_equipo integer NOT NULL,
    cantidad numeric(10,2) DEFAULT 0,
    fecha_actualizacion timestamp with time zone DEFAULT now()
);


--
-- Name: inventario_personal_tecnico_id_inventario_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventario_personal_tecnico_id_inventario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventario_personal_tecnico_id_inventario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventario_personal_tecnico_id_inventario_seq OWNED BY public.inventario_personal_tecnico.id_inventario;


--
-- Name: log_auditoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_auditoria (
    id_log integer NOT NULL,
    id_usuario integer NOT NULL,
    accion character varying(100) NOT NULL,
    entidad_afectada character varying(100),
    id_entidad_afectada integer NOT NULL,
    valor_anterior jsonb,
    valor_nuevo jsonb NOT NULL,
    ip_origen inet,
    fecha_hora timestamp with time zone DEFAULT now()
);


--
-- Name: log_auditoria_id_log_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.log_auditoria_id_log_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: log_auditoria_id_log_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.log_auditoria_id_log_seq OWNED BY public.log_auditoria.id_log;


--
-- Name: movimiento_inventario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movimiento_inventario (
    id_movimiento integer NOT NULL,
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
    referencia_id integer
);


--
-- Name: movimiento_inventario_id_movimiento_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.movimiento_inventario_id_movimiento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: movimiento_inventario_id_movimiento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.movimiento_inventario_id_movimiento_seq OWNED BY public.movimiento_inventario.id_movimiento;


--
-- Name: notificacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notificacion (
    id_notificacion integer NOT NULL,
    tipo character varying(40) NOT NULL,
    id_empresa integer NOT NULL,
    descripcion character varying(150) NOT NULL,
    clave_dedupe character varying(120) NOT NULL,
    leida boolean DEFAULT false NOT NULL,
    fecha_generacion timestamp with time zone DEFAULT now() NOT NULL,
    fecha_leida timestamp with time zone
);


--
-- Name: notificacion_id_notificacion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notificacion_id_notificacion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notificacion_id_notificacion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notificacion_id_notificacion_seq OWNED BY public.notificacion.id_notificacion;


--
-- Name: orden_ingreso; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orden_ingreso (
    id_orden integer NOT NULL,
    correlativo character varying(10) NOT NULL,
    id_proveedor integer NOT NULL,
    numero_documento character varying(30) NOT NULL,
    fecha_documento date NOT NULL,
    id_empresa_destino integer NOT NULL,
    id_bodega_destino integer NOT NULL,
    estado character varying(30) DEFAULT 'Pendiente de recepción'::character varying NOT NULL,
    id_usuario_registro integer NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now()
);


--
-- Name: orden_ingreso_detalle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orden_ingreso_detalle (
    id_detalle integer NOT NULL,
    id_orden integer NOT NULL,
    id_tipo_equipo integer NOT NULL,
    cantidad_esperada integer NOT NULL,
    garantia_dias integer DEFAULT 0 NOT NULL,
    cantidad_recibida integer DEFAULT 0 NOT NULL,
    CONSTRAINT orden_ingreso_detalle_cantidad_esperada_check CHECK ((cantidad_esperada > 0)),
    CONSTRAINT orden_ingreso_detalle_garantia_dias_check CHECK (((garantia_dias >= 0) AND (garantia_dias <= 3650)))
);


--
-- Name: orden_ingreso_detalle_id_detalle_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orden_ingreso_detalle_id_detalle_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orden_ingreso_detalle_id_detalle_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orden_ingreso_detalle_id_detalle_seq OWNED BY public.orden_ingreso_detalle.id_detalle;


--
-- Name: orden_ingreso_id_orden_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orden_ingreso_id_orden_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orden_ingreso_id_orden_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orden_ingreso_id_orden_seq OWNED BY public.orden_ingreso.id_orden;


--
-- Name: prestamo_detalle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prestamo_detalle (
    id_detalle integer NOT NULL,
    id_prestamo integer NOT NULL,
    id_unidad integer,
    id_tipo_equipo integer,
    cantidad numeric(10,2),
    cantidad_retornada numeric(10,2) DEFAULT 0
);


--
-- Name: prestamo_detalle_id_detalle_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.prestamo_detalle_id_detalle_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: prestamo_detalle_id_detalle_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.prestamo_detalle_id_detalle_seq OWNED BY public.prestamo_detalle.id_detalle;


--
-- Name: prestamo_externo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prestamo_externo (
    id_prestamo integer NOT NULL,
    tipo character varying(30) NOT NULL,
    id_empresa integer NOT NULL,
    id_unidad integer,
    nombre_receptor character varying(80) NOT NULL,
    rut_receptor character varying(12),
    fecha_salida timestamp with time zone DEFAULT now() NOT NULL,
    fecha_retorno_estimada date NOT NULL,
    fecha_retorno_real date,
    detalle text NOT NULL,
    estado character varying(20) DEFAULT 'ACTIVO'::character varying NOT NULL,
    resultado character varying(20),
    id_usuario_registro integer NOT NULL,
    correlativo character varying(12),
    id_bodega_origen integer
);


--
-- Name: prestamo_externo_id_prestamo_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.prestamo_externo_id_prestamo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: prestamo_externo_id_prestamo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.prestamo_externo_id_prestamo_seq OWNED BY public.prestamo_externo.id_prestamo;


--
-- Name: prestamo_retorno; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prestamo_retorno (
    id_retorno integer NOT NULL,
    id_detalle integer NOT NULL,
    cantidad numeric(10,2),
    fecha_retorno timestamp with time zone NOT NULL,
    observacion character varying(300),
    id_usuario integer NOT NULL
);


--
-- Name: prestamo_retorno_id_retorno_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.prestamo_retorno_id_retorno_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: prestamo_retorno_id_retorno_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.prestamo_retorno_id_retorno_seq OWNED BY public.prestamo_retorno.id_retorno;


--
-- Name: proveedor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proveedor (
    id_proveedor integer NOT NULL,
    nombre_comercial character varying(100) NOT NULL,
    rut character varying(12) NOT NULL,
    nombre_contacto character varying(80),
    telefono character varying(15),
    email character varying(150),
    activa boolean DEFAULT true,
    fecha_creacion timestamp with time zone DEFAULT now()
);


--
-- Name: proveedor_id_proveedor_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proveedor_id_proveedor_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proveedor_id_proveedor_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proveedor_id_proveedor_seq OWNED BY public.proveedor.id_proveedor;


--
-- Name: proveedor_tipo_equipo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proveedor_tipo_equipo (
    id integer NOT NULL,
    id_proveedor integer NOT NULL,
    id_tipo_equipo integer NOT NULL
);


--
-- Name: proveedor_tipo_equipo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proveedor_tipo_equipo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proveedor_tipo_equipo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proveedor_tipo_equipo_id_seq OWNED BY public.proveedor_tipo_equipo.id;


--
-- Name: rol; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rol (
    id_rol integer NOT NULL,
    nombre_rol character varying(50) NOT NULL,
    descripcion character varying(200)
);


--
-- Name: rol_id_rol_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rol_id_rol_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rol_id_rol_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rol_id_rol_seq OWNED BY public.rol.id_rol;


--
-- Name: salida_bodega; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salida_bodega (
    id_salida integer NOT NULL,
    id_tecnico integer NOT NULL,
    id_bodega_origen integer NOT NULL,
    fecha_hora timestamp with time zone DEFAULT now(),
    id_empresa integer,
    id_usuario_registro integer
);


--
-- Name: salida_bodega_id_salida_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.salida_bodega_id_salida_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: salida_bodega_id_salida_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.salida_bodega_id_salida_seq OWNED BY public.salida_bodega.id_salida;


--
-- Name: salida_detalle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salida_detalle (
    id_detalle integer NOT NULL,
    id_salida integer NOT NULL,
    id_tipo_equipo integer,
    id_unidad integer,
    cantidad numeric(10,2)
);


--
-- Name: salida_detalle_id_detalle_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.salida_detalle_id_detalle_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: salida_detalle_id_detalle_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.salida_detalle_id_detalle_seq OWNED BY public.salida_detalle.id_detalle;


--
-- Name: secuencia_srv; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.secuencia_srv (
    id_empresa integer NOT NULL,
    anio integer NOT NULL,
    ultimo integer DEFAULT 0 NOT NULL
);


--
-- Name: solicitud_baja; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.solicitud_baja (
    id_solicitud integer NOT NULL,
    id_unidad integer NOT NULL,
    id_empresa integer,
    id_usuario_solicitante integer NOT NULL,
    motivo character varying(40) NOT NULL,
    motivo_otro character varying(200),
    estado character varying(30) NOT NULL,
    id_usuario_aprobador integer,
    fecha_solicitud timestamp with time zone DEFAULT now(),
    fecha_resolucion timestamp with time zone,
    motivo_rechazo character varying(200)
);


--
-- Name: solicitud_baja_id_solicitud_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.solicitud_baja_id_solicitud_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: solicitud_baja_id_solicitud_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.solicitud_baja_id_solicitud_seq OWNED BY public.solicitud_baja.id_solicitud;


--
-- Name: stock_consumible; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_consumible (
    id_stock integer NOT NULL,
    id_tipo_equipo integer NOT NULL,
    id_bodega integer NOT NULL,
    cantidad_disponible numeric(10,2) DEFAULT 0,
    umbral_minimo numeric(10,2)
);


--
-- Name: stock_consumible_id_stock_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_consumible_id_stock_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_consumible_id_stock_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_consumible_id_stock_seq OWNED BY public.stock_consumible.id_stock;


--
-- Name: tipo_equipo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipo_equipo (
    id_tipo_equipo integer NOT NULL,
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
    activo boolean DEFAULT true
);


--
-- Name: tipo_equipo_id_tipo_equipo_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tipo_equipo_id_tipo_equipo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tipo_equipo_id_tipo_equipo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tipo_equipo_id_tipo_equipo_seq OWNED BY public.tipo_equipo.id_tipo_equipo;


--
-- Name: toma_inventario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.toma_inventario (
    id_toma integer NOT NULL,
    id_bodega integer NOT NULL,
    id_empresa integer NOT NULL,
    estado character varying(20) DEFAULT 'ABIERTA'::character varying NOT NULL,
    id_usuario_apertura integer NOT NULL,
    id_usuario_cierre integer,
    fecha_apertura timestamp with time zone DEFAULT now() NOT NULL,
    fecha_cierre timestamp with time zone,
    CONSTRAINT toma_inventario_estado_check CHECK (((estado)::text = ANY ((ARRAY['ABIERTA'::character varying, 'CONFIRMADA'::character varying, 'CANCELADA'::character varying])::text[])))
);


--
-- Name: toma_inventario_detalle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.toma_inventario_detalle (
    id_detalle integer NOT NULL,
    id_toma integer NOT NULL,
    id_tipo_equipo integer,
    id_unidad integer,
    numero_serie character varying(80),
    es_esperada boolean DEFAULT true NOT NULL,
    cantidad_esperada numeric(10,2) DEFAULT 0 NOT NULL,
    cantidad_contada numeric(10,2),
    resultado character varying(20)
);


--
-- Name: toma_inventario_detalle_id_detalle_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.toma_inventario_detalle_id_detalle_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: toma_inventario_detalle_id_detalle_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.toma_inventario_detalle_id_detalle_seq OWNED BY public.toma_inventario_detalle.id_detalle;


--
-- Name: toma_inventario_id_toma_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.toma_inventario_id_toma_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: toma_inventario_id_toma_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.toma_inventario_id_toma_seq OWNED BY public.toma_inventario.id_toma;


--
-- Name: transferencia_equipo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transferencia_equipo (
    id_transferencia integer NOT NULL,
    id_empresa_origen integer,
    id_empresa_destino integer,
    id_usuario_registro integer,
    fecha_transferencia date,
    observaciones text
);


--
-- Name: transferencia_equipo_id_transferencia_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transferencia_equipo_id_transferencia_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transferencia_equipo_id_transferencia_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transferencia_equipo_id_transferencia_seq OWNED BY public.transferencia_equipo.id_transferencia;


--
-- Name: unidad_equipo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unidad_equipo (
    id_unidad integer NOT NULL,
    id_tipo_equipo integer,
    id_empresa integer,
    numero_serie character varying(80) NOT NULL,
    modelo character varying(80),
    estado character varying(30) NOT NULL,
    fecha_adquisicion date,
    fecha_venc_garantia date,
    diagnostico_tecnico text,
    id_cliente_instalado integer,
    id_bodega_actual integer,
    numero_poste character varying(30),
    id_caja_nap integer,
    mac_address character varying(17),
    proveedor character varying(80),
    observaciones character varying(300),
    ubicacion_fisica character varying(60),
    motivo_baja character varying(40),
    motivo_baja_detalle character varying(200),
    id_tecnico_asignado integer,
    cliente_rut character varying(20),
    cliente_nombre character varying(150),
    direccion_instalacion character varying(300),
    comuna_instalacion character varying(100),
    srv character varying(20)
);


--
-- Name: unidad_equipo_id_unidad_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unidad_equipo_id_unidad_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unidad_equipo_id_unidad_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unidad_equipo_id_unidad_seq OWNED BY public.unidad_equipo.id_unidad;


--
-- Name: usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuario (
    id_usuario integer NOT NULL,
    id_empresa integer,
    nombre_completo character varying(150) NOT NULL,
    nombre_usuario character varying(50),
    email character varying(150),
    password_hash character varying(255) NOT NULL,
    activo boolean DEFAULT true,
    intentos_fallidos integer DEFAULT 0 NOT NULL,
    bloqueado_hasta timestamp with time zone,
    debe_cambiar_password boolean DEFAULT false NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now(),
    rut character varying(12)
);


--
-- Name: usuario_id_usuario_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuario_id_usuario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuario_id_usuario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuario_id_usuario_seq OWNED BY public.usuario.id_usuario;


--
-- Name: usuario_rol; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuario_rol (
    id_usuario_rol integer NOT NULL,
    id_usuario integer,
    id_rol integer NOT NULL,
    fecha_asignacion timestamp with time zone DEFAULT now()
);


--
-- Name: usuario_rol_id_usuario_rol_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuario_rol_id_usuario_rol_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuario_rol_id_usuario_rol_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuario_rol_id_usuario_rol_seq OWNED BY public.usuario_rol.id_usuario_rol;


--
-- Name: asignacion_equipo_servicio id_asignacion; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignacion_equipo_servicio ALTER COLUMN id_asignacion SET DEFAULT nextval('public.asignacion_equipo_servicio_id_asignacion_seq'::regclass);


--
-- Name: bodega id_bodega; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bodega ALTER COLUMN id_bodega SET DEFAULT nextval('public.bodega_id_bodega_seq'::regclass);


--
-- Name: borrador_cierre id_borrador; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.borrador_cierre ALTER COLUMN id_borrador SET DEFAULT nextval('public.borrador_cierre_id_borrador_seq'::regclass);


--
-- Name: cierre_reparacion id_cierre_reparacion; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cierre_reparacion ALTER COLUMN id_cierre_reparacion SET DEFAULT nextval('public.cierre_reparacion_id_cierre_reparacion_seq'::regclass);


--
-- Name: donacion id_donacion; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donacion ALTER COLUMN id_donacion SET DEFAULT nextval('public.donacion_id_donacion_seq'::regclass);


--
-- Name: donacion_detalle id_detalle; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donacion_detalle ALTER COLUMN id_detalle SET DEFAULT nextval('public.donacion_detalle_id_detalle_seq'::regclass);


--
-- Name: empresa id_empresa; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa ALTER COLUMN id_empresa SET DEFAULT nextval('public.empresa_id_empresa_seq'::regclass);


--
-- Name: historial_estado_equipo id_historial; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_estado_equipo ALTER COLUMN id_historial SET DEFAULT nextval('public.historial_estado_equipo_id_historial_seq'::regclass);


--
-- Name: integracion_activacion id_activacion; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integracion_activacion ALTER COLUMN id_activacion SET DEFAULT nextval('public.integracion_activacion_id_activacion_seq'::regclass);


--
-- Name: integracion_cierre id_cierre; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integracion_cierre ALTER COLUMN id_cierre SET DEFAULT nextval('public.integracion_cierre_id_cierre_seq'::regclass);


--
-- Name: inventario_personal_tecnico id_inventario; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_personal_tecnico ALTER COLUMN id_inventario SET DEFAULT nextval('public.inventario_personal_tecnico_id_inventario_seq'::regclass);


--
-- Name: log_auditoria id_log; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_auditoria ALTER COLUMN id_log SET DEFAULT nextval('public.log_auditoria_id_log_seq'::regclass);


--
-- Name: movimiento_inventario id_movimiento; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_inventario ALTER COLUMN id_movimiento SET DEFAULT nextval('public.movimiento_inventario_id_movimiento_seq'::regclass);


--
-- Name: notificacion id_notificacion; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacion ALTER COLUMN id_notificacion SET DEFAULT nextval('public.notificacion_id_notificacion_seq'::regclass);


--
-- Name: orden_ingreso id_orden; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_ingreso ALTER COLUMN id_orden SET DEFAULT nextval('public.orden_ingreso_id_orden_seq'::regclass);


--
-- Name: orden_ingreso_detalle id_detalle; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_ingreso_detalle ALTER COLUMN id_detalle SET DEFAULT nextval('public.orden_ingreso_detalle_id_detalle_seq'::regclass);


--
-- Name: prestamo_detalle id_detalle; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prestamo_detalle ALTER COLUMN id_detalle SET DEFAULT nextval('public.prestamo_detalle_id_detalle_seq'::regclass);


--
-- Name: prestamo_externo id_prestamo; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prestamo_externo ALTER COLUMN id_prestamo SET DEFAULT nextval('public.prestamo_externo_id_prestamo_seq'::regclass);


--
-- Name: prestamo_retorno id_retorno; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prestamo_retorno ALTER COLUMN id_retorno SET DEFAULT nextval('public.prestamo_retorno_id_retorno_seq'::regclass);


--
-- Name: proveedor id_proveedor; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedor ALTER COLUMN id_proveedor SET DEFAULT nextval('public.proveedor_id_proveedor_seq'::regclass);


--
-- Name: proveedor_tipo_equipo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedor_tipo_equipo ALTER COLUMN id SET DEFAULT nextval('public.proveedor_tipo_equipo_id_seq'::regclass);


--
-- Name: rol id_rol; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol ALTER COLUMN id_rol SET DEFAULT nextval('public.rol_id_rol_seq'::regclass);


--
-- Name: salida_bodega id_salida; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salida_bodega ALTER COLUMN id_salida SET DEFAULT nextval('public.salida_bodega_id_salida_seq'::regclass);


--
-- Name: salida_detalle id_detalle; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salida_detalle ALTER COLUMN id_detalle SET DEFAULT nextval('public.salida_detalle_id_detalle_seq'::regclass);


--
-- Name: solicitud_baja id_solicitud; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitud_baja ALTER COLUMN id_solicitud SET DEFAULT nextval('public.solicitud_baja_id_solicitud_seq'::regclass);


--
-- Name: stock_consumible id_stock; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_consumible ALTER COLUMN id_stock SET DEFAULT nextval('public.stock_consumible_id_stock_seq'::regclass);


--
-- Name: tipo_equipo id_tipo_equipo; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_equipo ALTER COLUMN id_tipo_equipo SET DEFAULT nextval('public.tipo_equipo_id_tipo_equipo_seq'::regclass);


--
-- Name: toma_inventario id_toma; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.toma_inventario ALTER COLUMN id_toma SET DEFAULT nextval('public.toma_inventario_id_toma_seq'::regclass);


--
-- Name: toma_inventario_detalle id_detalle; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.toma_inventario_detalle ALTER COLUMN id_detalle SET DEFAULT nextval('public.toma_inventario_detalle_id_detalle_seq'::regclass);


--
-- Name: transferencia_equipo id_transferencia; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencia_equipo ALTER COLUMN id_transferencia SET DEFAULT nextval('public.transferencia_equipo_id_transferencia_seq'::regclass);


--
-- Name: unidad_equipo id_unidad; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidad_equipo ALTER COLUMN id_unidad SET DEFAULT nextval('public.unidad_equipo_id_unidad_seq'::regclass);


--
-- Name: usuario id_usuario; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario ALTER COLUMN id_usuario SET DEFAULT nextval('public.usuario_id_usuario_seq'::regclass);


--
-- Name: usuario_rol id_usuario_rol; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_rol ALTER COLUMN id_usuario_rol SET DEFAULT nextval('public.usuario_rol_id_usuario_rol_seq'::regclass);


--
-- Name: asignacion_equipo_servicio asignacion_equipo_servicio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignacion_equipo_servicio
    ADD CONSTRAINT asignacion_equipo_servicio_pkey PRIMARY KEY (id_asignacion);


--
-- Name: bodega bodega_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bodega
    ADD CONSTRAINT bodega_pkey PRIMARY KEY (id_bodega);


--
-- Name: borrador_cierre borrador_cierre_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.borrador_cierre
    ADD CONSTRAINT borrador_cierre_pkey PRIMARY KEY (id_borrador);


--
-- Name: cierre_reparacion cierre_reparacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cierre_reparacion
    ADD CONSTRAINT cierre_reparacion_pkey PRIMARY KEY (id_cierre_reparacion);


--
-- Name: donacion_detalle donacion_detalle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donacion_detalle
    ADD CONSTRAINT donacion_detalle_pkey PRIMARY KEY (id_detalle);


--
-- Name: donacion donacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donacion
    ADD CONSTRAINT donacion_pkey PRIMARY KEY (id_donacion);


--
-- Name: empresa empresa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa
    ADD CONSTRAINT empresa_pkey PRIMARY KEY (id_empresa);


--
-- Name: historial_estado_equipo historial_estado_equipo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_estado_equipo
    ADD CONSTRAINT historial_estado_equipo_pkey PRIMARY KEY (id_historial);


--
-- Name: integracion_activacion integracion_activacion_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integracion_activacion
    ADD CONSTRAINT integracion_activacion_event_id_key UNIQUE (event_id);


--
-- Name: integracion_activacion integracion_activacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integracion_activacion
    ADD CONSTRAINT integracion_activacion_pkey PRIMARY KEY (id_activacion);


--
-- Name: integracion_cierre integracion_cierre_clave_idempotencia_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integracion_cierre
    ADD CONSTRAINT integracion_cierre_clave_idempotencia_key UNIQUE (clave_idempotencia);


--
-- Name: integracion_cierre integracion_cierre_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integracion_cierre
    ADD CONSTRAINT integracion_cierre_pkey PRIMARY KEY (id_cierre);


--
-- Name: inventario_personal_tecnico inventario_personal_tecnico_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_personal_tecnico
    ADD CONSTRAINT inventario_personal_tecnico_pkey PRIMARY KEY (id_inventario);


--
-- Name: log_auditoria log_auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_auditoria
    ADD CONSTRAINT log_auditoria_pkey PRIMARY KEY (id_log);


--
-- Name: movimiento_inventario movimiento_inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_inventario
    ADD CONSTRAINT movimiento_inventario_pkey PRIMARY KEY (id_movimiento);


--
-- Name: notificacion notificacion_clave_dedupe_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacion
    ADD CONSTRAINT notificacion_clave_dedupe_key UNIQUE (clave_dedupe);


--
-- Name: notificacion notificacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacion
    ADD CONSTRAINT notificacion_pkey PRIMARY KEY (id_notificacion);


--
-- Name: orden_ingreso orden_ingreso_correlativo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_ingreso
    ADD CONSTRAINT orden_ingreso_correlativo_key UNIQUE (correlativo);


--
-- Name: orden_ingreso_detalle orden_ingreso_detalle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_ingreso_detalle
    ADD CONSTRAINT orden_ingreso_detalle_pkey PRIMARY KEY (id_detalle);


--
-- Name: orden_ingreso orden_ingreso_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_ingreso
    ADD CONSTRAINT orden_ingreso_pkey PRIMARY KEY (id_orden);


--
-- Name: prestamo_detalle prestamo_detalle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prestamo_detalle
    ADD CONSTRAINT prestamo_detalle_pkey PRIMARY KEY (id_detalle);


--
-- Name: prestamo_externo prestamo_externo_correlativo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prestamo_externo
    ADD CONSTRAINT prestamo_externo_correlativo_key UNIQUE (correlativo);


--
-- Name: prestamo_externo prestamo_externo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prestamo_externo
    ADD CONSTRAINT prestamo_externo_pkey PRIMARY KEY (id_prestamo);


--
-- Name: prestamo_retorno prestamo_retorno_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prestamo_retorno
    ADD CONSTRAINT prestamo_retorno_pkey PRIMARY KEY (id_retorno);


--
-- Name: proveedor proveedor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedor
    ADD CONSTRAINT proveedor_pkey PRIMARY KEY (id_proveedor);


--
-- Name: proveedor proveedor_rut_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedor
    ADD CONSTRAINT proveedor_rut_key UNIQUE (rut);


--
-- Name: proveedor_tipo_equipo proveedor_tipo_equipo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedor_tipo_equipo
    ADD CONSTRAINT proveedor_tipo_equipo_pkey PRIMARY KEY (id);


--
-- Name: rol rol_nombre_rol_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol
    ADD CONSTRAINT rol_nombre_rol_key UNIQUE (nombre_rol);


--
-- Name: rol rol_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol
    ADD CONSTRAINT rol_pkey PRIMARY KEY (id_rol);


--
-- Name: salida_bodega salida_bodega_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salida_bodega
    ADD CONSTRAINT salida_bodega_pkey PRIMARY KEY (id_salida);


--
-- Name: salida_detalle salida_detalle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salida_detalle
    ADD CONSTRAINT salida_detalle_pkey PRIMARY KEY (id_detalle);


--
-- Name: secuencia_srv secuencia_srv_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.secuencia_srv
    ADD CONSTRAINT secuencia_srv_pkey PRIMARY KEY (id_empresa, anio);


--
-- Name: solicitud_baja solicitud_baja_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitud_baja
    ADD CONSTRAINT solicitud_baja_pkey PRIMARY KEY (id_solicitud);


--
-- Name: stock_consumible stock_consumible_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_consumible
    ADD CONSTRAINT stock_consumible_pkey PRIMARY KEY (id_stock);


--
-- Name: tipo_equipo tipo_equipo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_equipo
    ADD CONSTRAINT tipo_equipo_pkey PRIMARY KEY (id_tipo_equipo);


--
-- Name: toma_inventario_detalle toma_inventario_detalle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.toma_inventario_detalle
    ADD CONSTRAINT toma_inventario_detalle_pkey PRIMARY KEY (id_detalle);


--
-- Name: toma_inventario toma_inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.toma_inventario
    ADD CONSTRAINT toma_inventario_pkey PRIMARY KEY (id_toma);


--
-- Name: transferencia_equipo transferencia_equipo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencia_equipo
    ADD CONSTRAINT transferencia_equipo_pkey PRIMARY KEY (id_transferencia);


--
-- Name: unidad_equipo unidad_equipo_mac_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidad_equipo
    ADD CONSTRAINT unidad_equipo_mac_address_key UNIQUE (mac_address);


--
-- Name: unidad_equipo unidad_equipo_numero_serie_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidad_equipo
    ADD CONSTRAINT unidad_equipo_numero_serie_key UNIQUE (numero_serie);


--
-- Name: unidad_equipo unidad_equipo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidad_equipo
    ADD CONSTRAINT unidad_equipo_pkey PRIMARY KEY (id_unidad);


--
-- Name: borrador_cierre uq_borrador_cierre_ot; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.borrador_cierre
    ADD CONSTRAINT uq_borrador_cierre_ot UNIQUE (id_ot, id_empresa);


--
-- Name: inventario_personal_tecnico uq_inventario_tecnico_tipo; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_personal_tecnico
    ADD CONSTRAINT uq_inventario_tecnico_tipo UNIQUE (id_tecnico, id_tipo_equipo);


--
-- Name: proveedor_tipo_equipo uq_pte; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedor_tipo_equipo
    ADD CONSTRAINT uq_pte UNIQUE (id_proveedor, id_tipo_equipo);


--
-- Name: usuario usuario_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_email_key UNIQUE (email);


--
-- Name: usuario usuario_nombre_usuario_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_nombre_usuario_key UNIQUE (nombre_usuario);


--
-- Name: usuario usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (id_usuario);


--
-- Name: usuario_rol usuario_rol_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_rol
    ADD CONSTRAINT usuario_rol_pkey PRIMARY KEY (id_usuario_rol);


--
-- Name: idx_toma_detalle_toma; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_toma_detalle_toma ON public.toma_inventario_detalle USING btree (id_toma);


--
-- Name: ix_asignacion_empresa_servicio_activa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_asignacion_empresa_servicio_activa ON public.asignacion_equipo_servicio USING btree (id_empresa, id_servicio_externo, activa);


--
-- Name: uq_toma_abierta_por_bodega; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_toma_abierta_por_bodega ON public.toma_inventario USING btree (id_bodega) WHERE ((estado)::text = 'ABIERTA'::text);


--
-- Name: ux_asignacion_evento_unidad; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_asignacion_evento_unidad ON public.asignacion_equipo_servicio USING btree (event_id, id_unidad);


--
-- Name: ux_prestamo_externo_correlativo; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_prestamo_externo_correlativo ON public.prestamo_externo USING btree (correlativo);


--
-- Name: asignacion_equipo_servicio fk_asignacion_equipo_servicio_id_empresa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignacion_equipo_servicio
    ADD CONSTRAINT fk_asignacion_equipo_servicio_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa);


--
-- Name: asignacion_equipo_servicio fk_asignacion_unidad; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignacion_equipo_servicio
    ADD CONSTRAINT fk_asignacion_unidad FOREIGN KEY (id_unidad) REFERENCES public.unidad_equipo(id_unidad);


--
-- Name: bodega fk_bodega_id_empresa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bodega
    ADD CONSTRAINT fk_bodega_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa);


--
-- Name: bodega fk_bodega_id_usuario_responsable; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bodega
    ADD CONSTRAINT fk_bodega_id_usuario_responsable FOREIGN KEY (id_usuario_responsable) REFERENCES public.usuario(id_usuario);


--
-- Name: borrador_cierre fk_borrador_cierre_id_empresa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.borrador_cierre
    ADD CONSTRAINT fk_borrador_cierre_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa);


--
-- Name: cierre_reparacion fk_cierre_reparacion_id_cierre; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cierre_reparacion
    ADD CONSTRAINT fk_cierre_reparacion_id_cierre FOREIGN KEY (id_cierre) REFERENCES public.integracion_cierre(id_cierre);


--
-- Name: cierre_reparacion fk_cierre_reparacion_id_empresa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cierre_reparacion
    ADD CONSTRAINT fk_cierre_reparacion_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa);


--
-- Name: donacion_detalle fk_donacion_detalle_donacion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donacion_detalle
    ADD CONSTRAINT fk_donacion_detalle_donacion FOREIGN KEY (id_donacion) REFERENCES public.donacion(id_donacion);


--
-- Name: donacion_detalle fk_donacion_detalle_unidad; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donacion_detalle
    ADD CONSTRAINT fk_donacion_detalle_unidad FOREIGN KEY (id_unidad) REFERENCES public.unidad_equipo(id_unidad);


--
-- Name: donacion fk_donacion_id_empresa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donacion
    ADD CONSTRAINT fk_donacion_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa);


--
-- Name: donacion fk_donacion_id_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donacion
    ADD CONSTRAINT fk_donacion_id_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);


--
-- Name: historial_estado_equipo fk_historial_unidad; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_estado_equipo
    ADD CONSTRAINT fk_historial_unidad FOREIGN KEY (id_unidad) REFERENCES public.unidad_equipo(id_unidad) ON DELETE CASCADE;


--
-- Name: integracion_activacion fk_integracion_activacion_id_empresa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integracion_activacion
    ADD CONSTRAINT fk_integracion_activacion_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa);


--
-- Name: integracion_cierre fk_integracion_cierre_id_empresa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integracion_cierre
    ADD CONSTRAINT fk_integracion_cierre_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa);


--
-- Name: inventario_personal_tecnico fk_inventario_personal_tecnico_id_tecnico; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_personal_tecnico
    ADD CONSTRAINT fk_inventario_personal_tecnico_id_tecnico FOREIGN KEY (id_tecnico) REFERENCES public.usuario(id_usuario);


--
-- Name: inventario_personal_tecnico fk_inventario_personal_tecnico_id_tipo_equipo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_personal_tecnico
    ADD CONSTRAINT fk_inventario_personal_tecnico_id_tipo_equipo FOREIGN KEY (id_tipo_equipo) REFERENCES public.tipo_equipo(id_tipo_equipo);


--
-- Name: movimiento_inventario fk_movimiento_inventario_id_bodega_destino; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_inventario
    ADD CONSTRAINT fk_movimiento_inventario_id_bodega_destino FOREIGN KEY (id_bodega_destino) REFERENCES public.bodega(id_bodega);


--
-- Name: movimiento_inventario fk_movimiento_inventario_id_bodega_origen; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_inventario
    ADD CONSTRAINT fk_movimiento_inventario_id_bodega_origen FOREIGN KEY (id_bodega_origen) REFERENCES public.bodega(id_bodega);


--
-- Name: movimiento_inventario fk_movimiento_inventario_id_empresa_destino; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_inventario
    ADD CONSTRAINT fk_movimiento_inventario_id_empresa_destino FOREIGN KEY (id_empresa_destino) REFERENCES public.empresa(id_empresa);


--
-- Name: movimiento_inventario fk_movimiento_inventario_id_empresa_origen; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_inventario
    ADD CONSTRAINT fk_movimiento_inventario_id_empresa_origen FOREIGN KEY (id_empresa_origen) REFERENCES public.empresa(id_empresa);


--
-- Name: movimiento_inventario fk_movimiento_inventario_id_tipo_equipo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_inventario
    ADD CONSTRAINT fk_movimiento_inventario_id_tipo_equipo FOREIGN KEY (id_tipo_equipo) REFERENCES public.tipo_equipo(id_tipo_equipo);


--
-- Name: movimiento_inventario fk_movimiento_inventario_id_unidad; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_inventario
    ADD CONSTRAINT fk_movimiento_inventario_id_unidad FOREIGN KEY (id_unidad) REFERENCES public.unidad_equipo(id_unidad);


--
-- Name: notificacion fk_notificacion_id_empresa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacion
    ADD CONSTRAINT fk_notificacion_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa);


--
-- Name: orden_ingreso fk_oi_bodega; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_ingreso
    ADD CONSTRAINT fk_oi_bodega FOREIGN KEY (id_bodega_destino) REFERENCES public.bodega(id_bodega);


--
-- Name: orden_ingreso fk_oi_proveedor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_ingreso
    ADD CONSTRAINT fk_oi_proveedor FOREIGN KEY (id_proveedor) REFERENCES public.proveedor(id_proveedor);


--
-- Name: orden_ingreso_detalle fk_oid_orden; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_ingreso_detalle
    ADD CONSTRAINT fk_oid_orden FOREIGN KEY (id_orden) REFERENCES public.orden_ingreso(id_orden) ON DELETE CASCADE;


--
-- Name: orden_ingreso_detalle fk_oid_tipo_equipo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_ingreso_detalle
    ADD CONSTRAINT fk_oid_tipo_equipo FOREIGN KEY (id_tipo_equipo) REFERENCES public.tipo_equipo(id_tipo_equipo);


--
-- Name: orden_ingreso fk_orden_ingreso_id_empresa_destino; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_ingreso
    ADD CONSTRAINT fk_orden_ingreso_id_empresa_destino FOREIGN KEY (id_empresa_destino) REFERENCES public.empresa(id_empresa);


--
-- Name: orden_ingreso fk_orden_ingreso_id_usuario_registro; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_ingreso
    ADD CONSTRAINT fk_orden_ingreso_id_usuario_registro FOREIGN KEY (id_usuario_registro) REFERENCES public.usuario(id_usuario);


--
-- Name: prestamo_detalle fk_prestamo_detalle_id_tipo_equipo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prestamo_detalle
    ADD CONSTRAINT fk_prestamo_detalle_id_tipo_equipo FOREIGN KEY (id_tipo_equipo) REFERENCES public.tipo_equipo(id_tipo_equipo);


--
-- Name: prestamo_detalle fk_prestamo_detalle_prestamo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prestamo_detalle
    ADD CONSTRAINT fk_prestamo_detalle_prestamo FOREIGN KEY (id_prestamo) REFERENCES public.prestamo_externo(id_prestamo) ON DELETE CASCADE;


--
-- Name: prestamo_detalle fk_prestamo_detalle_unidad; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prestamo_detalle
    ADD CONSTRAINT fk_prestamo_detalle_unidad FOREIGN KEY (id_unidad) REFERENCES public.unidad_equipo(id_unidad);


--
-- Name: prestamo_externo fk_prestamo_externo_id_bodega_origen; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prestamo_externo
    ADD CONSTRAINT fk_prestamo_externo_id_bodega_origen FOREIGN KEY (id_bodega_origen) REFERENCES public.bodega(id_bodega);


--
-- Name: prestamo_externo fk_prestamo_externo_id_empresa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prestamo_externo
    ADD CONSTRAINT fk_prestamo_externo_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa);


--
-- Name: prestamo_externo fk_prestamo_externo_id_usuario_registro; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prestamo_externo
    ADD CONSTRAINT fk_prestamo_externo_id_usuario_registro FOREIGN KEY (id_usuario_registro) REFERENCES public.usuario(id_usuario);


--
-- Name: prestamo_retorno fk_prestamo_retorno_detalle; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prestamo_retorno
    ADD CONSTRAINT fk_prestamo_retorno_detalle FOREIGN KEY (id_detalle) REFERENCES public.prestamo_detalle(id_detalle) ON DELETE CASCADE;


--
-- Name: prestamo_retorno fk_prestamo_retorno_id_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prestamo_retorno
    ADD CONSTRAINT fk_prestamo_retorno_id_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);


--
-- Name: proveedor_tipo_equipo fk_pte_proveedor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedor_tipo_equipo
    ADD CONSTRAINT fk_pte_proveedor FOREIGN KEY (id_proveedor) REFERENCES public.proveedor(id_proveedor) ON DELETE CASCADE;


--
-- Name: proveedor_tipo_equipo fk_pte_tipo_equipo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedor_tipo_equipo
    ADD CONSTRAINT fk_pte_tipo_equipo FOREIGN KEY (id_tipo_equipo) REFERENCES public.tipo_equipo(id_tipo_equipo) ON DELETE CASCADE;


--
-- Name: salida_bodega fk_salida_bodega_id_bodega_origen; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salida_bodega
    ADD CONSTRAINT fk_salida_bodega_id_bodega_origen FOREIGN KEY (id_bodega_origen) REFERENCES public.bodega(id_bodega);


--
-- Name: salida_bodega fk_salida_bodega_id_empresa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salida_bodega
    ADD CONSTRAINT fk_salida_bodega_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa);


--
-- Name: salida_bodega fk_salida_bodega_id_tecnico; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salida_bodega
    ADD CONSTRAINT fk_salida_bodega_id_tecnico FOREIGN KEY (id_tecnico) REFERENCES public.usuario(id_usuario);


--
-- Name: salida_bodega fk_salida_bodega_id_usuario_registro; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salida_bodega
    ADD CONSTRAINT fk_salida_bodega_id_usuario_registro FOREIGN KEY (id_usuario_registro) REFERENCES public.usuario(id_usuario);


--
-- Name: salida_detalle fk_salida_detalle_id_tipo_equipo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salida_detalle
    ADD CONSTRAINT fk_salida_detalle_id_tipo_equipo FOREIGN KEY (id_tipo_equipo) REFERENCES public.tipo_equipo(id_tipo_equipo);


--
-- Name: salida_detalle fk_salida_detalle_id_unidad; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salida_detalle
    ADD CONSTRAINT fk_salida_detalle_id_unidad FOREIGN KEY (id_unidad) REFERENCES public.unidad_equipo(id_unidad);


--
-- Name: salida_detalle fk_salida_detalle_salida; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salida_detalle
    ADD CONSTRAINT fk_salida_detalle_salida FOREIGN KEY (id_salida) REFERENCES public.salida_bodega(id_salida) ON DELETE CASCADE;


--
-- Name: secuencia_srv fk_secuencia_srv_id_empresa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.secuencia_srv
    ADD CONSTRAINT fk_secuencia_srv_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa);


--
-- Name: solicitud_baja fk_solicitud_baja_id_empresa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitud_baja
    ADD CONSTRAINT fk_solicitud_baja_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa);


--
-- Name: solicitud_baja fk_solicitud_baja_id_usuario_aprobador; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitud_baja
    ADD CONSTRAINT fk_solicitud_baja_id_usuario_aprobador FOREIGN KEY (id_usuario_aprobador) REFERENCES public.usuario(id_usuario);


--
-- Name: solicitud_baja fk_solicitud_baja_id_usuario_solicitante; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitud_baja
    ADD CONSTRAINT fk_solicitud_baja_id_usuario_solicitante FOREIGN KEY (id_usuario_solicitante) REFERENCES public.usuario(id_usuario);


--
-- Name: solicitud_baja fk_solicitud_baja_unidad; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitud_baja
    ADD CONSTRAINT fk_solicitud_baja_unidad FOREIGN KEY (id_unidad) REFERENCES public.unidad_equipo(id_unidad);


--
-- Name: stock_consumible fk_stock_bodega; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_consumible
    ADD CONSTRAINT fk_stock_bodega FOREIGN KEY (id_bodega) REFERENCES public.bodega(id_bodega);


--
-- Name: stock_consumible fk_stock_tipo_equipo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_consumible
    ADD CONSTRAINT fk_stock_tipo_equipo FOREIGN KEY (id_tipo_equipo) REFERENCES public.tipo_equipo(id_tipo_equipo);


--
-- Name: tipo_equipo fk_tipo_equipo_id_empresa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_equipo
    ADD CONSTRAINT fk_tipo_equipo_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa);


--
-- Name: toma_inventario fk_toma_inventario_id_empresa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.toma_inventario
    ADD CONSTRAINT fk_toma_inventario_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa);


--
-- Name: transferencia_equipo fk_transferencia_equipo_id_empresa_destino; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencia_equipo
    ADD CONSTRAINT fk_transferencia_equipo_id_empresa_destino FOREIGN KEY (id_empresa_destino) REFERENCES public.empresa(id_empresa);


--
-- Name: transferencia_equipo fk_transferencia_equipo_id_empresa_origen; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencia_equipo
    ADD CONSTRAINT fk_transferencia_equipo_id_empresa_origen FOREIGN KEY (id_empresa_origen) REFERENCES public.empresa(id_empresa);


--
-- Name: transferencia_equipo fk_transferencia_equipo_id_usuario_registro; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencia_equipo
    ADD CONSTRAINT fk_transferencia_equipo_id_usuario_registro FOREIGN KEY (id_usuario_registro) REFERENCES public.usuario(id_usuario);


--
-- Name: unidad_equipo fk_unidad_equipo_id_bodega_actual; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidad_equipo
    ADD CONSTRAINT fk_unidad_equipo_id_bodega_actual FOREIGN KEY (id_bodega_actual) REFERENCES public.bodega(id_bodega);


--
-- Name: unidad_equipo fk_unidad_equipo_id_empresa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidad_equipo
    ADD CONSTRAINT fk_unidad_equipo_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa);


--
-- Name: unidad_equipo fk_unidad_equipo_id_tecnico_asignado; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidad_equipo
    ADD CONSTRAINT fk_unidad_equipo_id_tecnico_asignado FOREIGN KEY (id_tecnico_asignado) REFERENCES public.usuario(id_usuario);


--
-- Name: unidad_equipo fk_unidad_tipo_equipo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidad_equipo
    ADD CONSTRAINT fk_unidad_tipo_equipo FOREIGN KEY (id_tipo_equipo) REFERENCES public.tipo_equipo(id_tipo_equipo);


--
-- Name: usuario fk_usuario_id_empresa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT fk_usuario_id_empresa FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa);


--
-- Name: usuario_rol fk_usuario_rol_rol; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_rol
    ADD CONSTRAINT fk_usuario_rol_rol FOREIGN KEY (id_rol) REFERENCES public.rol(id_rol);


--
-- Name: usuario_rol fk_usuario_rol_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_rol
    ADD CONSTRAINT fk_usuario_rol_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);


--
-- Name: prestamo_externo prestamo_externo_id_unidad_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prestamo_externo
    ADD CONSTRAINT prestamo_externo_id_unidad_fkey FOREIGN KEY (id_unidad) REFERENCES public.unidad_equipo(id_unidad);


--
-- Name: toma_inventario_detalle toma_inventario_detalle_id_tipo_equipo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.toma_inventario_detalle
    ADD CONSTRAINT toma_inventario_detalle_id_tipo_equipo_fkey FOREIGN KEY (id_tipo_equipo) REFERENCES public.tipo_equipo(id_tipo_equipo);


--
-- Name: toma_inventario_detalle toma_inventario_detalle_id_toma_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.toma_inventario_detalle
    ADD CONSTRAINT toma_inventario_detalle_id_toma_fkey FOREIGN KEY (id_toma) REFERENCES public.toma_inventario(id_toma) ON DELETE CASCADE;


--
-- Name: toma_inventario_detalle toma_inventario_detalle_id_unidad_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.toma_inventario_detalle
    ADD CONSTRAINT toma_inventario_detalle_id_unidad_fkey FOREIGN KEY (id_unidad) REFERENCES public.unidad_equipo(id_unidad);


--
-- Name: toma_inventario toma_inventario_id_bodega_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.toma_inventario
    ADD CONSTRAINT toma_inventario_id_bodega_fkey FOREIGN KEY (id_bodega) REFERENCES public.bodega(id_bodega);


--
-- Name: toma_inventario toma_inventario_id_usuario_apertura_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.toma_inventario
    ADD CONSTRAINT toma_inventario_id_usuario_apertura_fkey FOREIGN KEY (id_usuario_apertura) REFERENCES public.usuario(id_usuario);


--
-- Name: toma_inventario toma_inventario_id_usuario_cierre_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.toma_inventario
    ADD CONSTRAINT toma_inventario_id_usuario_cierre_fkey FOREIGN KEY (id_usuario_cierre) REFERENCES public.usuario(id_usuario);


--
-- PostgreSQL database dump complete
--


