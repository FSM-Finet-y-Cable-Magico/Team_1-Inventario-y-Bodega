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
 * Incremento 2 (misma pasada, idempotente): datos de demostración para los CUs
 * nuevos → proveedores, órdenes de ingreso en sus 3 estados, unidades con y sin
 * garantía, salidas a técnico e inventario personal, equipos en revisión y en
 * reparación externa, solicitudes de baja, donaciones, préstamos externos
 * (activo / vencido / cerrado) y movimientos para los reportes.
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

// ============================================================
// Incremento 2 · datos de demostración (idempotentes)
// ============================================================

function dvRut(cuerpo: string): string {
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  return resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
}

function rutDemo(cuerpo: string): string {
  return `${cuerpo}-${dvRut(cuerpo)}`;
}

function fechaISO(offsetDias = 0): string {
  return new Date(Date.now() + offsetDias * 86400000).toLocaleDateString(
    'en-CA',
    { timeZone: 'America/Santiago' },
  );
}

function pad(numero: number, largo: number): string {
  return String(numero).padStart(largo, '0');
}

interface TipoDemo {
  id_empresa: number;
  nombre: string;
  categoria: string;
  marca: string;
  modelo: string | null;
  unidad_medida: string;
  garantia_dias: number;
  requiere: boolean;
}

interface UnidadDemo {
  serie: string;
  id_empresa: number;
  tipo: string;
  estado: string;
  bodega?: string;
  tecnico?: string;
  fecha_adquisicion?: string;
  fecha_venc_garantia?: string;
  diagnostico?: string;
  mac?: string;
  ubicacion?: string;
  proveedor?: string;
  motivo_baja?: string;
  motivo_baja_detalle?: string;
  observaciones?: string;
}

interface PrestamoDemo {
  tipo: string;
  receptor: string;
  rut: string;
  id_empresa: number;
  id_bodega: number;
  fecha_salida: string;
  fecha_retorno: string;
  estado: string;
  detalle: string;
  unidades: string[];
  consumibles: { tipo: string; cantidad: number }[];
  retorno?: {
    cantidad: number;
    fecha_retorno: string;
    observacion: string;
  };
}

const TIPOS_DEMO: TipoDemo[] = [
  {
    id_empresa: 1,
    nombre: 'Router Wi-Fi QA',
    categoria: 'Otro',
    marca: 'TP-Link',
    modelo: 'Archer C6',
    unidad_medida: 'unidad',
    garantia_dias: 365,
    requiere: true,
  },
  {
    id_empresa: 1,
    nombre: 'Switch 8 puertos QA',
    categoria: 'Otro',
    marca: 'TP-Link',
    modelo: 'TL-SG108',
    unidad_medida: 'unidad',
    garantia_dias: 730,
    requiere: true,
  },
  {
    id_empresa: 1,
    nombre: 'Decodificador TV QA',
    categoria: 'Decodificador',
    marca: 'ZTE',
    modelo: 'ZXV10 B860',
    unidad_medida: 'unidad',
    garantia_dias: 365,
    requiere: true,
  },
  {
    id_empresa: 1,
    nombre: 'Conector SC/APC QA',
    categoria: 'Consumible conector',
    marca: 'Fiberhome',
    modelo: null,
    unidad_medida: 'Unidad',
    garantia_dias: 0,
    requiere: false,
  },
  {
    id_empresa: 1,
    nombre: 'Fibra drop QA',
    categoria: 'Consumible fibra óptica',
    marca: 'Fiberhome',
    modelo: null,
    unidad_medida: 'Metro',
    garantia_dias: 0,
    requiere: false,
  },
  {
    id_empresa: 1,
    nombre: 'Cable UTP Cat6 QA',
    categoria: 'Consumible otro',
    marca: 'Panduit',
    modelo: null,
    unidad_medida: 'Metro',
    garantia_dias: 0,
    requiere: false,
  },
  {
    id_empresa: 2,
    nombre: 'Router Wi-Fi Cable QA',
    categoria: 'Otro',
    marca: 'Huawei',
    modelo: 'AX3',
    unidad_medida: 'unidad',
    garantia_dias: 365,
    requiere: true,
  },
  {
    id_empresa: 2,
    nombre: 'Conector SC/APC Cable QA',
    categoria: 'Consumible conector',
    marca: 'Fiberhome',
    modelo: null,
    unidad_medida: 'Unidad',
    garantia_dias: 0,
    requiere: false,
  },
  {
    id_empresa: 2,
    nombre: 'Fibra drop Cable QA',
    categoria: 'Consumible fibra óptica',
    marca: 'Fiberhome',
    modelo: null,
    unidad_medida: 'Metro',
    garantia_dias: 0,
    requiere: false,
  },
];

const PROVEEDORES_DEMO = [
  {
    nombre_comercial: 'Distribuidora Andina SpA',
    rut: rutDemo('76123456'),
    nombre_contacto: 'Marcela Rojas',
    telefono: '+56912345678',
    email: 'ventas@distribuidoraandina.cl',
    tipos: ['ONT QA Finet', 'Router Wi-Fi QA', 'Switch 8 puertos QA'],
  },
  {
    nombre_comercial: 'TecnoRed Chile Ltda.',
    rut: rutDemo('77234567'),
    nombre_contacto: 'Felipe Soto',
    telefono: '+56923456789',
    email: 'contacto@tecnored.cl',
    tipos: ['Decodificador TV QA', 'Conector SC/APC QA'],
  },
  {
    nombre_comercial: 'Importadora Pacífico SpA',
    rut: rutDemo('78345678'),
    nombre_contacto: 'Camila Fuentes',
    telefono: '+56934567890',
    email: 'pedidos@importadorapacifico.cl',
    tipos: ['Router Wi-Fi QA', 'Cable UTP Cat6 QA'],
  },
];

