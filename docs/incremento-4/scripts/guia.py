import copy, sys, os
sys.path.insert(0, os.path.dirname(__file__))
import docx
from builder import _set_text, W
SRC = '/mnt/user-data/uploads/Entregas/Incremento-3-v2-Claude/Guía de instalación y demostración Incremento 3 v2 Claude.docx'
OUT = sys.argv[1]
d = docx.Document(SRC)
body = d.element.body
ps = d.paragraphs
for p in ps[:21]:
    if 'INCREMENTO 3' in p.text:
        _set_text(p._p, 'GUÍA DE INSTALACIÓN EN LA VPS — INCREMENTO 4')
proto = {'h1': copy.deepcopy(ps[22]._p), 'p': copy.deepcopy(ps[23]._p), 'code': copy.deepcopy(ps[27]._p),
         'cap': copy.deepcopy(ps[29]._p), 'src': copy.deepcopy(ps[30]._p)}
tbl0 = copy.deepcopy(d.tables[0]._tbl)
start = ps[22]._p
ch = list(body)
k = ch.index(start)
for e in ch[k:-1]:
    body.remove(e)
anchor = ch[k - 1]
n1 = [0]


def add(el):
    global anchor
    anchor.addnext(el); anchor = el


def H(t):
    n1[0] += 1
    el = copy.deepcopy(proto['h1']); _set_text(el, f'{n1[0]}. {t}'); add(el)


def P(t):
    el = copy.deepcopy(proto['p']); _set_text(el, t); add(el)


def C(t):
    el = copy.deepcopy(proto['code']); _set_text(el, t); add(el)


def TB(cap, rows, src='Fuente: Grupo 1 (2026), codigo/DESPLIEGUE-VPS.md.'):
    t = copy.deepcopy(tbl0)
    trs = t.findall(W + 'tr')
    proto_rows = [trs[0], trs[1]]
    for tr in trs:
        t.remove(tr)
    grid = t.find(W + 'tblGrid')
    gc = grid.findall(W + 'gridCol')
    tot = sum(int(float(x.get(W + 'w'))) for x in gc)
    for x in gc[2:]:
        grid.remove(x)
    gc[0].set(W + 'w', str(int(tot * .4))); gc[1].set(W + 'w', str(int(tot * .6)))
    for i, r in enumerate(rows):
        tr = copy.deepcopy(proto_rows[0 if i == 0 else 1])
        tcs = tr.findall(W + 'tc')
        for tc, v in zip(tcs, r):
            _set_text(tc.find(W + 'p'), v)
        for tc in tcs[len(r):]:
            tr.remove(tc)
        t.append(tr)
    add(t)
    c = copy.deepcopy(proto['cap']); _set_text(c, cap); add(c)
    s = copy.deepcopy(proto['src']); _set_text(s, src); add(s)


