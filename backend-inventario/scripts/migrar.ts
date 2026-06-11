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
  `ALTER TABLE tipo_equipo ADD COLUMN IF NOT EXISTS marca varchar(50)`,
  `ALTER TABLE tipo_equipo ADD COLUMN IF NOT EXISTS modelo varchar(50)`,
  `ALTER TABLE tipo_equipo ADD COLUMN IF NOT EXISTS descripcion_tecnica varchar(500)`,
  `ALTER TABLE tipo_equipo ADD COLUMN IF NOT EXISTS unidad_medida varchar(20)`,
  `ALTER TABLE tipo_equipo ADD COLUMN IF NOT EXISTS garantia_dias integer DEFAULT 0`,
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
