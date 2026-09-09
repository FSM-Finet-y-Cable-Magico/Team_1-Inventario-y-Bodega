/**
 * Seed de datos de prueba para QA.
 *
 * Crea (si no existen):
 *  - Empresas: Finet (id 1) y Cable Mágico (id 2)
 *  - Bodegas: una por empresa
 *  - Usuarios:
 *    - superusuario / Super1234  → rol SUPERUSUARIO, empresa Finet
 *    - admin_finet / Finet1234   → rol ADMIN, empresa Finet
 *    - admin_cable / Cable1234   → rol ADMIN, empresa Cable Mágico (id 2)
 *    - tecnico_qa / Tecnico1234  → rol TECNICO_TERRENO, empresa Finet
 *    - tecnico_cable / TecnicoCable1234 → rol TECNICO_TERRENO, empresa Cable Mágico (id 2)
 *  - Tipo de equipo ONT (uno por empresa, requiere serie)
 *  - Unidades de equipo QA con seriales conocidos para la integración con G3
 *    (tres por empresa: En bodega / Asignado a técnico / Instalado en cliente).
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
    nombre_usuario: 'admin_finet',
    nombre_completo: 'Admin Finet QA',
    password: 'Finet1234',
    id_empresa: 1,
    rol: 'ADMIN',
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

// Integración G3: tipos de equipo de prueba (uno por empresa, con serie individual).
const TIPOS_EQUIPO_QA = [
  {
    id_empresa: 1,
    nombre: 'ONT QA Finet',
    marca: 'Huawei',
    modelo: 'HG8145V',
  },
  {
    id_empresa: 2,
    nombre: 'ONT QA Cable Mágico',
    marca: 'Huawei',
    modelo: 'HG8145V',
  },
];

// Integración G3: seriales conocidos para probar GET /integraciones/unidades/:serie
// y el webhook de cierre. Los tres estados cubren las acciones acordadas
// (INSTALADO_EN_CLIENTE, RETIRADO_*, BAJA_EN_TERRENO) según su origen.
const UNIDADES_QA = [
  { serie: 'QA-ONT-F-0001', id_empresa: 1, tipo: 'ONT QA Finet', estado: 'En bodega', bodega: 'Bodega Finet Central' },
  { serie: 'QA-ONT-F-0002', id_empresa: 1, tipo: 'ONT QA Finet', estado: 'Asignado a técnico', tecnico: 'tecnico_qa' },
  { serie: 'QA-ONT-F-0003', id_empresa: 1, tipo: 'ONT QA Finet', estado: 'Instalado en cliente' },
  { serie: 'QA-ONT-C-0001', id_empresa: 2, tipo: 'ONT QA Cable Mágico', estado: 'En bodega', bodega: 'Bodega Cable Mágico Central' },
  { serie: 'QA-ONT-C-0002', id_empresa: 2, tipo: 'ONT QA Cable Mágico', estado: 'Asignado a técnico', tecnico: 'tecnico_cable' },
  { serie: 'QA-ONT-C-0003', id_empresa: 2, tipo: 'ONT QA Cable Mágico', estado: 'Instalado en cliente' },
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

  // Asegurar tipos de equipo QA (requieren serie individual)
  for (const t of TIPOS_EQUIPO_QA) {
    const existe = await ds.query('SELECT id_tipo_equipo FROM tipo_equipo WHERE nombre = $1 AND id_empresa = $2', [
      t.nombre,
      t.id_empresa,
    ]);
    if (existe.length) {
      console.log(`- ${t.nombre}: ya existe, se omite`);
      continue;
    }
    await ds.query(
      `INSERT INTO tipo_equipo (id_empresa, nombre, categoria, marca, modelo, unidad_medida, garantia_dias, requiere_serie_individual)
       VALUES ($1, $2, 'EQUIPO', $3, $4, 'unidad', 365, true)`,
      [t.id_empresa, t.nombre, t.marca, t.modelo],
    );
    console.log(`✓ ${t.nombre} creado`);
  }

  // Asegurar unidades QA con seriales para la integración con G3
  for (const uq of UNIDADES_QA) {
    const existe = await ds.query('SELECT id_unidad FROM unidad_equipo WHERE numero_serie = $1', [uq.serie]);
    if (existe.length) {
      console.log(`- ${uq.serie}: ya existe, se omite`);
      continue;
    }

    const tipo = await ds.query(
      'SELECT id_tipo_equipo FROM tipo_equipo WHERE nombre = $1 AND id_empresa = $2',
      [uq.tipo, uq.id_empresa],
    );
    if (!tipo.length) {
      throw new Error(`Tipo de equipo ${uq.tipo} no encontrado para ${uq.serie}`);
    }

    const bodegaId = uq.bodega
      ? (await ds.query('SELECT id_bodega FROM bodega WHERE nombre = $1 AND id_empresa = $2', [uq.bodega, uq.id_empresa]))[0]
          ?.id_bodega ?? null
      : null;
    const tecnicoId = uq.tecnico
      ? (await ds.query('SELECT id_usuario FROM usuario WHERE nombre_usuario = $1', [uq.tecnico]))[0]?.id_usuario ?? null
      : null;

    await ds.query(
      `INSERT INTO unidad_equipo
         (id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion, fecha_venc_garantia,
          id_bodega_actual, id_tecnico_asignado, proveedor, observaciones)
       VALUES ($1, $2, $3, $4, $5, '2026-01-15', '2027-01-15', $6, $7, 'Proveedor QA', 'Unidad QA para integración con G3')`,
      [tipo[0].id_tipo_equipo, uq.id_empresa, uq.serie, 'HG8145V', uq.estado, bodegaId, tecnicoId],
    );
    console.log(`✓ ${uq.serie} creada (${uq.estado})`);
  }

  await ds.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
