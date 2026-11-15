// Simulador de sistemas externos para la demo local (sin dependencias).
// - Hace de API de G3 (Terreno/FSM) para las consultas salientes de nuestro backend:
//   /g3/clientes, /g3/clientes/rut/:rut, /g3/ordenes, /g3/ordenes/:id.
// - Desde el panel (http://localhost:8091) dispara los eventos entrantes de G3 y G8
//   hacia /api/integraciones/... con API keys de desarrollo.
// - Registra todo en un log visible en el panel.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 3100);
const BACKEND = (process.env.BACKEND_URL || 'http://backend:3003/api').replace(/\/+$/, '');
const KEY_G3 = process.env.KEY_G3_A_G1 || 'g3-dev-key';      // G3 → G1
const KEY_G8 = process.env.KEY_G8_A_G1 || 'g8-dev-key';      // G8 → G1
const KEY_G1 = process.env.KEY_G1_A_G3 || 'g1-a-g3-dev-key'; // G1 → G3 (lo valida este simulador)
const TEC = { tecnico_qa: 4, tecnico_cable: 5 };             // ids del seed QA

const hoy = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10); // fecha de Chile
const ahora = () => new Date().toISOString();
const diasAtras = (n) => new Date(Date.now() - n * 864e5).toISOString();

// ---------------- datos de G3 (coherentes con el seed QA) ----------------
const clientes = [
  { id_cliente: 1, id_empresa: 1, rut: '12345678-5', nombre_completo: 'Juan Pérez González', telefono: '+56911112222', direcciones: [{ direccion: 'Pasaje Los Aromos 455', comuna: 'La Pintana', referencia: 'Casa esquina, reja verde' }] },
  { id_cliente: 2, id_empresa: 1, rut: '98765432-1', nombre_completo: 'María José López Rodríguez', telefono: '+56933334444', direcciones: [{ direccion: 'Av. Santa Rosa 12980', comuna: 'La Pintana', referencia: 'Depto 304' }] },
  { id_cliente: 3, id_empresa: 2, rut: '11223344-K', nombre_completo: 'Carlos Muñoz Valenzuela', telefono: '+56955556666', direcciones: [{ direccion: 'Calle Costanera 120', comuna: 'Cartagena', referencia: 'Frente a la plaza' }] },
  { id_cliente: 4, id_empresa: 1, rut: '15678912-7', nombre_completo: 'Ana Torres Fuentes', telefono: '+56977778888', direcciones: [{ direccion: 'Los Copihues 1020', comuna: 'Puente Alto', referencia: 'Casa interior' }] },
  { id_cliente: 5, id_empresa: 2, rut: '17456321-7', nombre_completo: 'Roberto Díaz Saavedra', telefono: '+56999990000', direcciones: [{ direccion: 'Av. Del Mar 845', comuna: 'San Antonio', referencia: 'Local comercial' }] },
];
const cli = (id) => clientes.find((c) => c.id_cliente === id);
const ot = (o) => {
  const c = cli(o.id_cliente);
  return { ...o, cliente: { id_cliente: c.id_cliente, rut: c.rut, nombre_completo: c.nombre_completo, telefono: c.telefono }, direccion: { direccion_completa: c.direcciones[0].direccion, comuna: c.direcciones[0].comuna, referencia: c.direcciones[0].referencia } };
};
const ordenes = [
  { id_ot: 7001, id_empresa: 1, id_tecnico: TEC.tecnico_qa, tipo_ot: 'INSTALACION', estado: 'EN_CURSO', prioridad: 'ALTA', id_cliente: 4, observaciones: 'Instalación fibra 600 Mbps + TV', materiales: [] },
  { id_ot: 7002, id_empresa: 1, id_tecnico: TEC.tecnico_qa, tipo_ot: 'REPARACION', estado: 'PENDIENTE', prioridad: 'MEDIA', id_cliente: 1, observaciones: 'Cliente reporta sin señal (LOS en rojo)', materiales: [] },
  { id_ot: 7003, id_empresa: 1, id_tecnico: TEC.tecnico_qa, tipo_ot: 'RETIRO', estado: 'PENDIENTE', prioridad: 'BAJA', id_cliente: 2, observaciones: 'Retiro de equipos por morosidad (solicitud G8 MOR-2026-0001)', materiales: [] },
  { id_ot: 7101, id_empresa: 2, id_tecnico: TEC.tecnico_cable, tipo_ot: 'INSTALACION', estado: 'EN_CURSO', prioridad: 'ALTA', id_cliente: 5, observaciones: 'Instalación plan hogar 400 Mbps', materiales: [] },
  // Cerradas (CU-90 productividad y consumo): coinciden con los cierres 101-103 del seed
  { id_ot: 101, id_empresa: 1, id_tecnico: TEC.tecnico_qa, tipo_ot: 'INSTALACION', estado: 'CERRADA', fecha_completada: diasAtras(9), id_cliente: 1, materiales: [{ nombre: 'Fibra drop QA', cantidad: 20, unidad_medida: 'Metro' }, { nombre: 'Conector SC/APC QA', cantidad: 2, unidad_medida: 'Unidad' }] },
  { id_ot: 102, id_empresa: 1, id_tecnico: TEC.tecnico_qa, tipo_ot: 'INSTALACION', estado: 'CERRADA', fecha_completada: diasAtras(6), id_cliente: 2, materiales: [{ nombre: 'Fibra drop QA', cantidad: 35, unidad_medida: 'Metro' }, { nombre: 'Conector SC/APC QA', cantidad: 2, unidad_medida: 'Unidad' }] },
  { id_ot: 103, id_empresa: 2, id_tecnico: TEC.tecnico_cable, tipo_ot: 'INSTALACION', estado: 'CERRADA', fecha_completada: diasAtras(3), id_cliente: 3, materiales: [{ nombre: 'Fibra drop Cable QA', cantidad: 25, unidad_medida: 'Metro' }] },
];
const conFecha = (o) => ({ ...ot(o), fecha_programada: o.fecha_programada || `${hoy()}T12:00:00.000Z` });

