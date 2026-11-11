-- ============================================================
--  Datos de prueba para probar en vivo G1 <-> G3 <-> G8 en la BDD global
--  (finet_global_validacion).
--
--  Deja a cada técnico de prueba con equipos y consumibles en su poder,
--  para que G3 pueda cerrar OT de instalación y reparación y G8 pueda
--  enviar la activación del mismo servicio.
--
--  Hace lo mismo que una salida de bodega de G1 (CU-57/CU-60):
--  salida_bodega + salida_detalle, unidad 'En bodega' -> 'Asignado a técnico',
--  historial_estado_equipo, movimiento_inventario SALIDA_A_TECNICO,
--  descuento de stock_consumible, inventario_personal_tecnico y log_auditoria.
--
--  Es idempotente: solo completa lo que falta hasta el mínimo de cada
--  técnico. Si ya lo tiene, no crea ninguna salida.
--
--  Requisitos: haber cargado seed-prueba-inventario.sql (bodegas, tipos y
--  unidades PRUEBA), el usuario superinventario y los técnicos
--  tecnico.prueba1 y tecnico.prueba2 con rol Terreno en la empresa 1.
--  No crea usuarios: la tabla usuario es compartida por todos los grupos.
--
--  Ejecutar como g1_app:  psql "$DATABASE_URL" -f seed-prueba-tecnicos.sql
-- ============================================================

BEGIN;

-- Mínimos por técnico (empresa 1, Bodega PRUEBA Finet Central)
CREATE TEMP TABLE minimo_prueba (
    tipo      TEXT,
    unidades  INTEGER,        -- equipos con serie en 'Asignado a técnico'
    cantidad  NUMERIC(10,2)   -- consumibles en el inventario personal
) ON COMMIT DROP;

INSERT INTO minimo_prueba VALUES
    ('ONT PRUEBA Finet',             5, NULL),
    ('Router PRUEBA Finet',          3, NULL),
    ('Conector SC/APC PRUEBA Finet', NULL, 40),
    ('Fibra drop PRUEBA Finet',      NULL, 300);

DO $$
DECLARE
    v_empresa   CONSTANT INTEGER := 1;
    v_bodega    INTEGER;
    v_autor     INTEGER;
    v_tecnico   RECORD;
    v_min       RECORD;
    v_tipo      RECORD;
    v_unidad    RECORD;
    v_salida    INTEGER;
    v_faltan    NUMERIC;
    v_cupo      INTEGER;
    v_stock     NUMERIC;
    v_unidades  INTEGER;
    v_consum    INTEGER;
