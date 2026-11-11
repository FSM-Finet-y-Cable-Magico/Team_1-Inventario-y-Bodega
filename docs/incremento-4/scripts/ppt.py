# Presentación del Incremento 4: misma presentación del Incremento 3, cambiando solo textos e imágenes.
# Uso: python3 ppt4.py SALIDA.pptx
import copy, sys, os
from pptx import Presentation
from pptx.util import Emu
from pptx.dml.color import RGBColor
from PIL import Image

SRC = '/tmp/ppt3/p3.pptx'
OUT = sys.argv[1]
R = '/home/user/Team_1-Inventario-y-Bodega/'
D4 = R + 'diagramas/incremento4/'
EV = R + 'docs/incremento-4/evidencias/'
SQ = R + 'diagramas/diagramas-secuencia/'
IMG = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pptimg/')
A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
REMB = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed'

prs = Presentation(SRC)
S = list(prs.slides)


def sh(n, i):
    return list(S[n - 1].shapes)[i]


def T(n, i, *paras):
    """Reemplaza el texto conservando el formato del primer run de cada párrafo."""
    tf = sh(n, i).text_frame
    ps = tf.paragraphs
    for k, text in enumerate(paras):
        if k < len(ps):
            p = ps[k]
        else:
            p_el = copy.deepcopy(ps[-1]._p); ps[-1]._p.addnext(p_el); p = tf.paragraphs[k]
        runs = p.runs
        runs[0].text = text
        for r in runs[1:]:
            r._r.getparent().remove(r._r)
    for p in tf.paragraphs[len(paras):]:
        p._p.getparent().remove(p._p)


def DEL(n, *idx):
    shapes = list(S[n - 1].shapes)
    for i in idx:
        el = shapes[i]._element; el.getparent().remove(el)