const UNIDADES_DEMO: UnidadDemo[] = [
  // Finet · En bodega (garantías variadas para CU-88)
  {
    serie: 'DEMO-ONT-0001',
    id_empresa: 1,
    tipo: 'ONT QA Finet',
    estado: 'En bodega',
    bodega: 'Bodega Finet Central',
    fecha_adquisicion: fechaISO(-400),
    fecha_venc_garantia: fechaISO(-35),
    ubicacion: 'Estante A-1',
    proveedor: 'Distribuidora Andina SpA',
    mac: 'AA:BB:CC:00:00:01',
  },
  {
    serie: 'DEMO-ONT-0002',
    id_empresa: 1,
    tipo: 'ONT QA Finet',
    estado: 'En bodega',
    bodega: 'Bodega Finet Central',
    fecha_adquisicion: fechaISO(-30),
    fecha_venc_garantia: fechaISO(335),
    ubicacion: 'Estante A-2',
    proveedor: 'Distribuidora Andina SpA',
  },
  {
    serie: 'DEMO-RTR-0001',
    id_empresa: 1,
    tipo: 'Router Wi-Fi QA',
    estado: 'En bodega',
    bodega: 'Bodega Finet Central',
    fecha_adquisicion: fechaISO(-350),
    fecha_venc_garantia: fechaISO(15),
    ubicacion: 'Rack B-1',
    proveedor: 'Importadora Pacífico SpA',
    mac: 'AA:BB:CC:00:00:02',
  },
  {
    serie: 'DEMO-RTR-0002',
    id_empresa: 1,
    tipo: 'Router Wi-Fi QA',
    estado: 'En bodega',
    bodega: 'Bodega Finet Central',
    fecha_adquisicion: fechaISO(-320),
    fecha_venc_garantia: fechaISO(45),
    ubicacion: 'Rack B-2',
    proveedor: 'Importadora Pacífico SpA',
  },
  {
    serie: 'DEMO-RTR-0003',
    id_empresa: 1,
    tipo: 'Router Wi-Fi QA',
    estado: 'En bodega',
    bodega: 'Bodega Finet Central',
    ubicacion: 'Rack B-3',
    observaciones: 'Sin fecha de adquisición: garantía no calculable',
  },
  {
    serie: 'DEMO-SWT-0001',
    id_empresa: 1,
    tipo: 'Switch 8 puertos QA',
    estado: 'En bodega',
    bodega: 'Bodega Finet Central',
    fecha_adquisicion: fechaISO(-650),
    fecha_venc_garantia: fechaISO(80),
    ubicacion: 'Piso 2 / Rack C',
    proveedor: 'Distribuidora Andina SpA',
  },
  {
    serie: 'DEMO-SWT-0002',
    id_empresa: 1,
    tipo: 'Switch 8 puertos QA',
    estado: 'En bodega',
    bodega: 'Bodega Finet Central',
    fecha_adquisicion: fechaISO(-100),
    fecha_venc_garantia: fechaISO(630),
    proveedor: 'Distribuidora Andina SpA',
  },
  // Finet · Asignados a técnico (CU-58 / CU-89)
  {
    serie: 'DEMO-DEC-0001',
    id_empresa: 1,
    tipo: 'Decodificador TV QA',
    estado: 'Asignado a técnico',
    tecnico: 'tecnico_qa',
    fecha_adquisicion: fechaISO(-200),
    fecha_venc_garantia: fechaISO(165),
    proveedor: 'TecnoRed Chile Ltda.',
  },
  {
    serie: 'DEMO-DEC-0002',
    id_empresa: 1,
    tipo: 'Decodificador TV QA',
    estado: 'Asignado a técnico',
    tecnico: 'tecnico_qa',
    fecha_adquisicion: fechaISO(-190),
    fecha_venc_garantia: fechaISO(175),
    proveedor: 'TecnoRed Chile Ltda.',
  },
  {
    serie: 'DEMO-ONT-0004',
    id_empresa: 1,
    tipo: 'ONT QA Finet',
    estado: 'Asignado a técnico',
    tecnico: 'tecnico_qa',
    fecha_adquisicion: fechaISO(-120),
    fecha_venc_garantia: fechaISO(245),
    proveedor: 'Distribuidora Andina SpA',
  },
  // Finet · Instalado en cliente
  {
    serie: 'DEMO-RTR-0004',
    id_empresa: 1,
    tipo: 'Router Wi-Fi QA',
    estado: 'Instalado en cliente',
    fecha_adquisicion: fechaISO(-60),
    fecha_venc_garantia: fechaISO(305),
    mac: 'AA:BB:CC:00:00:03',
    proveedor: 'Importadora Pacífico SpA',
  },
  // Finet · En revisión (CU-77)
  {
    serie: 'DEMO-ONT-0005',
    id_empresa: 1,
    tipo: 'ONT QA Finet',
    estado: 'En revisión',
    diagnostico: 'No enciende',
    proveedor: 'Distribuidora Andina SpA',
  },
  {
    serie: 'DEMO-ONT-0006',
    id_empresa: 1,
    tipo: 'ONT QA Finet',
    estado: 'En revisión',
    diagnostico: 'Sin señal óptica',
    proveedor: 'Distribuidora Andina SpA',
  },
  // Finet · En préstamo externo (CU-76 / CU-82)
  {
    serie: 'DEMO-DEC-0003',
    id_empresa: 1,
    tipo: 'Decodificador TV QA',
    estado: 'En préstamo externo',
    proveedor: 'TecnoRed Chile Ltda.',
  },
  {
    serie: 'DEMO-ONT-0009',
    id_empresa: 1,
    tipo: 'ONT QA Finet',
    estado: 'En préstamo externo',
    proveedor: 'Distribuidora Andina SpA',
  },
  {
    serie: 'DEMO-RTR-0008',
    id_empresa: 1,
    tipo: 'Router Wi-Fi QA',
    estado: 'En préstamo externo',
    proveedor: 'Importadora Pacífico SpA',
  },
  // Finet · Bajas definitivas (CU-78 / CU-79)
  {
    serie: 'DEMO-RTR-0005',
    id_empresa: 1,
    tipo: 'Router Wi-Fi QA',
    estado: 'Dado de baja',
    motivo_baja: 'Falla irreparable',
    motivo_baja_detalle: 'Puerto WAN destruido por descarga eléctrica.',
    proveedor: 'Importadora Pacífico SpA',
  },
  {
    serie: 'DEMO-SWT-0003',
    id_empresa: 1,
    tipo: 'Switch 8 puertos QA',
    estado: 'Dado de baja',
    motivo_baja: 'Obsolescencia',
    proveedor: 'Distribuidora Andina SpA',
  },
  // Finet · Donaciones (CU-80)
  {
    serie: 'DEMO-ONT-0007',
    id_empresa: 1,
    tipo: 'ONT QA Finet',
    estado: 'Dado de baja',
    motivo_baja: 'Donación a institución',
    proveedor: 'Distribuidora Andina SpA',
  },
  {
    serie: 'DEMO-ONT-0008',
    id_empresa: 1,
    tipo: 'ONT QA Finet',
    estado: 'Dado de baja',
    motivo_baja: 'Donación a institución',
    proveedor: 'Distribuidora Andina SpA',
  },
  {
    serie: 'DEMO-RTR-0006',
    id_empresa: 1,
    tipo: 'Router Wi-Fi QA',
    estado: 'Dado de baja',
    motivo_baja: 'Donación a institución',
    proveedor: 'Importadora Pacífico SpA',
  },
  {
    serie: 'DEMO-RTR-0007',
    id_empresa: 1,
    tipo: 'Router Wi-Fi QA',
    estado: 'Dado de baja',
    motivo_baja: 'Donación a institución',
    proveedor: 'Importadora Pacífico SpA',
  },
  // Cable Mágico
  {
    serie: 'DEMO-C-ONT-0001',
    id_empresa: 2,
    tipo: 'ONT QA Cable Mágico',
    estado: 'En bodega',
    bodega: 'Bodega Cable Mágico Central',
    fecha_adquisicion: fechaISO(-80),
    fecha_venc_garantia: fechaISO(285),
    ubicacion: 'Estante C-1',
    mac: 'AA:BB:CC:00:00:04',
  },
  {
    serie: 'DEMO-C-ONT-0002',
    id_empresa: 2,
    tipo: 'ONT QA Cable Mágico',
    estado: 'En bodega',
    bodega: 'Bodega Cable Mágico Central',
    fecha_adquisicion: fechaISO(-75),
    fecha_venc_garantia: fechaISO(290),
    ubicacion: 'Estante C-2',
  },
  {
    serie: 'DEMO-C-RTR-0001',
    id_empresa: 2,
    tipo: 'Router Wi-Fi Cable QA',
    estado: 'Asignado a técnico',
    tecnico: 'tecnico_cable',
    fecha_adquisicion: fechaISO(-40),
    fecha_venc_garantia: fechaISO(325),
  },
  {
    serie: 'DEMO-C-RTR-0002',
    id_empresa: 2,
    tipo: 'Router Wi-Fi Cable QA',
    estado: 'En revisión',
    diagnostico: 'Daño físico visible',
  },
  {
    serie: 'DEMO-C-ONT-0003',
    id_empresa: 2,
    tipo: 'ONT QA Cable Mágico',
    estado: 'Dado de baja',
    motivo_baja: 'Donación a institución',
  },
];

