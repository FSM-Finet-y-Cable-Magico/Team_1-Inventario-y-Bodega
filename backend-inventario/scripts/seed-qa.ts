/**
 * Seed de usuarios de prueba para QA (CU-10, CU-14, CU-15).
 *
 * Crea (si no existen):
 *  - superusuario / Super1234  → rol SUPERUSUARIO, empresa Finet
 *  - admin_cable / Cable1234   → rol ADMIN, empresa Cable Mágico (id 2)
 *  - tecnico_qa / Tecnico1234  → rol TECNICO_TERRENO, empresa Finet
 *
 * Uso: npm run seed:qa
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

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
];

async function main() {
  const ds = new DataSource({ type: 'postgres', url: process.env.DATABASE_URL });
  await ds.initialize();

  for (const u of USUARIOS_QA) {
    const existe = await ds.query(
      'SELECT id_usuario FROM usuario WHERE nombre_usuario = $1',
      [u.nombre_usuario],
    );
    if (existe.length) {
      console.log(`- ${u.nombre_usuario}: ya existe, se omite`);
      continue;
    }

    const rol = await ds.query('SELECT id_rol FROM rol WHERE nombre_rol = $1', [u.rol]);
    if (!rol.length) {
      console.log(`- ${u.nombre_usuario}: rol ${u.rol} no existe en la tabla rol, se omite`);
      continue;
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