BEGIN
    SELECT id_usuario INTO v_autor FROM usuario WHERE nombre_usuario = 'superinventario';
    IF v_autor IS NULL THEN
        RAISE EXCEPTION 'Falta el usuario superinventario';
    END IF;

    SELECT id_bodega INTO v_bodega FROM bodega
    WHERE nombre = 'Bodega PRUEBA Finet Central' AND id_empresa = v_empresa AND activa;
    IF v_bodega IS NULL THEN
        RAISE EXCEPTION 'Falta la Bodega PRUEBA Finet Central (cargar seed-prueba-inventario.sql)';
    END IF;

    FOR v_tecnico IN
        SELECT u.id_usuario, u.nombre_usuario, u.nombre_completo
        FROM usuario u
        WHERE u.nombre_usuario IN ('tecnico.prueba1', 'tecnico.prueba2')
          AND u.id_empresa = v_empresa
          AND u.activo
          AND EXISTS (
              SELECT 1 FROM usuario_rol ur JOIN rol r ON r.id_rol = ur.id_rol
              WHERE ur.id_usuario = u.id_usuario
                AND lower(r.nombre_rol) IN ('terreno', 'tecnico_terreno')
          )
        ORDER BY u.nombre_usuario
    LOOP
        v_salida   := NULL;
        v_unidades := 0;
        v_consum   := 0;

        FOR v_min IN SELECT * FROM minimo_prueba LOOP
            SELECT * INTO v_tipo FROM tipo_equipo
            WHERE nombre = v_min.tipo AND id_empresa = v_empresa;
            IF NOT FOUND THEN
                RAISE NOTICE 'No existe el tipo %, se omite', v_min.tipo;
                CONTINUE;
            END IF;

            IF v_tipo.requiere_serie_individual THEN
                SELECT v_min.unidades - count(*) INTO v_cupo
                FROM unidad_equipo
                WHERE id_tipo_equipo = v_tipo.id_tipo_equipo
                  AND id_tecnico_asignado = v_tecnico.id_usuario
                  AND estado = 'Asignado a técnico';

                FOR v_unidad IN
                    SELECT id_unidad, numero_serie FROM unidad_equipo
                    WHERE id_tipo_equipo = v_tipo.id_tipo_equipo
                      AND id_empresa = v_empresa
                      AND estado = 'En bodega'
                      AND id_bodega_actual = v_bodega
                      AND numero_serie LIKE 'PRUEBA-%'
                    ORDER BY numero_serie
                    LIMIT greatest(v_cupo, 0)
                    FOR UPDATE
                LOOP
                    IF v_salida IS NULL THEN
                        INSERT INTO salida_bodega (id_tecnico, id_bodega_origen, id_empresa, id_usuario_registro)
                        VALUES (v_tecnico.id_usuario, v_bodega, v_empresa, v_autor)
                        RETURNING id_salida INTO v_salida;
                    END IF;

                    UPDATE unidad_equipo
                    SET estado = 'Asignado a técnico',
                        id_tecnico_asignado = v_tecnico.id_usuario,
                        id_bodega_actual = NULL,
                        ubicacion_fisica = NULL
                    WHERE id_unidad = v_unidad.id_unidad;

                    INSERT INTO historial_estado_equipo
                        (id_unidad, id_usuario, estado_anterior, estado_nuevo, motivo, fecha_hora)
                    VALUES (v_unidad.id_unidad, v_autor, 'En bodega', 'Asignado a técnico',
                            'Salida de bodega a técnico. Salida #' || v_salida || '.',
                            now() AT TIME ZONE 'America/Santiago');

                    INSERT INTO salida_detalle (id_salida, id_tipo_equipo, id_unidad)
                    VALUES (v_salida, v_tipo.id_tipo_equipo, v_unidad.id_unidad);

                    INSERT INTO movimiento_inventario
                        (id_tipo_equipo, id_unidad, id_empresa_origen, id_bodega_origen,
                         id_usuario, tipo_movimiento, cantidad, fecha, referencia_id)
                    VALUES (v_tipo.id_tipo_equipo, v_unidad.id_unidad, v_empresa, v_bodega,
                            v_autor, 'SALIDA_A_TECNICO', 1, now() AT TIME ZONE 'UTC', v_salida);

                    v_unidades := v_unidades + 1;
                END LOOP;

                IF v_cupo > 0 AND NOT EXISTS (
                    SELECT 1 FROM salida_detalle sd
                    WHERE sd.id_salida = v_salida AND sd.id_tipo_equipo = v_tipo.id_tipo_equipo
                ) THEN
                    RAISE NOTICE 'Sin unidades % en bodega para %', v_min.tipo, v_tecnico.nombre_usuario;
                END IF;
            ELSE
                SELECT v_min.cantidad - coalesce(max(cantidad), 0) INTO v_faltan
                FROM inventario_personal_tecnico
                WHERE id_tecnico = v_tecnico.id_usuario
                  AND id_tipo_equipo = v_tipo.id_tipo_equipo;
                CONTINUE WHEN v_faltan <= 0;

                SELECT cantidad_disponible INTO v_stock FROM stock_consumible
                WHERE id_bodega = v_bodega AND id_tipo_equipo = v_tipo.id_tipo_equipo
                FOR UPDATE;
                IF v_stock IS NULL OR v_stock < v_faltan THEN
                    RAISE NOTICE 'Stock insuficiente de % (disponible %, faltan %), se omite',
                        v_min.tipo, coalesce(v_stock, 0), v_faltan;
                    CONTINUE;
                END IF;

                IF v_salida IS NULL THEN
                    INSERT INTO salida_bodega (id_tecnico, id_bodega_origen, id_empresa, id_usuario_registro)
                    VALUES (v_tecnico.id_usuario, v_bodega, v_empresa, v_autor)
                    RETURNING id_salida INTO v_salida;
                END IF;

                UPDATE stock_consumible
                SET cantidad_disponible = cantidad_disponible - v_faltan
                WHERE id_bodega = v_bodega AND id_tipo_equipo = v_tipo.id_tipo_equipo;

                UPDATE inventario_personal_tecnico
                SET cantidad = cantidad + v_faltan, fecha_actualizacion = now()
                WHERE id_tecnico = v_tecnico.id_usuario AND id_tipo_equipo = v_tipo.id_tipo_equipo;
                IF NOT FOUND THEN
                    INSERT INTO inventario_personal_tecnico (id_tecnico, id_tipo_equipo, cantidad)
                    VALUES (v_tecnico.id_usuario, v_tipo.id_tipo_equipo, v_faltan);
                END IF;

                INSERT INTO salida_detalle (id_salida, id_tipo_equipo, cantidad)
                VALUES (v_salida, v_tipo.id_tipo_equipo, v_faltan);

                INSERT INTO movimiento_inventario
                    (id_tipo_equipo, id_empresa_origen, id_bodega_origen,
                     id_usuario, tipo_movimiento, cantidad, fecha, referencia_id)
                VALUES (v_tipo.id_tipo_equipo, v_empresa, v_bodega,
                        v_autor, 'SALIDA_A_TECNICO', v_faltan, now() AT TIME ZONE 'UTC', v_salida);

                v_consum := v_consum + 1;
            END IF;
        END LOOP;

        IF v_salida IS NULL THEN
            RAISE NOTICE '% ya tiene lo mínimo, no se crea salida', v_tecnico.nombre_usuario;
        ELSE
            INSERT INTO log_auditoria (id_usuario, accion, entidad_afectada, id_entidad_afectada,
                                       valor_anterior, valor_nuevo)
            VALUES (v_autor, 'SALIDA_BODEGA', 'salida_bodega', v_salida, NULL,
                    jsonb_build_object(
                        'id_tecnico', v_tecnico.id_usuario,
                        'tecnico', v_tecnico.nombre_completo,
                        'bodega', 'Bodega PRUEBA Finet Central',
                        'unidades_salidas', v_unidades,
                        'consumibles_salidos', v_consum,
                        'origen', 'seed-prueba-tecnicos.sql'));
            RAISE NOTICE 'Salida #% para %: % equipo(s), % consumible(s)',
                v_salida, v_tecnico.nombre_usuario, v_unidades, v_consum;
        END IF;
    END LOOP;
END $$;

-- Resumen: lo que cada técnico tiene en su poder
SELECT u.nombre_usuario AS tecnico, t.nombre AS tipo, count(*) AS unidades,
       string_agg(ue.numero_serie, ', ' ORDER BY ue.numero_serie) AS series
FROM unidad_equipo ue
JOIN usuario u     ON u.id_usuario = ue.id_tecnico_asignado
JOIN tipo_equipo t ON t.id_tipo_equipo = ue.id_tipo_equipo
WHERE ue.estado = 'Asignado a técnico'
  AND u.nombre_usuario IN ('tecnico.prueba1', 'tecnico.prueba2')
GROUP BY u.nombre_usuario, t.nombre
ORDER BY 1, 2;

SELECT u.nombre_usuario AS tecnico, t.nombre AS consumible, ip.cantidad
FROM inventario_personal_tecnico ip
JOIN usuario u     ON u.id_usuario = ip.id_tecnico
JOIN tipo_equipo t ON t.id_tipo_equipo = ip.id_tipo_equipo
WHERE u.nombre_usuario IN ('tecnico.prueba1', 'tecnico.prueba2')
ORDER BY 1, 2;

COMMIT;