async function idBodega(
  ds: DataSource,
  nombre: string,
  empresa: number,
): Promise<number | null> {
  const filas = await ds.query(
    'SELECT id_bodega FROM bodega WHERE nombre = $1 AND id_empresa = $2',
    [nombre, empresa],
  );
  return filas.length ? filas[0].id_bodega : null;
}

async function idUsuario(
  ds: DataSource,
  nombreUsuario: string,
): Promise<number | null> {
  const filas = await ds.query(
    'SELECT id_usuario FROM usuario WHERE nombre_usuario = $1',
    [nombreUsuario],
  );
  return filas.length ? filas[0].id_usuario : null;
}

async function asegurarTipo(ds: DataSource, t: TipoDemo): Promise<number> {
  const existe = await ds.query(
    'SELECT id_tipo_equipo FROM tipo_equipo WHERE nombre = $1 AND id_empresa = $2',
    [t.nombre, t.id_empresa],
  );
  if (existe.length) return existe[0].id_tipo_equipo;
  const creado = await ds.query(
    `INSERT INTO tipo_equipo
       (id_empresa, nombre, categoria, marca, modelo, unidad_medida, garantia_dias,
        requiere_serie_individual, activo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
     RETURNING id_tipo_equipo`,
    [
      t.id_empresa,
      t.nombre,
      t.categoria,
      t.marca,
      t.modelo,
      t.unidad_medida,
      t.garantia_dias,
      t.requiere,
    ],
  );
  console.log(`  ✓ tipo "${t.nombre}" creado (empresa ${t.id_empresa})`);
  return creado[0].id_tipo_equipo;
}

async function asegurarProveedor(
  ds: DataSource,
  p: (typeof PROVEEDORES_DEMO)[number],
): Promise<number> {
  const existe = await ds.query(
    'SELECT id_proveedor FROM proveedor WHERE rut = $1',
    [p.rut],
  );
  let idProveedor: number;
  if (existe.length) {
    idProveedor = existe[0].id_proveedor;
  } else {
    const creado = await ds.query(
      `INSERT INTO proveedor (nombre_comercial, rut, nombre_contacto, telefono, email, activa)
       VALUES ($1, $2, $3, $4, $5, true) RETURNING id_proveedor`,
      [p.nombre_comercial, p.rut, p.nombre_contacto, p.telefono, p.email],
    );
    idProveedor = creado[0].id_proveedor;
    console.log(`  ✓ proveedor "${p.nombre_comercial}" creado (${p.rut})`);
  }

  for (const nombreTipo of p.tipos) {
    const tipo = await ds.query(
      'SELECT id_tipo_equipo FROM tipo_equipo WHERE nombre = $1 ORDER BY id_tipo_equipo LIMIT 1',
      [nombreTipo],
    );
    if (!tipo.length) continue;
    await ds.query(
      `INSERT INTO proveedor_tipo_equipo (id_proveedor, id_tipo_equipo)
       VALUES ($1, $2) ON CONFLICT (id_proveedor, id_tipo_equipo) DO NOTHING`,
      [idProveedor, tipo[0].id_tipo_equipo],
    );
  }
  return idProveedor;
}

async function asegurarUnidad(
  ds: DataSource,
  u: UnidadDemo,
): Promise<{ id: number; creada: boolean }> {
  const existe = await ds.query(
    'SELECT id_unidad FROM unidad_equipo WHERE numero_serie = $1',
    [u.serie],
  );
  if (existe.length) return { id: existe[0].id_unidad, creada: false };

  const tipo = await ds.query(
    'SELECT id_tipo_equipo FROM tipo_equipo WHERE nombre = $1 AND id_empresa = $2',
    [u.tipo, u.id_empresa],
  );
  if (!tipo.length) throw new Error(`Tipo ${u.tipo} no encontrado para ${u.serie}`);

  const bodegaId = u.bodega
    ? await idBodega(ds, u.bodega, u.id_empresa)
    : null;
  const tecnicoId = u.tecnico ? await idUsuario(ds, u.tecnico) : null;

  const creada = await ds.query(
    `INSERT INTO unidad_equipo
       (id_tipo_equipo, id_empresa, numero_serie, modelo, estado, fecha_adquisicion,
        fecha_venc_garantia, diagnostico_tecnico, id_bodega_actual, id_tecnico_asignado,
        mac_address, proveedor, observaciones, ubicacion_fisica, motivo_baja, motivo_baja_detalle)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING id_unidad`,
    [
      tipo[0].id_tipo_equipo,
      u.id_empresa,
      u.serie,
      null,
      u.estado,
      u.fecha_adquisicion ?? null,
      u.fecha_venc_garantia ?? null,
      u.diagnostico ?? null,
      u.estado === 'En bodega' ? bodegaId : null,
      u.estado === 'Asignado a técnico' ? tecnicoId : null,
      u.mac ?? null,
      u.proveedor ?? null,
      u.observaciones ?? null,
      u.estado === 'En bodega' ? (u.ubicacion ?? null) : null,
      u.motivo_baja ?? null,
      u.motivo_baja_detalle ?? null,
    ],
  );
  console.log(`  ✓ unidad ${u.serie} creada (${u.estado})`);
  return { id: creada[0].id_unidad, creada: true };
}