// ---------------- log ----------------
const log = [];
function registrar(entrada) {
  log.unshift({ id: log.length + 1, ts: ahora(), ...entrada });
  if (log.length > 200) log.pop();
}

// ---------------- llamadas a nuestro backend (G3/G8 → G1) ----------------
async function llamar(origen, metodo, ruta, cuerpo) {
  const key = origen === 'G8' ? KEY_G8 : KEY_G3;
  const url = `${BACKEND}/integraciones${ruta}`;
  const t0 = Date.now();
  let status = 0, respuesta;
  try {
    const r = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json', 'X-API-KEY': key }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
    status = r.status;
    const txt = await r.text();
    try { respuesta = JSON.parse(txt); } catch { respuesta = txt; }
  } catch (e) { respuesta = { error: String(e.message || e) }; }
  const paso = { direccion: `${origen} → G1`, metodo, ruta: `/api/integraciones${ruta}`, cabecera: `X-API-KEY: ${key}`, status, ms: Date.now() - t0, peticion: cuerpo || null, respuesta };
  registrar(paso);
  return paso;
}
let tiposCache = {};
async function idTipo(idEmpresa, nombre) {
  if (!tiposCache[idEmpresa]) {
    const r = await fetch(`${BACKEND}/integraciones/tipos-equipo?id_empresa=${idEmpresa}`, { headers: { 'X-API-KEY': KEY_G3 } }).then((x) => x.json()).catch(() => null);
    const lista = Array.isArray(r) ? r : r?.data || [];
    tiposCache[idEmpresa] = Object.fromEntries(lista.map((t) => [t.nombre, t.id_tipo_equipo]));
  }
  return tiposCache[idEmpresa][nombre];
}
function cerrarOt(idOt, materiales) {
  const o = ordenes.find((x) => x.id_ot === idOt);
  if (o) { o.estado = 'CERRADA'; o.fecha_completada = ahora(); o.materiales = materiales || []; }
}
function cierreBase(o, extra) {
  const c = cli(o.id_cliente);
  return {
    clave_idempotencia: `g3-ot-${o.id_ot}-cierre`, id_ot: o.id_ot, id_empresa: o.id_empresa, tipo_ot: o.tipo_ot,
    usuario_tecnico: Object.keys(TEC).find((k) => TEC[k] === o.id_tecnico), fecha_completada: ahora(),
    cliente: { id_cliente: c.id_cliente, rut: c.rut, nombre_completo: c.nombre_completo },
    direccion: { direccion_completa: c.direcciones[0].direccion, comuna: c.direcciones[0].comuna },
    ...extra,
  };
}