H('ALCANCE Y REQUISITOS')
P('Esta guía describe la instalación del Sistema de Inventario y Bodega en la VPS FiNet del curso, donde quedó en producción en el Incremento 4, y su verificación. La instalación local con Docker Desktop descrita en la guía del Incremento 3 sigue vigente para desarrollo.')
P('Requisitos: cuenta grupo1 en la VPS (38.7.201.104) con su contraseña o llave SSH, cliente SSH en el computador, Git en la VPS (ya instalado) y Docker rootless con Compose (ya instalado por la administración). Los puertos permitidos para el grupo son 8100 a 8199.')
H('OBTENER EL CÓDIGO Y CONFIGURAR')
C('ssh grupo1@38.7.201.104\ncd /srv/finet/grupo1\ngit clone -b main https://github.com/FSM-Finet-y-Cable-Magico/Team_1-Inventario-y-Bodega.git\ncd Team_1-Inventario-y-Bodega/codigo')
P('Crear el archivo .env a partir del ejemplo y reemplazar cada valor CAMBIAR. Las contraseñas deben generarse en hexadecimal para no romper la URL de conexión. El archivo queda solo en la VPS y no se sube al repositorio.')
C('cp vps.env.example .env\nopenssl rand -hex 24   # POSTGRES_PASSWORD\nopenssl rand -hex 32   # JWT_SECRET\nnano .env\nchmod 600 .env')
TB('Tabla 2.1. Variables principales del archivo .env', [
    ['Variable', 'Uso'],
    ['POSTGRES_PASSWORD, JWT_SECRET', 'Secretos de la base propia y de los tokens de sesión'],
    ['DATABASE_URL', 'Conexión a la base global (finet_global_validacion) cuando se usa en lugar de la base propia'],
    ['OMITIR_MIGRACIONES, OMITIR_SEED', 'En true para no modificar la base global al arrancar'],
    ['INTEGRACION_API_KEYS', 'Claves X-API-KEY de G3 y G8 que llaman a nuestras integraciones'],
    ['G3_INTEGRACION_URL, G3_INTEGRACION_API_KEY', 'Consultas del sistema a G3 (jornada del técnico)'],
])
H('ARRANQUE EN LA VPS')
C('docker compose -f docker-compose.vps.yml up -d --build\ndocker compose -f docker-compose.vps.yml ps\ncurl http://127.0.0.1:8100/api/health/ping')
P('La primera vez tarda varios minutos. Todos los servicios deben quedar en ejecución y el backend en estado healthy. Si algo falla, revisar los registros con docker compose -f docker-compose.vps.yml logs --tail=100 backend.')
H('ACCESO DESDE EL COMPUTADOR')
P('La política de la VPS no permite publicar servicios en Internet, por lo que los usuarios entran por un túnel SSH. En una consola del computador (no en la VPS) se ejecuta el comando siguiente, se deja la ventana abierta y se entra a http://127.0.0.1:18100.')
C('ssh -N -L 127.0.0.1:18100:127.0.0.1:8100 grupo1@38.7.201.104')
P('Las integraciones con otros grupos no usan el túnel: el nginx del administrador publica https://38.7.201.104:8143/api/integraciones/ con certificado válido y lo reenvía a 127.0.0.1:8100.')
H('CONEXIÓN A LA BASE GLOBAL')
P('En producción el backend usa la base global de validación compartida por los grupos. Antes de cambiar, respaldar el .env actual. Luego se definen las tres variables y se reinicia el backend; para volver atrás basta con restaurar la copia y repetir el comando.')
C('cp .env .env.antes-validacion\n# en .env:\n# DATABASE_URL=postgresql://g1_app:CONTRASEÑA@10.0.2.2:8150/finet_global_validacion\n# OMITIR_MIGRACIONES=true\n# OMITIR_SEED=true\ndocker compose -f docker-compose.vps.yml up -d backend')
P('El acceso 10.0.2.2:8150 corresponde al reenvío del servicio de usuario g1-bdd-forward hacia el contenedor de la base global. La contraseña la entrega el administrador y no se publica.')
H('ACTUALIZAR A UNA VERSIÓN NUEVA')
P('No hay despliegue automático. Después de integrar los cambios en main (por ejemplo, la PR #89 con CU-98, CU-99 y las claves foráneas) se ejecuta en la VPS:')
C('cd /srv/finet/grupo1/Team_1-Inventario-y-Bodega/codigo\ngit pull origin main\ndocker compose -f docker-compose.vps.yml up -d --build backend frontend')
H('COMPROBACIÓN FUNCIONAL')
P('Acceso: iniciar sesión y comprobar que los menús correspondan al rol.')
P('Toma de inventario (CU-97): abrir una toma en una bodega, registrar el conteo, confirmar y revisar los movimientos de ajuste.')
P('Acta (CU-99): en la toma confirmada, descargar el acta PDF y revisar sus líneas.')
P('Proveedores (CU-98): desactivar un proveedor sin órdenes pendientes y comprobar que no aparece al crear una orden de ingreso; reactivarlo.')
P('Integraciones: confirmar con G3 que un cierre de orden llega y queda registrado; probar que sin X-API-KEY la ruta responde 401.')
H('RESPALDO Y SOLUCIÓN DE PROBLEMAS')
C("docker compose -f docker-compose.vps.yml exec -T db sh -c 'pg_dump -U \"$POSTGRES_USER\" \"$POSTGRES_DB\"' > respaldo.sql")
P('El respaldo anterior corresponde a la base propia. La base global la administra el administrador de la VPS.')
P('docker ps no responde tras un reinicio: el Docker rootless del grupo debe quedar como servicio de arranque; pedirlo al administrador.')
P('El backend no conecta a la base global: revisar que el servicio g1-bdd-forward esté activo (systemctl --user status g1-bdd-forward) y que la IP del contenedor de la base no haya cambiado.')
P('Integraciones responden 401: revisar que la clave del otro grupo esté en INTEGRACION_API_KEYS y reiniciar el backend.')
H('GUION DE LOS VIDEOS')
P('Video de instalación (5 a 7 minutos): conexión por SSH, clonado, configuración del .env sin mostrar secretos, arranque con docker compose, comprobación de /api/health/ping y acceso por túnel.')
P('Video de funcionalidades (5 a 7 minutos): toma de inventario con diferencias, confirmación y acta PDF; desactivación de un proveedor y rechazo en órdenes de ingreso; cierre recibido desde G3.')
H('REFERENCIAS')
P('Grupo 1. (2026). Team_1-Inventario-y-Bodega: Sistema de inventario y bodega para Finet y Cable Mágico [Código fuente]. GitHub. https://github.com/FSM-Finet-y-Cable-Magico/Team_1-Inventario-y-Bodega')
P('Grupo 1. (2026). Despliegue en la VPS FiNet [Guía técnica]. codigo/DESPLIEGUE-VPS.md.')
for s in d.sections:
    for part in (s.header, s.first_page_header):
        for p in part.paragraphs:
            for r in p.runs:
                r.text = r.text.replace('Incremento 3', 'Incremento 4')
d.save(OUT)
