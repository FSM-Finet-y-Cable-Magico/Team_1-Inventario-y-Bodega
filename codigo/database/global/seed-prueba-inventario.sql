-- ============================================================
--  Datos de prueba de inventario para la BDD global (crm_g8_prueba)
--
--  Para que G2, G3 y G8 prueben sus integraciones con G1. Solo escribe
--  en tablas de inventario de G1. Todo lleva "PRUEBA" en el nombre o la
--  serie, para distinguirlo de los datos reales.
--
--  Es idempotente: se puede ejecutar varias veces sin duplicar. El stock
--  solo sube hasta el mínimo indicado.
--
--  Requisitos: empresas 1 y 2, y el usuario superinventario (figura como
--  autor en el historial de cada unidad).
--
--  No crea usuarios ni unidades "Asignado a técnico": la base global aún
--  no tiene técnicos con el rol que usa G1.
-- ============================================================

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM usuario WHERE nombre_usuario = 'superinventario') THEN
        RAISE EXCEPTION 'Falta el usuario superinventario';
    END IF;
    IF (SELECT count(*) FROM empresa WHERE id_empresa IN (1, 2)) <> 2 THEN
        RAISE EXCEPTION 'Faltan las empresas 1 y 2';
    END IF;
END $$;

-- Bodegas
INSERT INTO bodega (id_empresa, nombre, direccion, activa)
SELECT v.id_empresa, v.nombre, v.direccion, true
FROM (VALUES
    (1, 'Bodega PRUEBA Finet Central',        'Dirección de prueba 100, Viña del Mar'),
    (1, 'Bodega PRUEBA Finet Norte',          'Dirección de prueba 200, Quilpué'),
    (2, 'Bodega PRUEBA Cable Mágico Central', 'Dirección de prueba 300, San Antonio')
) AS v(id_empresa, nombre, direccion)
WHERE NOT EXISTS (
    SELECT 1 FROM bodega b WHERE b.nombre = v.nombre AND b.id_empresa = v.id_empresa
);

-- Catálogo. La categoría y la unidad de medida usan los valores de catalog.service.ts
CREATE TEMP TABLE tipo_prueba (
    id_empresa  INTEGER,
    nombre      TEXT,
    categoria   TEXT,
    marca       TEXT,
    modelo      TEXT,
    unidad      TEXT,
    garantia    INTEGER,
    con_serie   BOOLEAN
) ON COMMIT DROP;

INSERT INTO tipo_prueba VALUES
    (1, 'ONT PRUEBA Finet',            'ONT/ONU',                 'Huawei PRUEBA', 'HG8145-PRUEBA',  'Unidad', 365, true),
    (1, 'Router PRUEBA Finet',         'Otro',                    'TP-Link PRUEBA','AX10-PRUEBA',    'Unidad', 365, true),
    (1, 'Decodificador PRUEBA Finet',  'Decodificador',           'ZTE PRUEBA',    'B860-PRUEBA',    'Unidad', 365, true),
    (1, 'Switch PRUEBA Finet',         'Otro',                    'TP-Link PRUEBA','SG108-PRUEBA',   'Unidad', 730, true),
    (1, 'Conector SC/APC PRUEBA Finet','Consumible conector',     'Genérico PRUEBA','SCAPC-PRUEBA',  'Unidad',   0, false),
    (1, 'Fibra drop PRUEBA Finet',     'Consumible fibra óptica', 'Genérico PRUEBA','DROP-PRUEBA',   'Metro',    0, false),
    (2, 'ONT PRUEBA Cable',            'ONT/ONU',                 'Huawei PRUEBA', 'HG8145-PRUEBA',  'Unidad', 365, true),
    (2, 'Router PRUEBA Cable',         'Otro',                    'TP-Link PRUEBA','AX10-PRUEBA',    'Unidad', 365, true),
    (2, 'Decodificador PRUEBA Cable',  'Decodificador',           'ZTE PRUEBA',    'B860-PRUEBA',    'Unidad', 365, true),
    (2, 'Conector SC/APC PRUEBA Cable','Consumible conector',     'Genérico PRUEBA','SCAPC-PRUEBA',  'Unidad',   0, false),
    (2, 'Fibra drop PRUEBA Cable',     'Consumible fibra óptica', 'Genérico PRUEBA','DROP-PRUEBA',   'Metro',    0, false);