// ---------------- acciones del panel ----------------
const ACCIONES = {
  'g3-cierre-instalacion': { titulo: 'G3 · Cierre de instalación OT 7001 (CU-63 → CU-64/68)', async run(p) {
    const o = ordenes.find((x) => x.id_ot === 7001);
    const mats = [{ id_tipo_equipo: await idTipo(1, 'Fibra drop QA'), cantidad: 15 }, { id_tipo_equipo: await idTipo(1, 'Conector SC/APC QA'), cantidad: 2 }];
    const body = cierreBase(o, { equipos_instalados: [{ numero_serie: p.serie_ont || 'DEMO-ONT-0004', accion: 'INSTALADO_EN_CLIENTE' }, { numero_serie: p.serie_deco || 'DEMO-DEC-0001', accion: 'INSTALADO_EN_CLIENTE' }], materiales: mats });
    const r = await llamar('G3', 'POST', `/ordenes/${o.id_ot}/cierre`, body);
    if (r.status < 300) cerrarOt(7001, [{ nombre: 'Fibra drop QA', cantidad: 15, unidad_medida: 'Metro' }, { nombre: 'Conector SC/APC QA', cantidad: 2, unidad_medida: 'Unidad' }]);
    return [r];
  } },
  'g3-cierre-repetido': { titulo: 'G3 · Reenvío del mismo cierre (idempotencia)', async run() {
    const o = ordenes.find((x) => x.id_ot === 7001);
    const body = cierreBase({ ...o, tipo_ot: 'INSTALACION' }, { equipos_instalados: [{ numero_serie: 'DEMO-ONT-0004' }, { numero_serie: 'DEMO-DEC-0001' }], materiales: [] });
    return [await llamar('G3', 'POST', `/ordenes/7001/cierre`, body)];
  } },
  'g3-cierre-reparacion': { titulo: 'G3 · Cierre de reparación OT 7002: retira ONT dañada y deja una nueva (CU-69/71)', async run() {
    const o = ordenes.find((x) => x.id_ot === 7002);
    const body = cierreBase(o, {
      categoria_falla: 'ONT sin potencia óptica',
      equipos_retirados: [{ numero_serie: 'QA-ONT-F-0003', accion: 'RETIRADO_PARA_DIAGNOSTICO' }],
      equipos_instalados: [{ numero_serie: 'QA-ONT-F-0002', accion: 'INSTALADO_EN_CLIENTE' }],
      materiales: [{ id_tipo_equipo: await idTipo(1, 'Conector SC/APC QA'), cantidad: 1 }],
      reparacion: { falla_reportada: 'Cliente sin señal, LOS en rojo', solucion_aplicada: 'Cambio de ONT y conector', resultado: 'RESUELTO', tipo_trabajo: 'T-03' },
    });
    const r = await llamar('G3', 'POST', `/ordenes/7002/cierre`, body);
    if (r.status < 300) cerrarOt(7002, [{ nombre: 'Conector SC/APC QA', cantidad: 1, unidad_medida: 'Unidad' }]);
    return [r];
  } },
  'g3-cierre-cable': { titulo: 'G3 · Cierre de instalación Cable Mágico OT 7101 (tecnico_cable)', async run() {
    const o = ordenes.find((x) => x.id_ot === 7101);
    const body = cierreBase(o, { equipos_instalados: [{ numero_serie: 'QA-ONT-C-0002' }, { numero_serie: 'DEMO-C-RTR-0001' }], materiales: [{ id_tipo_equipo: await idTipo(2, 'Fibra drop Cable QA'), cantidad: 18 }] });
    const r = await llamar('G3', 'POST', `/ordenes/7101/cierre`, body);
    if (r.status < 300) cerrarOt(7101, [{ nombre: 'Fibra drop Cable QA', cantidad: 18, unidad_medida: 'Metro' }]);
    return [r];
  } },
  'g3-cierre-discrepancia': { titulo: 'G3 · Cierre con serie inexistente y consumo mayor al saldo (discrepancias)', async run() {
    const body = { clave_idempotencia: `g3-ot-7099-${Date.now()}`, id_ot: 7099, id_empresa: 1, tipo_ot: 'INSTALACION', usuario_tecnico: 'tecnico_qa', fecha_completada: ahora(),
      cliente: { rut: '12345678-5', nombre_completo: 'Juan Pérez González' }, equipos_instalados: [{ numero_serie: 'NO-EXISTE-0001' }],
      materiales: [{ id_tipo_equipo: await idTipo(1, 'Cable UTP Cat6 QA'), cantidad: 9999 }] };
    return [await llamar('G3', 'POST', `/ordenes/7099/cierre`, body)];
  } },
  'g8-baja-morosidad': { titulo: 'G8 + G3 · Baja por morosidad: G3 retira el equipo y G8 consulta la recepción', async run() {
    const o = ordenes.find((x) => x.id_ot === 7003);
    const body = cierreBase(o, { request_id: 'MOR-2026-0001', equipos_retirados: [{ numero_serie: 'HW-ONT-99001', accion: 'RETIRADO_PARA_DIAGNOSTICO' }], categoria_falla: 'Retiro por morosidad' });
    const a = await llamar('G3', 'POST', `/ordenes/7003/cierre`, body);
    if (a.status < 300) cerrarOt(7003, []);
    const b = await llamar('G8', 'GET', `/recepciones?id_empresa=1&id_ot=7003`);
    return [a, b];
  } },
  'g8-activacion': { titulo: 'G8 · Activación del servicio de la OT 7001 (correlación cierre ↔ activación)', async run() {
    const body = { event_id: `g8-act-7001-${Date.now()}`, trace_id: 'trace-demo-7001', id_empresa: 1, id_ot: 7001, id_cliente: 4, id_contrato: 3001, id_servicio: 50001, rut_cliente: '15678912-7', equipos: [{ numero_serie: 'DEMO-ONT-0004' }, { numero_serie: 'DEMO-DEC-0001' }] };
    return [await llamar('G8', 'POST', `/activaciones`, body)];
  } },
  'g8-equipos-servicio': { titulo: 'G8 · Equipos asociados al servicio 50001', async run() { return [await llamar('G8', 'GET', `/equipos?id_empresa=1&id_servicio=50001`)]; } },
  'g8-stock': { titulo: 'G8 · Stock disponible de Finet', async run() { return [await llamar('G8', 'GET', `/stock?id_empresa=1`)]; } },
  'g8-tipos': { titulo: 'G8 · Catálogo de tipos de equipo de Finet', async run() { return [await llamar('G8', 'GET', `/tipos-equipo?id_empresa=1`)]; } },
  'g3-unidad': { titulo: 'G3 · Consulta de una unidad por número de serie', async run(p) { return [await llamar('G3', 'GET', `/unidades/${encodeURIComponent(p.serie || 'DEMO-ONT-0004')}?id_empresa=1`)]; } },
};