async function asegurarHistorial(
  ds: DataSource,
  h: {
    id_unidad: number;
    id_usuario: number;
    estado_anterior: string;
    estado_nuevo: string;
    motivo: string;
    fecha_hora: string;
  },
): Promise<void> {
  const existe = await ds.query(
    `SELECT id_historial FROM historial_estado_equipo
     WHERE id_unidad = $1 AND estado_nuevo = $2 AND fecha_hora = $3`,
    [h.id_unidad, h.estado_nuevo, h.fecha_hora],
  );
  if (existe.length) return;
  await ds.query(
    `INSERT INTO historial_estado_equipo
       (id_unidad, id_usuario, estado_anterior, estado_nuevo, motivo, fecha_hora)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      h.id_unidad,
      h.id_usuario,
      h.estado_anterior,
      h.estado_nuevo,
      h.motivo,
      h.fecha_hora,
    ],
  );
}

async function asegurarStock(
  ds: DataSource,
  idTipoEquipo: number,
  idBodegaDestino: number,
  cantidad: number,
  umbral: number,
): Promise<void> {
  const existe = await ds.query(
    'SELECT id_stock FROM stock_consumible WHERE id_tipo_equipo = $1 AND id_bodega = $2',
    [idTipoEquipo, idBodegaDestino],
  );
  if (existe.length) return;
  await ds.query(
    `INSERT INTO stock_consumible (id_tipo_equipo, id_bodega, cantidad_disponible, umbral_minimo)
     VALUES ($1, $2, $3, $4)`,
    [idTipoEquipo, idBodegaDestino, cantidad, umbral],
  );
}

async function sumarInventarioPersonal(
  ds: DataSource,
  idTecnico: number,
  idTipoEquipo: number,
  cantidad: number,
): Promise<void> {
  await ds.query(
    `INSERT INTO inventario_personal_tecnico (id_tecnico, id_tipo_equipo, cantidad)
     VALUES ($1, $2, $3)
     ON CONFLICT (id_tecnico, id_tipo_equipo)
     DO UPDATE SET cantidad = inventario_personal_tecnico.cantidad + EXCLUDED.cantidad,
                   fecha_actualizacion = now()`,
    [idTecnico, idTipoEquipo, cantidad],
  );
}

async function asegurarMovimiento(
  ds: DataSource,
  m: {
    id_tipo_equipo?: number | null;
    id_unidad?: number | null;
    id_empresa_origen?: number | null;
    id_empresa_destino?: number | null;
    id_bodega_origen?: number | null;
    id_bodega_destino?: number | null;
    id_usuario: number;
    tipo_movimiento: string;
    cantidad: number;
    fecha: string;
    referencia_id: number;
  },
): Promise<void> {
  const existe = await ds.query(
    `SELECT id_movimiento FROM movimiento_inventario
     WHERE tipo_movimiento = $1 AND referencia_id = $2
       AND COALESCE(id_unidad, -1) = COALESCE($3, -1)
       AND COALESCE(id_tipo_equipo, -1) = COALESCE($4, -1)`,
    [m.tipo_movimiento, m.referencia_id, m.id_unidad ?? null, m.id_tipo_equipo ?? null],
  );
  if (existe.length) return;
  await ds.query(
    `INSERT INTO movimiento_inventario
       (id_tipo_equipo, id_unidad, id_empresa_origen, id_empresa_destino,
        id_bodega_origen, id_bodega_destino, id_usuario, tipo_movimiento,
        cantidad, fecha, referencia_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      m.id_tipo_equipo ?? null,
      m.id_unidad ?? null,
      m.id_empresa_origen ?? null,
      m.id_empresa_destino ?? null,
      m.id_bodega_origen ?? null,
      m.id_bodega_destino ?? null,
      m.id_usuario,
      m.tipo_movimiento,
      m.cantidad,
      m.fecha,
      m.referencia_id,
    ],
  );
}

async function siguienteCorrelativo(
  ds: DataSource,
  tabla: string,
  columna: string,
  prefijo: string,
  largo: number,
): Promise<string> {
  const filas = await ds.query(
    `SELECT ${columna} AS ultimo FROM ${tabla}
     WHERE ${columna} IS NOT NULL
     ORDER BY ${columna} DESC LIMIT 1`,
  );
  const ultimo = filas.length
    ? Number(String(filas[0].ultimo).replace(prefijo, ''))
    : 0;
  return `${prefijo}${pad(ultimo + 1, largo)}`;
}

/**
 * Datos de demostración del Incremento 2. Todo se verifica antes de insertar,
 * por lo que puede ejecutarse en cada arranque sin duplicar registros.
 */