INSERT INTO tipo_equipo
    (id_empresa, nombre, categoria, marca, modelo, unidad_medida, garantia_dias,
     requiere_serie_individual, activo)
SELECT p.id_empresa, p.nombre, p.categoria, p.marca, p.modelo, p.unidad, p.garantia, p.con_serie, true
FROM tipo_prueba p
WHERE NOT EXISTS (
    SELECT 1 FROM tipo_equipo t WHERE t.nombre = p.nombre AND t.id_empresa = p.id_empresa
);

-- Proveedores
INSERT INTO proveedor (nombre_comercial, rut, nombre_contacto, telefono, email, activa)
VALUES
    ('Proveedor PRUEBA Uno',  '99000001-8', 'Contacto PRUEBA Uno',  '+56900000001', 'proveedor.prueba1@example.com', true),
    ('Proveedor PRUEBA Dos',  '99000002-6', 'Contacto PRUEBA Dos',  '+56900000002', 'proveedor.prueba2@example.com', true),
    ('Proveedor PRUEBA Tres', '99000003-4', 'Contacto PRUEBA Tres', '+56900000003', 'proveedor.prueba3@example.com', true)
ON CONFLICT (rut) DO NOTHING;

INSERT INTO proveedor_tipo_equipo (id_proveedor, id_tipo_equipo)
SELECT pr.id_proveedor, t.id_tipo_equipo
FROM proveedor pr
JOIN tipo_prueba p ON true
JOIN tipo_equipo t ON t.nombre = p.nombre AND t.id_empresa = p.id_empresa
WHERE pr.rut IN ('99000001-8', '99000002-6', '99000003-4')
ON CONFLICT (id_proveedor, id_tipo_equipo) DO NOTHING;

-- Unidades con serie. Las últimas de cada lote quedan "En revisión".
-- Series: PRUEBA-<prefijo>-0001, PRUEBA-<prefijo>-0002, ...
CREATE TEMP TABLE lote_prueba (
    tipo       TEXT,
    id_empresa INTEGER,
    prefijo    TEXT,
    en_bodega  INTEGER,
    revision   INTEGER,
    bodega     TEXT
) ON COMMIT DROP;

INSERT INTO lote_prueba VALUES
    ('ONT PRUEBA Finet',           1, 'ONT-F', 28, 2, 'Bodega PRUEBA Finet Central'),
    ('Router PRUEBA Finet',        1, 'RTR-F', 14, 1, 'Bodega PRUEBA Finet Central'),
    ('Decodificador PRUEBA Finet', 1, 'DEC-F', 14, 1, 'Bodega PRUEBA Finet Norte'),
    ('Switch PRUEBA Finet',        1, 'SW-F',   5, 0, 'Bodega PRUEBA Finet Norte'),
    ('ONT PRUEBA Cable',           2, 'ONT-C', 23, 2, 'Bodega PRUEBA Cable Mágico Central'),
    ('Router PRUEBA Cable',        2, 'RTR-C', 14, 1, 'Bodega PRUEBA Cable Mágico Central'),
    ('Decodificador PRUEBA Cable', 2, 'DEC-C',  9, 1, 'Bodega PRUEBA Cable Mágico Central');

