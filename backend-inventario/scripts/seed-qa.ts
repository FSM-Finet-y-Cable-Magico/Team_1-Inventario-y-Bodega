/**
 * Seed de datos de prueba para QA.
 *
 * Crea (si no existen):
 *  - Empresas: Finet (id 1) y Cable Mágico (id 2)
 *  - Bodegas: una por empresa
 *  - Usuarios:
 *    - superusuario / Super1234  → rol SUPERUSUARIO, empresa Finet
 *    - admin_cable / Cable1234   → rol ADMIN, empresa Cable Mágico (id 2)
 *    - tecnico_qa / Tecnico1234  → rol TECNICO_TERRENO, empresa Finet
 *    - tecnico_cable / TecnicoCable1234 → rol TECNICO_TERRENO, empresa Cable Mágico (id 2)
 *
 * Uso: npm run seed:qa
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

const EMPRESAS_QA = [
  { id: 1, nombre: 'Finet' },
  { id: 2, nombre: 'Cable Mágico' },
];

const BODEGAS_QA = [
  { id_empresa: 1, nombre: 'Bodega Finet Central', direccion: 'Dirección de prueba Finet' },
  { id_empresa: 2, nombre: 'Bodega Cable Mágico Central', direccion: 'Dirección de prueba Cable Mágico' },
];

const USUARIOS_QA = [
  {
    nombre_usuario: 'superusuario',
    nombre_completo: 'Super Usuario QA',
    password: 'Super1234',
    id_empresa: 1,
    rol: 'SUPERUSUARIO',
  },
  {
    nombre_usuario: 'admin_cable',
    nombre_completo: 'Admin Cable Mágico QA',
    password: 'Cable1234',
    id_empresa: 2,
    rol: 'ADMIN',
  },
  {
    nombre_usuario: 'tecnico_qa',
    nombre_completo: 'Técnico Terreno QA',
    password: 'Tecnico1234',
    id_empresa: 1,
    rol: 'TECNICO_TERRENO',
  },
  {
    nombre_usuario: 'tecnico_cable',
    nombre_completo: 'Técnico Cable Mágico QA',
    password: 'TecnicoCable1234',
    id_empresa: 2,
    rol: 'TECNICO_TERRENO',
  },
];

async function main() {
  const ds = new DataSource({ type: 'postgres', url: process.env.DATABASE_URL });
  await ds.initialize();

  // Asegurar empresas de prueba
  for (const e of EMPRESAS_QA) {
    await ds.query(
      `INSERT INTO empresa (id_empresa, nombre) VALUES ($1, $2)
       ON CONFLICT (id_empresa) DO UPDATE SET nombre = EXCLUDED.nombre`,
      [e.id, e.nombre],
    );
  }
  console.log('✓ empresas Finet y Cable Mágico verificadas');

  // Asegurar bodegas de prueba
  for (const b of BODEGAS_QA) {
    const existe = await ds.query(
      'SELECT id_bodega FROM bodega WHERE nombre = $1 AND id_empresa = $2',
      [b.nombre, b.id_empresa],
    );
    if (existe.length) {
      console.log(`- ${b.nombre}: ya existe, se omite`);
      continue;
    }
    await ds.query(
      `INSERT INTO bodega (id_empresa, nombre, direccion, activa)
       VALUES ($1, $2, $3, true) RETURNING id_bodega`,
      [b.id_empresa, b.nombre, b.direccion],
    );
    console.log(`✓ ${b.nombre} creada`);
  }

  for (const u of USUARIOS_QA) {
    const existe = await ds.query(
      'SELECT id_usuario FROM usuario WHERE nombre_usuario = $1',
      [u.nombre_usuario],
    );
    if (existe.length) {
      console.log(`- ${u.nombre_usuario}: ya existe, se omite`);
      continue;
    }

    let rol = await ds.query('SELECT id_rol FROM rol WHERE nombre_rol = $1', [u.rol]);
    if (!rol.length) {
      rol = await ds.query(
        'INSERT INTO rol (nombre_rol, descripcion) VALUES ($1, $2) RETURNING id_rol',
        [u.rol, `Rol ${u.rol} (creado por seed:qa)`],
      );
      console.log(`✓ rol ${u.rol} no existía, creado`);
    }

    const hash = await bcrypt.hash(u.password, 12);
    const insertado = await ds.query(
      `INSERT INTO usuario (nombre_usuario, nombre_completo, password_hash, id_empresa, activo, intentos_fallidos, debe_cambiar_password)
       VALUES ($1, $2, $3, $4, true, 0, false) RETURNING id_usuario`,
      [u.nombre_usuario, u.nombre_completo, hash, u.id_empresa],
    );
    await ds.query(
      'INSERT INTO usuario_rol (id_usuario, id_rol) VALUES ($1, $2)',
      [insertado[0].id_usuario, rol[0].id_rol],
    );
    console.log(`✓ ${u.nombre_usuario} creado (${u.rol}, empresa ${u.id_empresa}) — contraseña: ${u.password}`);
  }

  await ds.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
