-- ============================================================
--  Carga de equipos para las integraciones con G3 y G8 (VPS)
--
--  Agrega unidades serializadas y stock de consumibles sobre los
--  tipos de equipo, bodegas y técnicos que ya crea el seed QA.
--  Es idempotente: se puede ejecutar varias veces; las series que
--  ya existen se omiten y el stock solo sube hasta el mínimo indicado.
--
--  Uso en la VPS (carpeta codigo):
--    docker compose -f docker-compose.vps.yml exec -T db \
--      sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
--      < database/poblar-equipos-vps.sql
-- ============================================================

BEGIN;

-- Lotes de unidades: primero "En bodega" y luego "Asignado a técnico".
-- Series: <prefijo>-0001, <prefijo>-0002, ...
CREATE TEMP TABLE lote_vps (
    tipo         TEXT,
    id_empresa   INTEGER,
    prefijo      TEXT,
    en_bodega    INTEGER,
    asignadas    INTEGER,
    bodega       TEXT,
    tecnico      TEXT
) ON COMMIT DROP;

INSERT INTO lote_vps VALUES
    ('ONT QA Finet',          1, 'VPS-ONT-F', 15, 10, 'Bodega Finet Central',        'tecnico_qa'),
    ('Router Wi-Fi QA',       1, 'VPS-RTR-F', 10,  5, 'Bodega Finet Central',        'tecnico_qa'),
    ('Decodificador TV QA',   1, 'VPS-DEC-F', 10,  5, 'Bodega Finet Central',        'tecnico_qa'),
    ('Switch 8 puertos QA',   1, 'VPS-SW-F',   5,  0, 'Bodega Finet Central',        'tecnico_qa'),
    ('ONT QA Cable Mágico',   2, 'VPS-ONT-C', 15, 10, 'Bodega Cable Mágico Central', 'tecnico_cable'),
    ('Router Wi-Fi Cable QA', 2, 'VPS-RTR-C', 10,  5, 'Bodega Cable Mágico Central', 'tecnico_cable');

-- Avisar si falta algún tipo, bodega o técnico del seed (no se cargaría ese lote)
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT l.* FROM lote_vps l
        WHERE NOT EXISTS (SELECT 1 FROM tipo_equipo t WHERE t.nombre = l.tipo AND t.id_empresa = l.id_empresa)
           OR NOT EXISTS (SELECT 1 FROM bodega b WHERE b.nombre = l.bodega AND b.id_empresa = l.id_empresa)
           OR NOT EXISTS (SELECT 1 FROM usuario u WHERE u.nombre_usuario = l.tecnico)
    LOOP
        RAISE WARNING 'Lote % omitido: falta su tipo, bodega o técnico en la base', r.prefijo;
    END LOOP;
END $$;

WITH nuevas AS (
    INSERT INTO unidad_equipo
        (id_tipo_equipo, id_empresa, numero_serie, modelo, estado,
         fecha_adquisicion, fecha_venc_garantia, id_bodega_actual, id_tecnico_asignado,
         proveedor, observaciones)
    SELECT t.id_tipo_equipo,
           l.id_empresa,
           l.prefijo || '-' || lpad(g::text, 4, '0'),
           t.modelo,
           CASE WHEN g <= l.en_bodega THEN 'En bodega' ELSE 'Asignado a técnico' END,
           CURRENT_DATE - 30,
           CURRENT_DATE + 335,
           CASE WHEN g <= l.en_bodega THEN b.id_bodega END,
           CASE WHEN g >  l.en_bodega THEN u.id_usuario END,
           'Proveedor QA',
           'Carga VPS para integración G3/G8'
    FROM lote_vps l
    JOIN tipo_equipo t ON t.nombre = l.tipo AND t.id_empresa = l.id_empresa
    JOIN bodega b      ON b.nombre = l.bodega AND b.id_empresa = l.id_empresa
    JOIN usuario u     ON u.nombre_usuario = l.tecnico
    CROSS JOIN LATERAL generate_series(1, l.en_bodega + l.asignadas) AS g
    ON CONFLICT (numero_serie) DO NOTHING
    RETURNING id_unidad, estado
)
INSERT INTO historial_estado_equipo (id_unidad, id_usuario, estado_anterior, estado_nuevo, motivo)
SELECT n.id_unidad,
       (SELECT id_usuario FROM usuario WHERE nombre_usuario = 'superusuario'),
       NULL,
       n.estado,
       'Carga inicial de equipos en la VPS para integración G3/G8'
FROM nuevas n;

-- Stock de consumibles en la bodega central de cada empresa (mínimo garantizado)
CREATE TEMP TABLE stock_vps (
    tipo        TEXT,
    id_empresa  INTEGER,
    bodega      TEXT,
    cantidad    NUMERIC(10,2),
    umbral      NUMERIC(10,2)
) ON COMMIT DROP;

INSERT INTO stock_vps VALUES
    ('Conector SC/APC QA',       1, 'Bodega Finet Central',        500, 50),
    ('Fibra drop QA',            1, 'Bodega Finet Central',       2000, 200),
    ('Cable UTP Cat6 QA',        1, 'Bodega Finet Central',       1000, 100),
    ('Conector SC/APC Cable QA', 2, 'Bodega Cable Mágico Central', 500, 50),
    ('Fibra drop Cable QA',      2, 'Bodega Cable Mágico Central', 2000, 200);

INSERT INTO stock_consumible (id_tipo_equipo, id_bodega, cantidad_disponible, umbral_minimo)
SELECT t.id_tipo_equipo, b.id_bodega, s.cantidad, s.umbral
FROM stock_vps s
JOIN tipo_equipo t ON t.nombre = s.tipo AND t.id_empresa = s.id_empresa
JOIN bodega b      ON b.nombre = s.bodega AND b.id_empresa = s.id_empresa
WHERE NOT EXISTS (
    SELECT 1 FROM stock_consumible sc
    WHERE sc.id_tipo_equipo = t.id_tipo_equipo AND sc.id_bodega = b.id_bodega
);

UPDATE stock_consumible sc
SET cantidad_disponible = GREATEST(sc.cantidad_disponible, s.cantidad)
FROM stock_vps s
JOIN tipo_equipo t ON t.nombre = s.tipo AND t.id_empresa = s.id_empresa
JOIN bodega b      ON b.nombre = s.bodega AND b.id_empresa = s.id_empresa
WHERE sc.id_tipo_equipo = t.id_tipo_equipo AND sc.id_bodega = b.id_bodega;

COMMIT;

-- Resumen de lo que queda disponible para las integraciones
SELECT e.nombre AS empresa, t.nombre AS tipo, u.estado, count(*) AS unidades
FROM unidad_equipo u
JOIN tipo_equipo t ON t.id_tipo_equipo = u.id_tipo_equipo
JOIN empresa e     ON e.id_empresa = u.id_empresa
WHERE u.estado IN ('En bodega', 'Asignado a técnico')
GROUP BY e.nombre, t.nombre, u.estado
ORDER BY e.nombre, t.nombre, u.estado;

SELECT u.nombre_usuario AS tecnico, u.id_usuario, u.id_empresa
FROM usuario u
WHERE u.nombre_usuario IN ('tecnico_qa', 'tecnico_cable');