def PIC(n, i, path, box=None):
    """Cambia la imagen y la ajusta, centrada y sin deformar, dentro de la caja (por defecto la original)."""
    s = sh(n, i)
    x, y, w, h = box or (s.left, s.top, s.width, s.height)
    _, rid = S[n - 1].part.get_or_add_image_part(path)
    blip = s._element.find('.//' + A + 'blip'); blip.set(REMB, rid)
    src = s._element.find('.//' + A + 'srcRect')
    if src is not None:
        src.getparent().remove(src)
    iw, ih = Image.open(path).size
    sc = min(w / iw, h / ih)
    nw, nh = int(iw * sc), int(ih * sc)
    s.left, s.top, s.width, s.height = Emu(x + (w - nw) // 2), Emu(y + (h - nh) // 2), Emu(nw), Emu(nh)


def NOTE(n, text):
    S[n - 1].notes_slide.notes_text_frame.text = text


# 1 · Portada y 16 · Cierre
for n in (1, 16):
    T(n, 4, 'Incremento 4')
    T(n, 10, 'Santiago, Chile  —  Noviembre de 2026')
NOTE(1, 'Buenas tardes. Somos el Grupo 1 y presentamos el Incremento 4 del Sistema de Gestión Integral para Finet y Cable '
        'Mágico Litoral. Nuestro módulo es Inventario y Bodega, y en esta entrega cerramos el proyecto: sumamos tres casos '
        'de uso y dejamos el sistema funcionando en la VPS del curso.')
NOTE(16, 'Eso es todo por nuestra parte. Muchas gracias; quedamos atentos a sus preguntas.')

# 2 · Índice
T(2, 2, 'Flujo de la presentación · foco en el alcance y la trazabilidad del Incremento 4')
for i, t in [(8, 'Alcance del Incremento 4'), (12, 'Trazabilidad · RF-71 → CU-97'), (14, 'Trazabilidad · RF-72 → CU-98'),
             (20, 'Comportamiento del sistema · CU-97'), (22, 'Comportamiento del sistema · CU-98'),
             (28, 'Traza Scrum++ del Incremento 4')]:
    T(2, i, t)
NOTE(2, 'Este es el recorrido. Partimos con el contexto y el alcance, seguimos con los requerimientos y la trazabilidad de '
        'los dos casos principales, luego la arquitectura, el modelo físico con sus relaciones y el comportamiento del '
        'sistema, las pruebas y, al final, la traza Scrum++ y el avance acumulado.')

# 3 · Introducción y contexto
T(3, 10, 'Los Incrementos 1 a 3 completaron los 96 CU del Documento 0, incluidos los cierres con el sistema de terreno (G3).')
T(3, 11, 'Qué agrega el Incremento 4')
T(3, 13, 'Toma de inventario físico por bodega: conteo, comparación con lo esperado y ajuste de diferencias.')
T(3, 15, 'Desactivación y reactivación de proveedores, sin perder su historial de órdenes.')
T(3, 17, 'Acta PDF de cada toma confirmada, para firmarla y archivarla.')
T(3, 19, 'Sistema en producción en la VPS FiNet, con la base global y 45 relaciones nuevas en el modelo físico.')
T(3, 21, 'Incremento 4: 3 casos de uso nuevos que llevan el proyecto a 99, con el sistema desplegado en la VPS del curso.')
NOTE(3, 'El problema de origen es un inventario manejado con herramientas sueltas y registros manuales, donde cuesta seguir '
        'cada equipo y separar los datos de cada empresa. Los tres primeros incrementos dejaron implementados los 96 casos '
        'del Documento 0. En este último agregamos el control físico de la bodega con la toma de inventario y su acta, la '
        'gestión de la vigencia de los proveedores, y dejamos el sistema en producción en la VPS.')

# 4 · Alcance del Incremento 4
T(4, 1, 'Alcance del Incremento 4')
T(4, 7, 'Toma de inventario físico y ajuste de diferencias (CU-97)')
T(4, 9, 'Desactivar y reactivar proveedor (CU-98)')
T(4, 11, 'Acta PDF de la toma de inventario (CU-99)')
T(4, 13, 'Órdenes de ingreso solo con proveedores activos (CU-98)')
T(4, 15, 'Roles equivalentes con la base global de validación')
T(4, 17, 'Cierres de G3 que identifican al técnico por id, RUT o usuario')
T(4, 23, 'Despliegue con Docker rootless en la VPS FiNet y túnel SSH')
T(4, 25, '45 claves foráneas nuevas (72 en total), creadas NOT VALID y luego validadas')
T(4, 27, 'Integraciones por HTTPS en el nginx de la VPS (puerto 8143)')
T(4, 29, '45'); T(4, 30, 'Claves foráneas nuevas')
T(4, 35, '100%'); T(4, 36, 'CU acumulado · 99 / 99')
T(4, 38, '3,03%'); T(4, 39, 'Avance del incremento · 3 / 99')
T(4, 41, '3'); T(4, 42, 'Casos de uso nuevos')
T(4, 44, '3'); T(4, 45, 'Requerimientos funcionales')
NOTE(4, 'El Incremento 4 suma 3 casos de uso, que equivalen al 3,03 por ciento de un total que ahora es de 99, y con eso '
        'cerramos en 99 de 99, el 100 por ciento acumulado. En lo técnico, el sistema quedó en la VPS FiNet con Docker, '
        'conectado a la base global, y agregamos 45 claves foráneas, con lo que el modelo físico queda con 72 relaciones.')

# 5 · Requerimientos y trazabilidad
T(5, 17, '2'); T(5, 20, '3'); T(5, 23, '3'); T(5, 26, '10/10')
T(5, 27, 'Escenarios de prueba')
T(5, 29, 'En detalle:  RF-71 → CU-97 (Registrando toma de inventario físico)   y   RF-72 → CU-98 (Desactivando proveedor).')
T(5, 32, 'RF-71  →  CU-97'); T(5, 33, 'RF-72  →  CU-98'); T(5, 34, 'RF-73  →  CU-99')
T(5, 37, 'UR 13.1  →  RF-71, RF-73'); T(5, 38, 'UR 13.2  →  RF-72')
DEL(5, 35, 36, *range(39, 49))
NOTE(5, 'Los 3 casos vienen de 3 requerimientos funcionales y 2 requerimientos de usuario nuevos: el 13.1, control físico '
        'del inventario, y el 13.2, vigencia de proveedores. Cada requerimiento se sigue hasta su caso de uso, su diagrama '
        'de secuencia, el código y la prueba. Abajo está la matriz completa del incremento.')

# 6 · Trazabilidad RF-71 → CU-97
T(6, 1, 'Trazabilidad · RF-71 → CU-97')
T(6, 2, 'Registrando toma de inventario físico')
T(6, 4, 'Registrar la toma de inventario físico de una bodega y ajustar las diferencias')
T(6, 5, 'Registrando toma de inventario físico')
T(6, 6, 'CU-97 — flujo normal y excepción por toma abierta')
T(6, 7, 'tomas-inventario · TomasInventarioController → TomasInventarioService')
T(6, 8, 'P97-N y P97-E1 — conformes · 17 pruebas unitarias')
T(6, 11, 'El encargado abre una toma en una bodega y el sistema guarda lo esperado.')
T(6, 13, 'Registra cantidades y series; cada línea queda como coincide, faltante o sobrante.')
T(6, 15, 'Al confirmar, cada diferencia genera un movimiento de ajuste del stock.')
PIC(6, 17, EV + 'CU97-conteo-abierta.png')
T(6, 18, 'RF-71'); T(6, 19, 'CU-97')
NOTE(6, 'El primero es CU-97, que viene del RF-71. Lo elegimos porque es el caso principal del incremento y afecta '
        'directamente las existencias. El encargado abre la toma, el sistema guarda lo que debería haber, se cuentan los '
        'consumibles y se leen las series, y al confirmar cada diferencia se ajusta con un movimiento de inventario. '
        'Si la bodega ya tiene una toma abierta, no se permite abrir otra.')

# 7 · Trazabilidad RF-72 → CU-98
T(7, 1, 'Trazabilidad · RF-72 → CU-98')
T(7, 2, 'Desactivando proveedor')
T(7, 4, 'Desactivar o reactivar proveedores conservando su historial')
T(7, 5, 'Desactivando proveedor')
T(7, 6, 'CU-98 — flujo normal y excepción por órdenes pendientes')
T(7, 7, 'proveedores · ProveedoresController → ProveedoresService')
T(7, 8, 'P98-N, P98-E1, P98-E2, P98-E3 y P98-R — conformes')
T(7, 11, 'El administrador desactiva el proveedor desde su listado.')
T(7, 13, 'T1 revisa que no tenga órdenes de ingreso pendientes y lo marca inactivo.')
T(7, 15, 'Un proveedor inactivo no aparece en órdenes nuevas y se puede reactivar.')
PIC(7, 17, EV + 'CU98-E2-ordenes-pendientes.png')
T(7, 18, 'RF-72'); T(7, 19, 'CU-98')
NOTE(7, 'El segundo es CU-98, del RF-72: desactivar un proveedor. El proveedor no se borra, conserva su historial, pero ya '
        'no se puede usar en órdenes de ingreso nuevas. Si todavía tiene órdenes pendientes de recepción, el sistema lo '
        'impide y avisa cuántas son. También se puede reactivar.')

# 8 · Diagrama de componentes
T(8, 5, 'Vista de componentes · Inventario y Bodega, Incremento 4')
PIC(8, 0, D4 + 'componentes-i4.png')
NOTE(8, 'Este es el diagrama de componentes. La vista en SvelteKit consume la API REST en NestJS; los controladores delegan '
        'en servicios como inventario, toma de inventario, proveedores, reportes e integraciones, y la persistencia va a '
        'PostgreSQL. Los módulos nuevos del incremento reutilizan el stock, las órdenes de ingreso y el generador PDF.')

# 9 · Modelo físico
T(9, 4, 'Modelo físico por incremento · 34 tablas y 72 relaciones en PostgreSQL')
PIC(9, 5, IMG + 'fisico-slide.png', (566928, 1330000, 9400000, 5050000))
T(9, 6, 'Azul: I1 (12)  ·  Verde: I2 (14)  ·  Ámbar: I3 (6)  ·  Violeta: I4 (2 nuevas: toma_inventario, toma_inventario_detalle)  ·  Líneas violetas: 45 FK nuevas')
NOTE(9, 'El modelo físico está coloreado por incremento: 12 tablas del primero, 14 del segundo, 6 del tercero y 2 nuevas '
        'en este, la toma de inventario y su detalle. En total son 34 tablas. Atendiendo la observación del incremento '
        'anterior, ahora se ven las relaciones: las líneas violetas son las 45 claves foráneas que agregamos, 72 en total.')

# 10 · Comportamiento CU-97
T(10, 2, 'Comportamiento del sistema · CU-97')
T(10, 5, 'Diagrama de secuencia · flujo normal de la toma de inventario con ajuste de diferencias')
PIC(10, 0, SQ + 'CU97/CU97-normal.png')
NOTE(10, 'En la secuencia de CU-97 se ve el flujo completo: se abre la toma y se guarda lo esperado de la bodega, se '
         'registra el conteo, y al confirmar se comparan las líneas y se generan los movimientos de ajuste dentro de una '
         'misma transacción, junto con la auditoría.')

# 11 · Comportamiento CU-98
T(11, 1, 'Comportamiento del sistema · CU-98')
T(11, 4, 'Diagrama de secuencia · flujo normal de la desactivación de un proveedor')
PIC(11, 3, SQ + 'CU98/CU98-normal.png')
NOTE(11, 'En CU-98 el flujo es más corto: se valida la empresa, se cuentan las órdenes de ingreso pendientes del proveedor '
         'y, si no hay, se marca inactivo y se registra en la auditoría. Al crear una orden de ingreso, el servicio rechaza '
         'un proveedor inactivo.')

# 12 · Árbol de navegación
T(12, 6, 'Ámbar: pantallas del Incremento 3')
T(12, 7, 'Violeta: pantallas nuevas del Incremento 4; borde violeta: pantalla anterior ampliada')
T(12, 8, 'Recorrido de CU-97 y CU-98')
T(12, 10, 'Toma de inventario: listado de tomas, detalle con conteo y descarga del acta.')
T(12, 12, 'Proveedores: botones Desactivar y Reactivar con confirmación.')
T(12, 14, 'Órdenes de ingreso: solo se ofrecen proveedores activos.')
PIC(12, 16, R + 'diagramas/arbol-navegacion/arbol-navegacion-incremento4.png')
T(12, 20, 'I4')
vio = sh(12, 20)
vio.fill.solid(); vio.fill.fore_color.rgb = RGBColor(0xD9, 0xCC, 0xF5)
vio.line.color.rgb = RGBColor(0x6A, 0x4F, 0xB3)
NOTE(12, 'El árbol de navegación muestra en qué incremento se incorporó cada pantalla: azul para el primero, verde para el '
         'segundo, ámbar para el tercero y violeta para este. Lo nuevo es la toma de inventario, con su listado y el detalle '
         'del conteo, y en proveedores se agregaron las acciones de desactivar y reactivar.')

# 13 · Pruebas
T(13, 2, '10 de 10 escenarios conformes · 174 pruebas automatizadas y 72 claves foráneas validadas')
T(13, 5, 'CU-97 Y CU-99 · TOMA')
T(13, 7, 'P97-N: toma confirmada, diferencias ajustadas en el stock')
T(13, 9, 'P97-E1: segunda toma abierta en la misma bodega rechazada')
T(13, 11, 'P99-N: acta PDF de la toma confirmada')
T(13, 13, 'P99-E1 y P99-E2: toma abierta (409) u otra empresa (404)')
T(13, 15, 'P98-N: proveedor sin órdenes pendientes desactivado')
T(13, 17, 'P98-E1: proveedor ya inactivo, sin cambios')
T(13, 19, 'P98-E2: órdenes pendientes de recepción, desactivación rechazada')
T(13, 21, 'P98-E3: orden de ingreso con proveedor inactivo rechazada; P98-R: reactivación conforme')
T(13, 23, 'Migración probada en base nueva, base vacía y segunda ejecución')
T(13, 25, '72'); T(13, 26, 'Claves foráneas validadas')
T(13, 29, 'CU-98 · PROVEEDOR')
T(13, 31, '26'); T(13, 32, 'Suites de pruebas')
T(13, 34, '174'); T(13, 35, 'Pruebas automatizadas (Jest)')
T(13, 37, '10/10'); T(13, 38, 'Escenarios conformes')
T(13, 40, '26'); T(13, 41, 'Unitarias del incremento')
NOTE(13, 'En pruebas tenemos 10 escenarios funcionales sobre la API, todos conformes: el flujo normal y las excepciones de '
         'cada caso. Además hay 26 pruebas unitarias nuevas y la suite completa del backend, 174 pruebas en 26 suites, pasa '
         'sin fallas. La migración de las claves foráneas se probó en una base nueva, una vacía y una ya migrada.')

# 14 · Traza Scrum++
T(14, 1, 'Traza Scrum++ del Incremento 4')
PIC(14, 3, D4 + 'graficos/burnup-sprint-i4.png')
PIC(14, 4, D4 + 'graficos/burndown-sprint-i4.png')
T(14, 8, 'Product Backlog: la pila crece por incremento; el I4 suma 15 elementos (89 HH).')
T(14, 10, 'Sprint Planning 04-11: primero la VPS y CU-97, luego la documentación.')
T(14, 12, 'Daily Scrum: avance e impedimentos, la mayoría externos (permisos y red de la VPS).')
T(14, 14, 'Sprint Review: Pull Requests revisadas por el jefe de grupo y pruebas en dev y en la VPS.')
T(14, 16, 'Cambio de alcance 09-11: RF-72 y RF-73 (+12 HH); retrospectiva al cierre.')
T(14, 18, '3'); T(14, 19, 'CU completados')
T(14, 21, '101 HH'); T(14, 22, 'Estimación del sprint')
T(14, 24, '70 HH'); T(14, 25, 'Completadas al 09-11')
NOTE(14, 'En Scrum++ la pila del producto crece en cada incremento; en este agregamos 15 elementos con 89 horas hombre, y el '
         '9 de noviembre sumamos dos requerimientos más, con 12 horas. Priorizamos la VPS y la toma de inventario, porque el '
         'resto dependía de ellas. El burn-up y el burn-down muestran el avance del sprint frente a lo planificado.')

# 15 · Avance acumulado
PIC(15, 3, D4 + 'graficos/burnup-proyecto.png')
PIC(15, 4, D4 + 'graficos/burndown-proyecto.png')
T(15, 8, 'Denominador: 99 casos de uso (96 del Documento 0 y 3 del Incremento 4).')
T(15, 10, 'Mínimos exigidos: 30 %, 70 %, 95 % y 100 % al cierre de cada incremento.')
T(15, 12, 'Cada entrega superó su mínimo; el Incremento 4 cierra en el 100 %.')
T(15, 14, 'Burn-down: de 99 CU pendientes a 0 al cierre del Incremento 4.')
T(15, 16, 'Cierre: sistema en la VPS y aceptación del Product Owner.')
T(15, 19, 'Incremento 1 · 46,46%')
T(15, 22, 'Incremento 2 · 77,78%')
T(15, 25, 'Incremento 3 · 96,97%')
# cuarta caja (Incremento 4): se reparten 4 cajas en el ancho que ocupaban 3
shapes15 = list(S[14].shapes)
box = [shapes15[23], shapes15[24], shapes15[25]]
new = [copy.deepcopy(s._element) for s in box]
anchor = shapes15[25]._element
for el in new:
    anchor.addnext(el); anchor = el
shapes15 = list(S[14].shapes)
W4, GAP, X0 = 1300000, 110000, 566928
for k in range(4):
    b, num, cap = shapes15[17 + 3 * k], shapes15[18 + 3 * k], shapes15[19 + 3 * k]
    x = X0 + k * (W4 + GAP)
    b.left, b.width = Emu(x), Emu(W4)
    num.left, num.width = Emu(x), Emu(W4)
    cap.left, cap.width = Emu(x + 30000), Emu(W4 - 60000)
T(15, 27, '99'); T(15, 28, 'Incremento 4 · 100%')
NOTE(15, 'En el acumulado del proyecto pasamos de 46 casos en el primer incremento a 77 en el segundo, 96 en el tercero y '
         '99 en este, siempre por sobre los mínimos. Con los tres casos nuevos el total sube a 99 y cerramos en el 100 por '
         'ciento, con el sistema en producción en la VPS.')

# quitar las imágenes antiguas que ya no usa ninguna diapositiva
for sl in prs.slides:
    xml = sl._element.xml
    for rid, rel in list(sl.part.rels.items()):
        if rel.reltype.endswith('/image') and f'"{rid}"' not in xml:
            sl.part.drop_rel(rid)
prs.save(OUT)
print('ok', len(prs.slides), 'diapositivas')
