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
];

async function main() {
  const ds = new DataSource({ type: 'postgres', url: process.env.DATABASE_URL });
  await ds.initialize();
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
