#!/usr/bin/env python3
"""Completa los datos de la demo usando la API del sistema (así quedan auditoría e historial reales).

Se ejecuta una vez sobre la base recién sembrada (seed QA) y después se guarda el estado con
guardar-estado-demo.sh. Es idempotente: si un dato ya existe, no lo vuelve a crear.

  - CU-52/54: orden OI-0005 (FAC20261115) pendiente, 5 ONT + 2 routers con serie obligatoria.
  - CU-41: una bodega adicional por empresa.
  - CU-97/99: toma de inventario confirmada con diferencias en Bodega Cable Mágico Central (con acta).
  - CU-20/23: transferencia pendiente de aprobación de Finet a Cable Mágico.
"""
import json
import urllib.error
import urllib.request

API = 'http://localhost:8090/api'


def llamar(metodo, ruta, token=None, cuerpo=None):
    req = urllib.request.Request(API + ruta, method=metodo, data=json.dumps(cuerpo).encode() if cuerpo is not None else None)
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', 'Bearer ' + token)
    try:
        with urllib.request.urlopen(req) as r:
            texto = r.read().decode()
    except urllib.error.HTTPError as e:
        raise SystemExit(f'{metodo} {ruta} → HTTP {e.code}: {e.read().decode()[:300]}')
    datos = json.loads(texto) if texto else None
    return datos.get('data', datos) if isinstance(datos, dict) and 'data' in datos and len(datos) <= 3 else datos


def login(usuario, clave):
    return llamar('POST', '/auth/login', cuerpo={'nombre_usuario': usuario, 'password': clave})['access_token']


def lista(x):
    return x if isinstance(x, list) else (x or {}).get('data') or (x or {}).get('items') or []


finet = login('admin_finet', 'Finet1234')
cable = login('admin_cable', 'Cable1234')
superu = login('superusuario', 'Super1234')

# ---- bodegas (Finet: 1 = Bodega Finet Central · Cable: 2 = Bodega Cable Mágico Central) ----
bodegas = lista(llamar('GET', '/bodegas', superu))
nombres = {b['nombre'] for b in bodegas}
for token, nombre, direccion in ((finet, 'Bodega Puente Alto', 'Av. Concha y Toro 2350, Puente Alto'),
                                 (cable, 'Bodega San Antonio', 'Av. Barros Luco 1615, San Antonio')):
    if nombre not in nombres:
        llamar('POST', '/bodegas', token, {'nombre': nombre, 'direccion': direccion})
        print('  bodega creada:', nombre)
bodegas = {b['nombre']: b for b in lista(llamar('GET', '/bodegas', superu))}
id_central_finet = bodegas['Bodega Finet Central']['id_bodega']
id_central_cable = bodegas['Bodega Cable Mágico Central']['id_bodega']

# ---- CU-54: orden OI-0005 pendiente ----
ordenes = lista(llamar('GET', '/ordenes-ingreso', finet))
if not any(o.get('numero_documento') == 'FAC20261115' for o in ordenes):
    o = llamar('POST', '/ordenes-ingreso', finet, {
        'id_proveedor': 1, 'numero_documento': 'FAC20261115', 'fecha_documento': '2026-11-14', 'id_bodega_destino': id_central_finet,
        'items': [{'id_tipo_equipo': 1, 'cantidad_esperada': 5, 'garantia_dias': 365},   # ONT QA Finet
                  {'id_tipo_equipo': 3, 'cantidad_esperada': 2, 'garantia_dias': 365}]})  # Router Wi-Fi QA
    print('  orden creada:', o.get('correlativo'), o.get('estado'))

# ---- CU-97/99: toma confirmada con diferencias en Bodega Cable Mágico Central ----
tomas = lista(llamar('GET', '/tomas-inventario', cable))
if not any(t.get('estado') == 'CONFIRMADA' for t in tomas):
    abierta = next((t for t in tomas if t.get('estado') == 'ABIERTA' and t.get('id_bodega') == id_central_cable), None)
    toma = llamar('GET', f"/tomas-inventario/{abierta['id_toma']}", cable) if abierta else llamar('POST', '/tomas-inventario', cable, {'id_bodega': id_central_cable})
    consumibles = [{'id_detalle': c['id_detalle'], 'cantidad_contada': c['cantidad_esperada'] - (2 if 'Conector' in c['tipo_equipo_nombre'] else 0)}
                   for c in toma['consumibles']]
    series = [s['numero_serie'] for s in toma['series']][:-1]   # una serie queda faltante
    llamar('PATCH', f"/tomas-inventario/{toma['id_toma']}/conteo", cable, {'consumibles': consumibles, 'series': series})
    r = llamar('POST', f"/tomas-inventario/{toma['id_toma']}/confirmar", cable, {'forzar_movimientos': True})
    print('  toma confirmada:', toma['id_toma'], (r or {}).get('estado'))

# ---- CU-20: transferencia pendiente Finet → Cable Mágico ----
OBS_TRANSF = 'Préstamo de router para cliente corporativo de Cable Mágico'
transf = lista(llamar('GET', '/transferencias', superu))
if not any(t.get('observaciones') == OBS_TRANSF for t in transf):
    candidata = None
    for u in lista(llamar('GET', '/unidades?estado=En%20bodega&limit=100', finet)):
        if u.get('id_bodega_actual') == id_central_finet and str(u.get('numero_serie', '')).startswith('DEMO-RTR'):
            candidata = u
            break
    if candidata:
        llamar('POST', '/transferencias', finet, {'id_empresa_destino': 2, 'id_bodega_origen': id_central_finet, 'id_bodega_destino': id_central_cable,
                                                  'ids_unidades': [candidata['id_unidad']], 'observaciones': OBS_TRANSF})
        print('  transferencia pendiente creada con', candidata['numero_serie'])
    else:
        print('  (sin router disponible para la transferencia)')
print('Datos de demo listos.')