// ---------------- servidor ----------------
function json(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); }
function leer(req) { return new Promise((ok) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch { ok({}); } }); }); }

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  // Panel
  if (req.method === 'GET' && (p === '/' || p === '/panel')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(path.join(__dirname, 'panel.html')));
  }
  if (req.method === 'GET' && p === '/panel/acciones') return json(res, 200, Object.entries(ACCIONES).map(([id, a]) => ({ id, titulo: a.titulo })));
  if (req.method === 'GET' && p === '/panel/log') return json(res, 200, log);
  if (req.method === 'GET' && p === '/panel/ordenes') return json(res, 200, ordenes.map(conFecha));
  if (req.method === 'POST' && p === '/panel/log/limpiar') { log.length = 0; return json(res, 200, { ok: true }); }
  if (req.method === 'POST' && p === '/panel/reiniciar') {
    for (const o of ordenes) if (o.id_ot >= 7000) { o.estado = o.id_ot === 7001 || o.id_ot === 7101 ? 'EN_CURSO' : 'PENDIENTE'; delete o.fecha_completada; o.materiales = []; }
    log.length = 0; tiposCache = {}; return json(res, 200, { ok: true });
  }
  if (req.method === 'POST' && p.startsWith('/panel/accion/')) {
    const a = ACCIONES[p.split('/').pop()];
    if (!a) return json(res, 404, { error: 'Acción desconocida' });
    try { return json(res, 200, { titulo: a.titulo, pasos: await a.run(await leer(req)) }); }
    catch (e) { return json(res, 500, { error: String(e.message || e) }); }
  }
  if (p === '/health') return json(res, 200, { ok: true });

  // API simulada de G3 (consultas salientes de G1)
  if (p.startsWith('/g3/')) {
    const ruta = p.slice(3);
    let status = 200, data;
    if (req.headers['x-api-key'] !== KEY_G1) { status = 401; data = { message: 'X-API-KEY inválida' }; }
    else if (req.method === 'GET' && /^\/clientes\/rut\//.test(ruta)) {
      const rut = decodeURIComponent(ruta.split('/').pop()).replace(/\./g, '').toUpperCase();
      const c = clientes.find((x) => x.rut.toUpperCase() === rut);
      if (c) data = { data: c }; else { status = 404; data = { message: 'Cliente no encontrado' }; }
    } else if (req.method === 'GET' && ruta === '/clientes') {
      const q = (url.searchParams.get('busqueda') || '').toLowerCase(); const emp = Number(url.searchParams.get('id_empresa')) || null;
      data = { data: clientes.filter((c) => (!emp || c.id_empresa === emp) && (c.nombre_completo.toLowerCase().includes(q) || c.rut.includes(q))) };
    } else if (req.method === 'GET' && ruta === '/ordenes') {
      const sp = url.searchParams; const estados = (sp.get('estado') || '').split(',').filter(Boolean);
      const tec = Number(sp.get('id_tecnico')) || null; const emp = Number(sp.get('id_empresa')) || null;
      const lista = ordenes.filter((o) => (!estados.length || estados.includes(o.estado)) && (!tec || o.id_tecnico === tec) && (!emp || o.id_empresa === emp)).map(conFecha);
      data = { data: lista, total: lista.length, page: 1, limit: 50 };
    } else if (req.method === 'GET' && /^\/ordenes\/\d+$/.test(ruta)) {
      const o = ordenes.find((x) => x.id_ot === Number(ruta.split('/').pop()));
      if (o) data = { data: conFecha(o) }; else { status = 404; data = { message: 'OT no encontrada' }; }
    } else { status = 404; data = { message: 'Ruta no simulada' }; }
    registrar({ direccion: 'G1 → G3', metodo: req.method, ruta: `${ruta}${url.search}`, status, ms: 0, peticion: null, respuesta: data });
    return json(res, status, data);
  }
  json(res, 404, { message: 'No encontrado' });
}).listen(PORT, () => console.log(`Simulador externo en :${PORT} → backend ${BACKEND}`));