async function seedIncremento2(ds: DataSource) {
  console.log('→ Seed Incremento 2: datos de demostración...');

  // 1) Tipos de equipo (equipos + consumibles) por empresa
  const tipos: Record<string, number> = {};
  for (const t of TIPOS_DEMO) {
    tipos[`${t.id_empresa}:${t.nombre}`] = await asegurarTipo(ds, t);
  }

  // 2) Proveedores (CU-49/50/51)
  for (const p of PROVEEDORES_DEMO) {
    await asegurarProveedor(ds, p);
  }

  // 3) Unidades de equipo con estados y garantías variadas
  const bodegaFinet = await idBodega(ds, 'Bodega Finet Central', 1);
  const bodegaCable = await idBodega(ds, 'Bodega Cable Mágico Central', 2);
  const tecnicoQa = await idUsuario(ds, 'tecnico_qa');
  const tecnicoCable = await idUsuario(ds, 'tecnico_cable');
  const adminFinet = await idUsuario(ds, 'admin_finet');
  if (!bodegaFinet || !bodegaCable || !tecnicoQa || !tecnicoCable || !adminFinet) {
    throw new Error('Faltan bodegas o usuarios base para el seed de demostración');
  }

  const unidades: Record<string, number> = {};
  for (const u of UNIDADES_DEMO) {
    const { id, creada } = await asegurarUnidad(ds, u);
    unidades[u.serie] = id;
    if (!creada) continue;

    // Historial coherente con el estado sembrado
    const motivoBase = `Carga de datos de demostración (${u.estado}).`;
    if (u.estado === 'En revisión') {
      await asegurarHistorial(ds, {
        id_unidad: id,
        id_usuario: u.id_empresa === 2 ? tecnicoCable : tecnicoQa,
        estado_anterior: 'Asignado a técnico',
        estado_nuevo: 'En revisión',
        motivo: `Ingreso a taller técnico. Diagnóstico: ${u.diagnostico ?? 'Causa desconocida'}`,
        fecha_hora: u.serie === 'DEMO-ONT-0005' ? '2026-09-08 10:00:00-03' : '2026-09-12 09:00:00-03',
      });
    }
    if (u.estado === 'Dado de baja') {
      await asegurarHistorial(ds, {
        id_unidad: id,
        id_usuario: adminFinet,
        estado_anterior: 'En bodega',
        estado_nuevo: 'Dado de baja',
        motivo: `Baja definitiva. Motivo: ${u.motivo_baja ?? 'Otro'}`,
        fecha_hora: '2026-09-06 12:00:00-03',
      });
    }
    if (u.estado === 'Instalado en cliente') {
      await asegurarHistorial(ds, {
        id_unidad: id,
        id_usuario: tecnicoQa,
        estado_anterior: 'Asignado a técnico',
        estado_nuevo: 'Instalado en cliente',
        motivo: motivoBase,
        fecha_hora: '2026-09-04 11:30:00-03',
      });
    }
  }

  // 4) Stock de consumibles por bodega (CU-45/46/62/85)
  await asegurarStock(ds, tipos['1:Fibra drop QA'], bodegaFinet, 450.5, 100);
  await asegurarStock(ds, tipos['1:Conector SC/APC QA'], bodegaFinet, 5, 20);
  await asegurarStock(ds, tipos['1:Cable UTP Cat6 QA'], bodegaFinet, 320, 50);
  await asegurarStock(ds, tipos['2:Fibra drop Cable QA'], bodegaCable, 210, 50);
  await asegurarStock(ds, tipos['2:Conector SC/APC Cable QA'], bodegaCable, 140, 30);

  // 5) Órdenes de ingreso en los 3 estados (CU-52..56)
  const ordenesDemo = [
    {
      documento: 'FAC-DEMO-01',
      id_proveedor: (await ds.query(
        "SELECT id_proveedor FROM proveedor WHERE nombre_comercial = 'Distribuidora Andina SpA'",
      ))[0]?.id_proveedor,
      id_empresa: 1,
      id_bodega: bodegaFinet,
      fecha_documento: fechaISO(-2),
      items: [
        { tipo: 'ONT QA Finet', esperada: 4, recibida: 0, garantia: 365 },
        { tipo: 'Router Wi-Fi QA', esperada: 3, recibida: 0, garantia: 365 },
      ],
    },
    {
      documento: 'FAC-DEMO-02',
      id_proveedor: (await ds.query(
        "SELECT id_proveedor FROM proveedor WHERE nombre_comercial = 'TecnoRed Chile Ltda.'",
      ))[0]?.id_proveedor,
      id_empresa: 1,
      id_bodega: bodegaFinet,
      fecha_documento: fechaISO(-6),
      items: [
        { tipo: 'Switch 8 puertos QA', esperada: 4, recibida: 2, garantia: 730 },
        { tipo: 'Decodificador TV QA', esperada: 3, recibida: 3, garantia: 365 },
      ],
    },
    {
      documento: 'FAC-DEMO-03',
      id_proveedor: (await ds.query(
        "SELECT id_proveedor FROM proveedor WHERE nombre_comercial = 'Importadora Pacífico SpA'",
      ))[0]?.id_proveedor,
      id_empresa: 1,
      id_bodega: bodegaFinet,
      fecha_documento: fechaISO(-20),
      items: [
        { tipo: 'Router Wi-Fi QA', esperada: 2, recibida: 2, garantia: 365 },
        { tipo: 'Conector SC/APC QA', esperada: 100, recibida: 100, garantia: 0 },
      ],
    },
    {
      documento: 'FAC-DEMO-04',
      id_proveedor: (await ds.query(
        "SELECT id_proveedor FROM proveedor WHERE nombre_comercial = 'Distribuidora Andina SpA'",
      ))[0]?.id_proveedor,
      id_empresa: 2,
      id_bodega: bodegaCable,
      fecha_documento: fechaISO(-8),
      items: [
        { tipo: 'ONT QA Cable Mágico', esperada: 2, recibida: 2, garantia: 365 },
        { tipo: 'Fibra drop Cable QA', esperada: 200, recibida: 200, garantia: 0 },
      ],
    },
  ];

  const estadoDeOrden = (items: { esperada: number; recibida: number }[]) => {
    const completo = items.every((i) => i.recibida >= i.esperada);
    if (completo) return 'Completada';
    return items.some((i) => i.recibida > 0) ? 'Recepción parcial' : 'Pendiente de recepción';
  };

  for (const o of ordenesDemo) {
    const existe = await ds.query(
      'SELECT id_orden FROM orden_ingreso WHERE numero_documento = $1',
      [o.documento],
    );
    if (existe.length) continue;
    const correlativo = await siguienteCorrelativo(
      ds,
      'orden_ingreso',
      'correlativo',
      'OI-',
      4,
    );
    const estado = estadoDeOrden(o.items);
    const creada = await ds.query(
      `INSERT INTO orden_ingreso
         (correlativo, id_proveedor, numero_documento, fecha_documento,
          id_empresa_destino, id_bodega_destino, estado, id_usuario_registro)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id_orden`,
      [
        correlativo,
        o.id_proveedor,
        o.documento,
        o.fecha_documento,
        o.id_empresa,
        o.id_bodega,
        estado,
        adminFinet,
      ],
    );
    const idOrden = creada[0].id_orden;
    for (const item of o.items) {
      const idTipo = tipos[`${o.id_empresa}:${item.tipo}`];
      if (!idTipo) continue;
      await ds.query(
        `INSERT INTO orden_ingreso_detalle
           (id_orden, id_tipo_equipo, cantidad_esperada, garantia_dias, cantidad_recibida)
         VALUES ($1, $2, $3, $4, $5)`,
        [idOrden, idTipo, item.esperada, item.garantia, item.recibida],
      );
      if (item.recibida > 0) {
        await asegurarMovimiento(ds, {
          id_tipo_equipo: idTipo,
          id_empresa_destino: o.id_empresa,
          id_bodega_destino: o.id_bodega,
          id_usuario: adminFinet,
          tipo_movimiento: 'INGRESO_RECEPCION',
          cantidad: item.recibida,
          fecha: `${o.fecha_documento} 10:00:00-03`,
          referencia_id: idOrden,
        });
      }
    }
    console.log(`  ✓ orden ${correlativo} (${o.documento}, ${estado}) creada`);
  }

  // 6) Salidas de bodega a técnico (CU-57/58/59/60/62) con movimientos e inventario
  const salidasDemo = [
    {
      id_tecnico: tecnicoQa,
      id_bodega: bodegaFinet,
      id_empresa: 1,
      fecha_hora: '2026-09-10 09:30:00-03',
      unidades: ['DEMO-DEC-0001', 'DEMO-ONT-0004'],
      consumibles: [
        { tipo: 'Fibra drop QA', cantidad: 25 },
        { tipo: 'Conector SC/APC QA', cantidad: 12 },
      ],
    },
    {
      id_tecnico: tecnicoQa,
      id_bodega: bodegaFinet,
      id_empresa: 1,
      fecha_hora: '2026-09-12 15:10:00-03',
      unidades: [],
      consumibles: [
        { tipo: 'Cable UTP Cat6 QA', cantidad: 60 },
        { tipo: 'Conector SC/APC QA', cantidad: 8 },
      ],
    },
    {
      id_tecnico: tecnicoCable,
      id_bodega: bodegaCable,
      id_empresa: 2,
      fecha_hora: '2026-09-11 11:00:00-03',
      unidades: ['DEMO-C-RTR-0001'],
      consumibles: [{ tipo: 'Fibra drop Cable QA', cantidad: 40 }],
    },
  ];

  for (const s of salidasDemo) {
    const existe = await ds.query(
      'SELECT id_salida FROM salida_bodega WHERE id_tecnico = $1 AND fecha_hora = $2',
      [s.id_tecnico, s.fecha_hora],
    );
    if (existe.length) continue;

    const salida = await ds.query(
      `INSERT INTO salida_bodega (id_tecnico, id_bodega_origen, fecha_hora, id_empresa, id_usuario_registro)
       VALUES ($1, $2, $3, $4, $5) RETURNING id_salida`,
      [s.id_tecnico, s.id_bodega, s.fecha_hora, s.id_empresa, adminFinet],
    );
    const idSalida = salida[0].id_salida;

    for (const serie of s.unidades) {
      const idUnidad = unidades[serie];
      const tipoUnidad = UNIDADES_DEMO.find((u) => u.serie === serie);
      const idTipo = tipoUnidad ? tipos[`${tipoUnidad.id_empresa}:${tipoUnidad.tipo}`] : null;
      if (!idUnidad) continue;
      await ds.query(
        `UPDATE unidad_equipo
         SET estado = 'Asignado a técnico', id_tecnico_asignado = $1,
             id_bodega_actual = NULL, ubicacion_fisica = NULL
         WHERE id_unidad = $2`,
        [s.id_tecnico, idUnidad],
      );
      await ds.query(
        `INSERT INTO salida_detalle (id_salida, id_tipo_equipo, id_unidad) VALUES ($1, $2, $3)`,
        [idSalida, idTipo, idUnidad],
      );
      await asegurarHistorial(ds, {
        id_unidad: idUnidad,
        id_usuario: adminFinet,
        estado_anterior: 'En bodega',
        estado_nuevo: 'Asignado a técnico',
        motivo: `Salida de bodega a técnico. Salida #${idSalida}.`,
        fecha_hora: s.fecha_hora,
      });
      await asegurarMovimiento(ds, {
        id_tipo_equipo: idTipo,
        id_unidad: idUnidad,
        id_empresa_origen: s.id_empresa,
        id_bodega_origen: s.id_bodega,
        id_usuario: adminFinet,
        tipo_movimiento: 'SALIDA_A_TECNICO',
        cantidad: 1,
        fecha: s.fecha_hora,
        referencia_id: idSalida,
      });
    }

    for (const c of s.consumibles) {
      const idTipo = tipos[`${s.id_empresa}:${c.tipo}`];
      if (!idTipo) continue;
      await ds.query(
        `INSERT INTO salida_detalle (id_salida, id_tipo_equipo, cantidad) VALUES ($1, $2, $3)`,
        [idSalida, idTipo, c.cantidad],
      );
      await sumarInventarioPersonal(ds, s.id_tecnico, idTipo, c.cantidad);
      await asegurarMovimiento(ds, {
        id_tipo_equipo: idTipo,
        id_empresa_origen: s.id_empresa,
        id_bodega_origen: s.id_bodega,
        id_usuario: adminFinet,
        tipo_movimiento: 'SALIDA_A_TECNICO',
        cantidad: c.cantidad,
        fecha: s.fecha_hora,
        referencia_id: idSalida,
      });
    }
    console.log(`  ✓ salida #${idSalida} creada (técnico ${s.id_tecnico})`);
  }

  // 7) Préstamos externos (CU-81..84): activo, vencido, cerrado y reparación externa
  const prestamosDemo: PrestamoDemo[] = [
    {
      tipo: 'PRESTAMO_EXTERNO',
      receptor: 'Constructora Andes Ltda.',
      rut: rutDemo('96567890'),
      id_empresa: 1,
      id_bodega: bodegaFinet,
      fecha_salida: '2026-09-09 10:00:00-03',
      fecha_retorno: fechaISO(4),
      estado: 'ACTIVO',
      detalle: 'Préstamo de equipos y fibra para faena en terreno.',
      unidades: ['DEMO-ONT-0009', 'DEMO-RTR-0008'],
      consumibles: [{ tipo: 'Fibra drop QA', cantidad: 15 }],
    },
    {
      tipo: 'PRESTAMO_EXTERNO',
      receptor: 'Municipalidad de Providencia',
      rut: rutDemo('69123456'),
      id_empresa: 1,
      id_bodega: bodegaFinet,
      fecha_salida: '2026-08-20 09:00:00-03',
      fecha_retorno: fechaISO(-3),
      estado: 'ACTIVO',
      detalle: 'Préstamo vencido para demostración (días restantes negativos).',
      unidades: [],
      consumibles: [{ tipo: 'Fibra drop QA', cantidad: 20 }],
    },
    {
      tipo: 'PRESTAMO_EXTERNO',
      receptor: 'Servicio Técnico Electronorte Ltda.',
      rut: rutDemo('77456789'),
      id_empresa: 1,
      id_bodega: bodegaFinet,
      fecha_salida: '2026-08-01 12:00:00-03',
      fecha_retorno: fechaISO(-25),
      estado: 'CERRADO',
      detalle: 'Préstamo cerrado con devolución completa de conectores.',
      unidades: [],
      consumibles: [{ tipo: 'Conector SC/APC QA', cantidad: 10 }],
      retorno: {
        cantidad: 10,
        fecha_retorno: '2026-08-19 16:00:00-03',
        observacion: 'Devolución completa en bodega; empaque original.',
      },
    },
  ];

  for (const p of prestamosDemo) {
    const existe = await ds.query(
      'SELECT id_prestamo FROM prestamo_externo WHERE nombre_receptor = $1 AND tipo = $2',
      [p.receptor, p.tipo],
    );    if (existe.length) continue;
    const correlativo = await siguienteCorrelativo(
      ds,
      'prestamo_externo',
      'correlativo',
      'PE-',
      5,
    );
    const creado = await ds.query(
      `INSERT INTO prestamo_externo
         (tipo, id_empresa, id_unidad, nombre_receptor, rut_receptor, fecha_salida,
          fecha_retorno_estimada, fecha_retorno_real, detalle, estado, id_usuario_registro,
          correlativo, id_bodega_origen)
       VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id_prestamo`,
      [
        p.tipo,
        p.id_empresa,
        p.receptor,
        p.rut,
        p.fecha_salida,
        p.fecha_retorno,
        p.estado === 'CERRADO' ? p.retorno?.fecha_retorno ?? null : null,
        p.detalle,
        p.estado,
        adminFinet,
        correlativo,
        p.id_bodega,
      ],
    );
    const idPrestamo = creado[0].id_prestamo;

    for (const serie of p.unidades) {
      const idUnidad = unidades[serie];
      const tipoUnidad = UNIDADES_DEMO.find((u) => u.serie === serie);
      const idTipo = tipoUnidad ? tipos[`${tipoUnidad.id_empresa}:${tipoUnidad.tipo}`] : null;
      if (!idUnidad) continue;
      await ds.query(
        `INSERT INTO prestamo_detalle (id_prestamo, id_unidad, id_tipo_equipo, cantidad, cantidad_retornada)
         VALUES ($1, $2, $3, 1, 0)`,
        [idPrestamo, idUnidad, idTipo],
      );
      await ds.query(
        `UPDATE unidad_equipo SET estado = 'En préstamo externo', id_bodega_actual = NULL WHERE id_unidad = $1`,
        [idUnidad],
      );
      await asegurarHistorial(ds, {
        id_unidad: idUnidad,
        id_usuario: adminFinet,
        estado_anterior: 'En bodega',
        estado_nuevo: 'En préstamo externo',
        motivo: `Préstamo externo ${correlativo} a ${p.receptor}.`,
        fecha_hora: p.fecha_salida,
      });
      await asegurarMovimiento(ds, {
        id_tipo_equipo: idTipo,
        id_unidad: idUnidad,
        id_empresa_origen: p.id_empresa,
        id_bodega_origen: p.id_bodega,
        id_usuario: adminFinet,
        tipo_movimiento: 'PRESTAMO_EXTERNO',
        cantidad: 1,
        fecha: p.fecha_salida,
        referencia_id: idPrestamo,
      });
    }

    for (const c of p.consumibles) {
      const idTipo = tipos[`${p.id_empresa}:${c.tipo}`];
      if (!idTipo) continue;
      const retornada = p.retorno ? Number(p.retorno.cantidad) : 0;
      const detallePrestamo = await ds.query(
        `INSERT INTO prestamo_detalle (id_prestamo, id_unidad, id_tipo_equipo, cantidad, cantidad_retornada)
         VALUES ($1, NULL, $2, $3, $4) RETURNING id_detalle`,
        [idPrestamo, idTipo, c.cantidad, retornada],
      );
      await asegurarMovimiento(ds, {
        id_tipo_equipo: idTipo,
        id_empresa_origen: p.id_empresa,
        id_bodega_origen: p.id_bodega,
        id_usuario: adminFinet,
        tipo_movimiento: 'PRESTAMO_EXTERNO',
        cantidad: c.cantidad,
        fecha: p.fecha_salida,
        referencia_id: idPrestamo,
      });
      if (p.retorno && retornada > 0) {
        await ds.query(
          `INSERT INTO prestamo_retorno (id_detalle, cantidad, fecha_retorno, observacion, id_usuario)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            detallePrestamo[0].id_detalle,
            retornada,
            p.retorno.fecha_retorno,
            p.retorno.observacion,
            adminFinet,
          ],
        );
      }
    }
    console.log(`  ✓ préstamo ${correlativo} (${p.receptor}, ${p.estado}) creado`);
  }

  // Reparación externa directa (CU-75/76) sobre una unidad ya "En préstamo externo"
  const reparacionExiste = await ds.query(
    `SELECT id_prestamo FROM prestamo_externo
     WHERE tipo = 'REPARACION_EXTERNA' AND nombre_receptor = 'Servicio Técnico Electronorte Ltda.'`,
  );
  if (!reparacionExiste.length && unidades['DEMO-DEC-0003']) {
    const creado = await ds.query(
      `INSERT INTO prestamo_externo
         (tipo, id_empresa, id_unidad, nombre_receptor, rut_receptor, fecha_salida,
          fecha_retorno_estimada, detalle, estado, id_usuario_registro)
       VALUES ('REPARACION_EXTERNA', 1, $1, 'Servicio Técnico Electronorte Ltda.', $2,
               '2026-09-07 14:00:00-03', $3, 'Falla en puerto HDMI; diagnóstico en banco.',
               'ACTIVO', $4)
       RETURNING id_prestamo`,
      [unidades['DEMO-DEC-0003'], rutDemo('77456789'), fechaISO(10), adminFinet],
    );
    await asegurarHistorial(ds, {
      id_unidad: unidades['DEMO-DEC-0003'],
      id_usuario: adminFinet,
      estado_anterior: 'En revisión',
      estado_nuevo: 'En préstamo externo',
      motivo: 'Envío a reparación externa. Receptor: Servicio Técnico Electronorte Ltda.',
      fecha_hora: '2026-09-07 14:00:00-03',
    });
    await asegurarMovimiento(ds, {
      id_tipo_equipo: tipos['1:Decodificador TV QA'],
      id_unidad: unidades['DEMO-DEC-0003'],
      id_empresa_origen: 1,
      id_bodega_origen: bodegaFinet,
      id_usuario: adminFinet,
      tipo_movimiento: 'PRESTAMO_EXTERNO',
      cantidad: 1,
      fecha: '2026-09-07 14:00:00-03',
      referencia_id: creado[0].id_prestamo,
    });
    console.log('  ✓ reparación externa de DEMO-DEC-0003 creada');
  }

  // 8) Solicitudes de baja en los 3 estados (CU-78)
  const solicitudesDemo = [
    {
      serie: 'DEMO-ONT-0002',
      motivo: 'Falla irreparable',
      estado: 'Pendiente de aprobación',
      solicitante: tecnicoQa,
      aprobador: null,
      fecha_solicitud: '2026-09-12 10:15:00-03',
      fecha_resolucion: null,
      motivo_rechazo: null,
    },
    {
      serie: 'DEMO-RTR-0005',
      motivo: 'Falla irreparable',
      estado: 'Aprobada',
      solicitante: tecnicoQa,
      aprobador: adminFinet,
      fecha_solicitud: '2026-09-05 09:00:00-03',
      fecha_resolucion: '2026-09-05 15:30:00-03',
      motivo_rechazo: null,
    },
    {
      serie: 'DEMO-SWT-0001',
      motivo: 'Obsolescencia',
      estado: 'Rechazada',
      solicitante: tecnicoQa,
      aprobador: adminFinet,
      fecha_solicitud: '2026-09-04 08:45:00-03',
      fecha_resolucion: '2026-09-04 17:10:00-03',
      motivo_rechazo: 'El equipo aún está operativo; se mantiene en bodega.',
    },
  ];

  for (const s of solicitudesDemo) {
    const idUnidad = unidades[s.serie];
    if (!idUnidad) continue;
    const existe = await ds.query(
      'SELECT id_solicitud FROM solicitud_baja WHERE id_unidad = $1 AND motivo = $2',
      [idUnidad, s.motivo],
    );
    if (existe.length) continue;
    await ds.query(
      `INSERT INTO solicitud_baja
         (id_unidad, id_empresa, id_usuario_solicitante, motivo, estado,
          id_usuario_aprobador, fecha_solicitud, fecha_resolucion, motivo_rechazo)
       VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        idUnidad,
        s.solicitante,
        s.motivo,
        s.estado,
        s.aprobador,
        s.fecha_solicitud,
        s.fecha_resolucion,
        s.motivo_rechazo,
      ],
    );
    console.log(`  ✓ solicitud de baja de ${s.serie} (${s.estado}) creada`);
  }

  // 9) Donación registrada (CU-80) + candidatas pendientes de donar
  const donacionExiste = await ds.query(
    "SELECT id_donacion FROM donacion WHERE numero_resolucion = 'RES-2026-014'",
  );
  if (!donacionExiste.length) {
    const donacion = await ds.query(
      `INSERT INTO donacion
         (nombre_institucion, rut_institucion, fecha_donacion, numero_resolucion,
          id_usuario, id_empresa)
       VALUES ('Fundación Conecta Chile', $1, $2, 'RES-2026-014', $3, 1)
       RETURNING id_donacion`,
      [rutDemo('65123456'), fechaISO(-3), adminFinet],
    );
    for (const serie of ['DEMO-RTR-0006', 'DEMO-RTR-0007']) {
      if (!unidades[serie]) continue;
      await ds.query(
        'INSERT INTO donacion_detalle (id_donacion, id_unidad) VALUES ($1, $2)',
        [donacion[0].id_donacion, unidades[serie]],
      );
    }
    console.log('  ✓ donación RES-2026-014 creada (Fundación Conecta Chile)');
  }

  // 10) Transferencia aprobada entre empresas (para el reporte de movimientos CU-86)
  const transferenciaExiste = await ds.query(
    "SELECT id_transferencia FROM transferencia_equipo WHERE observaciones = 'TRANSFERENCIA-DEMO-01'",
  );
  if (!transferenciaExiste.length) {
    const idTipo = tipos['1:Conector SC/APC QA'];
    const transferencia = await ds.query(
      `INSERT INTO transferencia_equipo
         (id_empresa_origen, id_empresa_destino, id_usuario_registro, fecha_transferencia, observaciones)
       VALUES (1, 2, $1, $2, 'TRANSFERENCIA-DEMO-01') RETURNING id_transferencia`,
      [adminFinet, fechaISO(-12)],
    );
    const idTransferencia = transferencia[0].id_transferencia;
    await asegurarMovimiento(ds, {
      id_tipo_equipo: idTipo,
      id_empresa_origen: 1,
      id_empresa_destino: 2,
      id_bodega_origen: bodegaFinet,
      id_bodega_destino: bodegaCable,
      id_usuario: adminFinet,
      tipo_movimiento: 'TRANSFERENCIA_APROBADA',
      cantidad: 10,
      fecha: `${fechaISO(-12)} 10:00:00-03`,
      referencia_id: idTransferencia,
    });
    console.log('  ✓ transferencia aprobada TRANSFERENCIA-DEMO-01 creada');
  }

  console.log('✓ Seed Incremento 2 completado.');
}

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

  // Incremento 2: datos de demostración (proveedores, órdenes, salidas,
  // revisión/reparación, bajas, donaciones, préstamos y movimientos)
  await seedIncremento2(ds);

  // CU-87: asegurar unidades de equipo instaladas con datos canónicos de CU-64
  const UNIDADES_INSTALADAS_QA = [
    {
      numero_serie: 'HW-ONT-99001',
      tipo: 'ONT QA Finet',
      modelo: 'HG8245H',
      estado: 'Instalado en cliente',
      srv: 'SRV-2026-00101',
      cliente_rut: '12345678-5',
      cliente_nombre: 'Juan Pérez González',
      direccion_instalacion: 'Av. Libertador Bernardo O Higgins 1234, Depto 402',
      comuna_instalacion: 'Santiago',
      fecha_instalacion: '2026-03-15',
      tecnico_usuario: 'tecnico_qa',
      id_empresa: 1,
      id_ot: 101,
    },
    {
      numero_serie: 'HW-ONT-99002',
      tipo: 'ONT QA Finet',
      modelo: 'HG8245H',
      estado: 'Instalado en cliente',
      srv: 'SRV-2026-00102',
      cliente_rut: '98765432-1',
      cliente_nombre: 'María José López Rodríguez',
      direccion_instalacion: 'Calle Los Alerces 567',
      comuna_instalacion: 'Providencia',
      fecha_instalacion: '2026-03-20',
      tecnico_usuario: 'tecnico_qa',
      id_empresa: 1,
      id_ot: 102,
    },
    {
      numero_serie: 'HW-ONT-99003',
      tipo: 'ONT QA Cable Mágico',
      modelo: 'HG8245H',
      estado: 'Instalado en cliente',
      srv: 'SRV-2026-00103',
      cliente_rut: '11223344-K',
      cliente_nombre: 'Carlos Muñoz Valenzuela',
      direccion_instalacion: 'Pasaje Las Flores 89',
      comuna_instalacion: 'Maipú',
      fecha_instalacion: '2026-03-22',
      tecnico_usuario: 'tecnico_cable',
      id_empresa: 2,
      id_ot: 103,
    },
  ];

  for (const u of UNIDADES_INSTALADAS_QA) {
    const tipo = await ds.query(
      'SELECT id_tipo_equipo FROM tipo_equipo WHERE nombre = $1 AND id_empresa = $2',
      [u.tipo, u.id_empresa],
    );
    const idTipo = tipo.length ? tipo[0].id_tipo_equipo : null;
    if (!idTipo) continue;

    const tecnicoRow = await ds.query(
      'SELECT id_usuario FROM usuario WHERE nombre_usuario = $1',
      [u.tecnico_usuario],
    );
    const idTecnico = tecnicoRow.length ? tecnicoRow[0].id_usuario : null;

    let idUnidad: number;
    const existe = await ds.query(
      'SELECT id_unidad FROM unidad_equipo WHERE numero_serie = $1',
      [u.numero_serie],
    );
    if (!existe.length) {
      const ins = await ds.query(
        `INSERT INTO unidad_equipo (
          id_tipo_equipo, id_empresa, numero_serie, modelo, estado,
          srv, cliente_rut, cliente_nombre, direccion_instalacion, comuna_instalacion,
          fecha_adquisicion, fecha_venc_garantia, proveedor
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '2026-01-10', '2027-01-10', 'Proveedor QA')
        RETURNING id_unidad`,
        [
          idTipo,
          u.id_empresa,
          u.numero_serie,
          u.modelo,
          u.estado,
          u.srv,
          u.cliente_rut,
          u.cliente_nombre,
          u.direccion_instalacion,
          u.comuna_instalacion,
        ],
      );
      idUnidad = ins[0].id_unidad;
      console.log(`✓ unidad instalada ${u.numero_serie} creada (cliente: ${u.cliente_nombre})`);
    } else {
      idUnidad = existe[0].id_unidad;
      await ds.query(
        `UPDATE unidad_equipo SET
          srv = $1, cliente_rut = $2, cliente_nombre = $3,
          direccion_instalacion = $4, comuna_instalacion = $5, estado = $6
         WHERE id_unidad = $7`,
        [u.srv, u.cliente_rut, u.cliente_nombre, u.direccion_instalacion, u.comuna_instalacion, u.estado, idUnidad],
      );
    }

    const existeHist = await ds.query(
      `SELECT id_historial FROM historial_estado_equipo
       WHERE id_unidad = $1 AND estado_nuevo = 'Instalado en cliente'`,
      [idUnidad],
    );
    if (!existeHist.length) {
      await ds.query(
        `INSERT INTO historial_estado_equipo (id_unidad, id_usuario, estado_anterior, estado_nuevo, motivo, fecha_hora)
         VALUES ($1, $2, 'Asignado a técnico', 'Instalado en cliente', 'Instalación en domicilio de cliente', $3::timestamptz)`,
        [idUnidad, idTecnico, `${u.fecha_instalacion} 11:00:00-03`],
      );
    }

    const existeCierre = await ds.query(
      'SELECT id_cierre FROM integracion_cierre WHERE srv = $1',
      [u.srv],
    );
    if (!existeCierre.length) {
      await ds.query(
        `INSERT INTO integracion_cierre (
          clave_idempotencia, id_ot, id_empresa, tipo_ot, srv, id_tecnico,
          estado_proceso, fecha_proceso, payload
        ) VALUES ($1, $2, $3, 'INSTALACION', $4, $5, 'PROCESADO', $6::timestamptz, $7::jsonb)`,
        [
          `CU87-SEED-${u.srv}`,
          u.id_ot,
          u.id_empresa,
          u.srv,
          idTecnico,
          `${u.fecha_instalacion} 11:00:00-03`,
          JSON.stringify({
            id_ot: u.id_ot,
            id_tecnico: idTecnico,
            cliente: { rut: u.cliente_rut, nombre: u.cliente_nombre },
            direccion: { direccion: u.direccion_instalacion, comuna: u.comuna_instalacion },
          }),
        ],
      );
    }
  }
  await ds.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
