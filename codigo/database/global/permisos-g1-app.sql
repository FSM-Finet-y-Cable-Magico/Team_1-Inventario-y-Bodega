-- Permisos de g1_app sobre las tablas del Grupo 1 (Inventario) en finet_global_validacion.
-- Lo ejecuta el dueño de las tablas (finet_db_admin) o un superusuario de Postgres.
-- Es idempotente: se puede correr más de una vez. Sólo toca tablas de G1 que existan.
DO $$
DECLARE
  t text;
  s text;
  tablas text[] := string_to_array('asignacion_equipo_servicio bodega borrador_cierre cierre_reparacion donacion donacion_detalle historial_estado_equipo integracion_activacion integracion_cierre inventario_personal_tecnico log_auditoria movimiento_inventario notificacion orden_ingreso orden_ingreso_detalle prestamo_detalle prestamo_externo prestamo_retorno proveedor proveedor_tipo_equipo salida_bodega salida_detalle solicitud_baja stock_consumible tipo_equipo toma_inventario toma_inventario_detalle transferencia_equipo unidad_equipo', ' ');
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'No existe: %', t;
      CONTINUE;
    END IF;
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO g1_app', t);
    FOR s IN
      SELECT pg_get_serial_sequence('public.' || t, a.attname)
      FROM pg_attribute a
      WHERE a.attrelid = ('public.' || t)::regclass AND a.attnum > 0 AND NOT a.attisdropped
    LOOP
      IF s IS NOT NULL THEN
        EXECUTE format('GRANT USAGE, SELECT, UPDATE ON SEQUENCE %s TO g1_app', s);
      END IF;
    END LOOP;
    RAISE NOTICE 'OK: %', t;
  END LOOP;
END
$$;

-- Verificación: debe devolver 0 filas
SELECT c.relname AS tabla_sin_permiso
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
  AND c.relname = ANY (string_to_array('asignacion_equipo_servicio bodega borrador_cierre cierre_reparacion donacion donacion_detalle historial_estado_equipo integracion_activacion integracion_cierre inventario_personal_tecnico log_auditoria movimiento_inventario notificacion orden_ingreso orden_ingreso_detalle prestamo_detalle prestamo_externo prestamo_retorno proveedor proveedor_tipo_equipo salida_bodega salida_detalle solicitud_baja stock_consumible tipo_equipo toma_inventario toma_inventario_detalle transferencia_equipo unidad_equipo', ' '))
  AND NOT has_table_privilege('g1_app', c.oid, 'SELECT,INSERT,UPDATE,DELETE');