WITH nuevas AS (
    INSERT INTO unidad_equipo
        (id_tipo_equipo, id_empresa, numero_serie, modelo, estado,
         fecha_adquisicion, fecha_venc_garantia, id_bodega_actual,
         diagnostico_tecnico, proveedor, observaciones)
    SELECT t.id_tipo_equipo,
           l.id_empresa,
           'PRUEBA-' || l.prefijo || '-' || lpad(g::text, 4, '0'),
           t.modelo,
           CASE WHEN g <= l.en_bodega THEN 'En bodega' ELSE 'En revisión' END,
           CURRENT_DATE - 30,
           CURRENT_DATE + 335,
           CASE WHEN g <= l.en_bodega THEN b.id_bodega END,
           CASE WHEN g >  l.en_bodega THEN 'Diagnóstico de PRUEBA: falla simulada' END,
           'Proveedor PRUEBA Uno',
           'Dato de PRUEBA para integraciones'
    FROM lote_prueba l
    JOIN tipo_equipo t ON t.nombre = l.tipo AND t.id_empresa = l.id_empresa
    JOIN bodega b      ON b.nombre = l.bodega AND b.id_empresa = l.id_empresa
    CROSS JOIN LATERAL generate_series(1, l.en_bodega + l.revision) AS g
    ON CONFLICT (numero_serie) DO NOTHING
    RETURNING id_unidad, estado
)
INSERT INTO historial_estado_equipo (id_unidad, id_usuario, estado_anterior, estado_nuevo, motivo)
SELECT n.id_unidad,
       (SELECT id_usuario FROM usuario WHERE nombre_usuario = 'superinventario'),
       NULL,
       n.estado,
       'Carga de datos de PRUEBA en la BDD global'
FROM nuevas n;

-- Stock de consumibles
CREATE TEMP TABLE stock_prueba (
    tipo       TEXT,
    id_empresa INTEGER,
    bodega     TEXT,
    cantidad   NUMERIC(10,2),
    umbral     NUMERIC(10,2)
) ON COMMIT DROP;

INSERT INTO stock_prueba VALUES
    ('Conector SC/APC PRUEBA Finet', 1, 'Bodega PRUEBA Finet Central',         500,  50),
    ('Fibra drop PRUEBA Finet',      1, 'Bodega PRUEBA Finet Central',        2000, 200),
    ('Conector SC/APC PRUEBA Finet', 1, 'Bodega PRUEBA Finet Norte',           200,  20),
    ('Conector SC/APC PRUEBA Cable', 2, 'Bodega PRUEBA Cable Mágico Central',  500,  50),
    ('Fibra drop PRUEBA Cable',      2, 'Bodega PRUEBA Cable Mágico Central', 2000, 200);

INSERT INTO stock_consumible (id_tipo_equipo, id_bodega, cantidad_disponible, umbral_minimo)
SELECT t.id_tipo_equipo, b.id_bodega, s.cantidad, s.umbral
FROM stock_prueba s
JOIN tipo_equipo t ON t.nombre = s.tipo AND t.id_empresa = s.id_empresa
JOIN bodega b      ON b.nombre = s.bodega AND b.id_empresa = s.id_empresa
WHERE NOT EXISTS (
    SELECT 1 FROM stock_consumible sc
    WHERE sc.id_tipo_equipo = t.id_tipo_equipo AND sc.id_bodega = b.id_bodega
);

UPDATE stock_consumible sc
SET cantidad_disponible = GREATEST(sc.cantidad_disponible, s.cantidad)
FROM stock_prueba s
JOIN tipo_equipo t ON t.nombre = s.tipo AND t.id_empresa = s.id_empresa
JOIN bodega b      ON b.nombre = s.bodega AND b.id_empresa = s.id_empresa
WHERE sc.id_tipo_equipo = t.id_tipo_equipo AND sc.id_bodega = b.id_bodega;

COMMIT;

-- Resumen
SELECT e.id_empresa, t.nombre AS tipo, u.estado, count(*)::int AS unidades
FROM unidad_equipo u
JOIN tipo_equipo t ON t.id_tipo_equipo = u.id_tipo_equipo
JOIN empresa e     ON e.id_empresa = u.id_empresa
WHERE u.numero_serie LIKE 'PRUEBA-%'
GROUP BY e.id_empresa, t.nombre, u.estado
ORDER BY 1, 2, 3;
