import copy, sys
from pptx import Presentation
from pptx.util import Emu, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from PIL import Image

SRC = '/tmp/ppt3/p3.pptx'
OUT = sys.argv[1]
R = '/home/user/Team_1-Inventario-y-Bodega/'
D4 = R + 'diagramas/incremento4/'
EV = R + 'docs/incremento-4/evidencias/'
RED, DARK, GRAY = RGBColor(0x9B, 0x1B, 0x2E), RGBColor(0x3A, 0x3A, 0x3A), RGBColor(0x7B, 0x7B, 0x7B)

prs = Presentation(SRC)
slides = list(prs.slides)
cover, chrome_src = slides[0], slides[3]
CHROME = ['Google Shape;87;p4', 'Google Shape;88;p4', 'Google Shape;89;p4', 'Google Shape;90;p4', 'Google Shape;118;p4']


def clone_shapes(src, dst, names=None):
    for sh in src.shapes:
        if names and sh.name not in names:
            continue
        el = copy.deepcopy(sh._element)
        for blip in el.iter('{http://schemas.openxmlformats.org/drawingml/2006/main}blip'):
            rid = blip.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
            part = src.part.related_part(rid)
            new = dst.part.relate_to(part, 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image')
            blip.set('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed', new)
        dst.shapes._spTree.append(el)


def set_text(sh, text):
    tf = sh.text_frame
    r = tf.paragraphs[0].runs[0]
    r.text = text
    for x in tf.paragraphs[0].runs[1:]:
        x.text = ''
    for para in tf.paragraphs[1:]:
        para._p.getparent().remove(para._p)


def new_slide(title, subtitle):
    s = prs.slides.add_slide(chrome_src.slide_layout)
    for ph in list(s.placeholders):
        ph._element.getparent().remove(ph._element)
    clone_shapes(chrome_src, s, CHROME)
    for sh in s.shapes:
        if sh.name == 'Google Shape;88;p4': set_text(sh, title)
        if sh.name == 'Google Shape;89;p4': set_text(sh, subtitle)
    return s


def tb(s, x, y, w, h, text, size=11, color=DARK, bold=False, align=None, anchor=None):
    box = s.shapes.add_textbox(Emu(x), Emu(y), Emu(w), Emu(h))
    tf = box.text_frame; tf.word_wrap = True
    tf.margin_left = tf.margin_right = Emu(45720); tf.margin_top = tf.margin_bottom = Emu(20000)
    if anchor: tf.vertical_anchor = anchor
    for i, line in enumerate(text.split('\n')):
        para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        r = para.add_run(); r.text = line
        r.font.size = Pt(size); r.font.color.rgb = color; r.font.bold = bold; r.font.name = 'Calibri'
        if align: para.alignment = align
    return box


def label(s, x, y, text, w=1600000):
    b = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Emu(x), Emu(y), Emu(w), Emu(256032))
    b.fill.solid(); b.fill.fore_color.rgb = RGBColor(0xF7, 0xE3, 0xE0); b.line.color.rgb = RGBColor(0xF7, 0xE3, 0xE0)
    b.shadow.inherit = False
    tf = b.text_frame; tf.margin_top = tf.margin_bottom = 0
    r = tf.paragraphs[0].add_run(); r.text = text; r.font.size = Pt(12); r.font.bold = True; r.font.color.rgb = RED; r.font.name = 'Calibri'
    tf.paragraphs[0].alignment = PP_ALIGN.CENTER


def bullets(s, x, y, w, items, size=11, step=330000):
    for it in items:
        m = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Emu(x), Emu(y + 95000), Emu(50000), Emu(50000))
        m.fill.solid(); m.fill.fore_color.rgb = RED; m.line.color.rgb = RED; m.shadow.inherit = False
        lines = max(1, int(len(it) * size * 5200 / w) + 1)
        tb(s, x + 120000, y, w - 120000, step * lines, it, size)
        y += int(step * (0.75 + 0.42 * lines))
    return y


def kpi(s, x, y, w, num, cap):
    b = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Emu(x), Emu(y), Emu(w), Emu(777240))
    b.fill.solid(); b.fill.fore_color.rgb = RGBColor(0xFA, 0xF6, 0xF6); b.line.color.rgb = RGBColor(0xE9, 0xDC, 0xDD); b.shadow.inherit = False
    tb(s, x, y + 60000, w, 420000, num, 22, RED, True, PP_ALIGN.CENTER)
    tb(s, x, y + 480000, w, 260000, cap, 9, GRAY, False, PP_ALIGN.CENTER)


def img(s, path, x, y, w, h):
    W_, H_ = Image.open(path).size
    sc = min(w / W_, h / H_)
    iw, ih = int(W_ * sc), int(H_ * sc)
    s.shapes.add_picture(path, Emu(x + (w - iw) // 2), Emu(y + (h - ih) // 2), Emu(iw), Emu(ih))


def notes(s, text):
    s.notes_slide.notes_text_frame.text = text


X0, Y0, FULLW = 566928, 1380744, 11064240
# ---------------- portada
for sh in cover.shapes:
    if sh.has_text_frame:
        t = sh.text_frame.text
        if t.strip() == 'Incremento 3': set_text(sh, 'Incremento 4')
        if 'Octubre de 2026' in t: set_text(sh, 'Santiago, Chile  —  Noviembre de 2026')
notes(cover, 'Presentación del cuarto y último incremento del Grupo 1: inventario y bodega.')

# ---------------- índice
s = new_slide('Índice', 'Flujo de la presentación · cierre del proyecto y traza del Incremento 4')
items = ['Introducción y contexto', 'Alcance del Incremento 4', 'Requerimientos y trazabilidad', 'CU-97 · Toma de inventario',
         'CU-98 y CU-99 · Proveedor y acta', 'Modelo físico con relaciones', 'Comportamiento · CU-97', 'Sistema en la VPS FiNet',
         'Árbol de navegación', 'Pruebas', 'Traza Scrum++ del Incremento 4', 'Avance acumulado del proyecto']
for i, t in enumerate(items):
    cx = 1545327 if i < 6 else 6429103
    cy = 1636780 + (i % 6) * 502920
    tb(s, cx, cy, 500000, 310800, f'{i + 1:02d}', 14, RED, True)
    tb(s, cx + 470000, cy, 4300000, 310800, t, 13, DARK)

# ---------------- introducción
s = new_slide('Introducción y contexto', 'El cierre del proyecto: control físico de la bodega y sistema en producción')
label(s, X0, Y0, 'PUNTO DE PARTIDA')
bullets(s, X0, Y0 + 450000, 5100000, [
    'Al cierre del Incremento 3 estaban implementados los 96 casos de uso del Documento 0.',
    'El sistema corría en Railway y en un entorno local; el despliegue productivo quedó para el Incremento 4.',
    'El docente pidió mostrar el trabajo incremental en la pila, la traza de la metodología y las relaciones del modelo físico.'])
label(s, 6263640, Y0, 'QUÉ AGREGA EL I4')
bullets(s, 6263640, Y0 + 450000, 5100000, [
    'Tres requerimientos nuevos: toma de inventario (RF-71), desactivar proveedor (RF-72) y acta PDF (RF-73).',
    'Sistema en la VPS FiNet, integrado con G3 y G8 y conectado a la base global de validación.',
    '45 claves foráneas nuevas: el modelo físico queda con 72 relaciones.'])
notes(s, 'Contexto: venimos de 96 de 96 CU. Este incremento suma 3 requerimientos pequeños y deja el sistema en producción.')

# ---------------- alcance
s = new_slide('Alcance del Incremento 4', '¿Qué comprende la entrega?')
label(s, X0, Y0, 'FUNCIONAL')
bullets(s, X0, Y0 + 450000, 5100000, [
    'CU-97 Registrando toma de inventario físico y ajuste de diferencias.',
    'CU-98 Desactivando proveedor (y reactivarlo).',
    'CU-99 Generando acta de toma de inventario en PDF.'])
label(s, 6263640, Y0, 'TÉCNICO')
bullets(s, 6263640, Y0 + 450000, 5100000, [
    'Despliegue con Docker rootless en la VPS y acceso por túnel SSH.',
    'Integraciones por HTTPS en el nginx del administrador (:8143).',
    'Base global finet_global_validacion y equivalencia de roles entre grupos.',
    'Claves foráneas faltantes en el script de migración.'])
for i, (n, c) in enumerate([('3', 'Casos de uso nuevos'), ('3', 'Requerimientos funcionales'), ('45', 'Claves foráneas nuevas'),
                            ('3,03%', 'Avance del incremento · 3 / 99'), ('100%', 'CU acumulado · 99 / 99')]):
    kpi(s, 746582 + i * 2150000, 4433969, 1950000, n, c)
notes(s, 'El denominador pasa de 96 a 99 casos de uso. El incremento aporta 3,03 % y deja el acumulado en 100 %.')

# ---------------- requerimientos
s = new_slide('Requerimientos y trazabilidad', 'Cada RF se sigue de extremo a extremo: usuario → requisito → caso de uso → diseño → código → prueba')
rows = [('UR 13.1', 'RF-71', 'CU-97', 'tomas-inventario', 'P97-N, P97-E1 · 17 unitarias'),
        ('UR 13.2', 'RF-72', 'CU-98', 'proveedores · ordenes-ingreso', 'P98-N, E1, E2, E3, R · 6 unitarias'),
        ('UR 13.1', 'RF-73', 'CU-99', 'tomas-inventario · pdf-reporte', 'P99-N, E1, E2 · 3 unitarias')]
heads = ['Usuario', 'Requisito', 'Caso de uso', 'Módulo', 'Pruebas']
ws = [1500000, 1500000, 1500000, 3000000, 3500000]
tbl = s.shapes.add_table(4, 5, Emu(X0), Emu(Y0 + 100000), Emu(sum(ws)), Emu(1800000)).table
for j, w in enumerate(ws): tbl.columns[j].width = Emu(w)
for i, row in enumerate([heads] + rows):
    for j, v in enumerate(row):
        c = tbl.cell(i, j); c.text = v
        f = c.text_frame.paragraphs[0].runs[0].font
        f.size = Pt(12); f.name = 'Calibri'; f.bold = i == 0
        f.color.rgb = RGBColor(0xFF, 0xFF, 0xFF) if i == 0 else DARK
        c.fill.solid(); c.fill.fore_color.rgb = RED if i == 0 else (RGBColor(0xFA, 0xF6, 0xF6) if i % 2 else RGBColor(0xFF, 0xFF, 0xFF))
tb(s, X0, 3700000, FULLW, 900000, 'Requerimientos de usuario nuevos: UR 13.1 «Control físico periódico del inventario de bodega» y '
   'UR 13.2 «Gestión de la vigencia de proveedores». Los tres casos reutilizan módulos de incrementos anteriores: stock (I1), '
   'órdenes de ingreso (I2) y generador PDF (I3).', 12)

# ---------------- CU-97
s = new_slide('CU-97 · Toma de inventario físico', 'RF-71 → CU-97: contar la bodega, comparar y ajustar las diferencias')
label(s, X0, Y0, 'FLUJO', 1200000)
bullets(s, X0, Y0 + 450000, 4600000, [
    'Se abre una toma por bodega: el sistema guarda lo esperado.',
    'Se registran cantidades y series; cada línea muestra COINCIDE, FALTANTE o SOBRANTE.',
    'Al confirmar, cada diferencia genera un movimiento AJUSTE_INVENTARIO.',
    'E1: una sola toma abierta por bodega (409).',
    'E3: si el stock cambió durante el conteo, se avisa antes de ajustar.'])
img(s, EV + 'CU97-conteo-abierta.png', 5500000, 1300000, 6200000, 4500000)
notes(s, 'CU-97 es el caso principal del incremento. Se muestra la pantalla de conteo con los resultados por línea.')

# ---------------- CU-98 / CU-99
s = new_slide('CU-98 y CU-99 · Proveedor y acta', 'RF-72 → CU-98 desactivar proveedor · RF-73 → CU-99 acta PDF de la toma')
label(s, X0, Y0, 'CU-98', 1200000)
bullets(s, X0, Y0 + 400000, 5100000, [
    'El proveedor inactivo conserva su historial y no entra en órdenes nuevas.',
    'No se desactiva con órdenes pendientes de recepción (409).'], 11)
img(s, EV + 'CU98-E2-ordenes-pendientes.png', X0, 2850000, 5200000, 3000000)
label(s, 6263640, Y0, 'CU-99', 1200000)
bullets(s, 6263640, Y0 + 400000, 5100000, [
    'Acta PDF de una toma confirmada, con el mismo generador de reportes de CU-93.',
    'Una toma abierta responde 409 y una de otra empresa 404.'], 11)
img(s, EV + 'CU99-acta-pdf.png', 6263640, 2850000, 5200000, 3000000)

# ---------------- modelo físico
s = new_slide('Modelo físico con relaciones', 'Respuesta a la observación del I3: 45 claves foráneas nuevas, 72 en total')
img(s, D4 + 'modelo-fisico-toma-proveedor.png', X0, 1250000, 6400000, 5000000)
label(s, 7300000, Y0, 'CAMBIOS', 1400000)
bullets(s, 7300000, Y0 + 450000, 4300000, [
    'Tablas nuevas toma_inventario y toma_inventario_detalle (violeta).',
    'Líneas violetas: claves foráneas agregadas en el I4.',
    'Se crean NOT VALID y luego se validan, sin romper bases antiguas.',
    'Sin FK a propósito: IDs externos de G3/G8 y auditoría del sistema.'])

# ---------------- comportamiento
s = new_slide('Comportamiento del sistema · CU-97', 'Diagrama de secuencia · flujo normal de la toma, desde la vista hasta la base de datos')
img(s, R + 'diagramas/diagramas-secuencia/CU97/CU97-normal.png', X0, 1250000, FULLW, 4900000)

# ---------------- VPS
s = new_slide('Sistema en la VPS FiNet', 'El sistema quedó en producción en el servidor del curso')
img(s, D4 + 'despliegue-vps.png', X0, 1250000, 5200000, 4900000)
label(s, 6263640, Y0, 'HITOS', 1200000)
bullets(s, 6263640, Y0 + 450000, 5200000, [
    '04-11 · compose y guía de despliegue (PR #76).',
    '05-11 · app con 4 contenedores sanos; integraciones por HTTPS en :8143.',
    '06-11 · opción de base global (PR #79, #80).',
    '08-11 · roles equivalentes y técnico del cierre (PR #82, #84, #87).',
    '08-11 · cambio a la base global finet_global_validacion.',
    'Acceso de usuarios por túnel SSH, según la política de la VPS.'])

# ---------------- árbol
s = new_slide('Árbol de navegación', 'Pantallas del sistema según el incremento en que se incorporan · violeta = Incremento 4')
img(s, R + 'diagramas/arbol-navegacion/arbol-navegacion-incremento4.png', 6600000, 1150000, 5000000, 5200000)
label(s, X0, Y0, 'INCREMENTO 4', 1600000)
bullets(s, X0, Y0 + 450000, 5600000, [
    'Toma de inventario: listado, detalle con conteo y descarga del acta.',
    'Proveedores: botones Desactivar y Reactivar con confirmación.',
    'Órdenes de ingreso: solo ofrece proveedores activos.',
    'Menú lateral: nueva entrada Toma de inventario.'])

# ---------------- pruebas
s = new_slide('Pruebas', 'Flujo normal y excepciones de cada caso, con evidencia en docs/incremento-4')
label(s, X0, Y0, 'API', 1200000)
bullets(s, X0, Y0 + 450000, 5100000, [
    'P97-N toma confirmada con ajustes (201) · P97-E1 toma abierta (409).',
    'P98-N desactivar (200) · E1 ya inactivo (409) · E2 órdenes pendientes (409) · E3 orden con inactivo (400).',
    'P99-N acta PDF (200) · E1 toma abierta (409) · E2 otra empresa (404).'])
label(s, 6263640, Y0, 'AUTOMATIZADAS', 1700000)
bullets(s, 6263640, Y0 + 450000, 5100000, [
    '26 pruebas unitarias de CU-97, CU-98 y CU-99.',
    'Suite completa del backend: 174 de 174 aprobadas.',
    'Migración probada en base nueva, base vacía y segunda ejecución.'])
for i, (n, c) in enumerate([('10/10', 'Escenarios API correctos'), ('26', 'Unitarias del incremento'), ('174', 'Suite completa'), ('72', 'FK validadas')]):
    kpi(s, 746582 + i * 2700000, 4433969, 2400000, n, c)

# ---------------- traza scrum
s = new_slide('Traza Scrum++ del Incremento 4', 'Pila incremental, sprint del 04-11 al 15-11 y métricas de avance')
label(s, X0, Y0, 'SCRUM++', 1300000)
bullets(s, X0, Y0 + 450000, 5000000, [
    'Product Backlog por incremento: I1 a I3 terminados, I4 con 15 elementos.',
    'Sprint Planning 04-11: primero VPS y CU-97, luego documentación.',
    'Daily: avance e impedimentos, la mayoría externos (permisos y red de la VPS).',
    'Cambio de alcance 09-11: RF-72 y RF-73 (+12 HH).',
    'Review sobre dev y la VPS; retrospectiva al cierre.'], 11)
img(s, D4 + 'graficos/burnup-sprint-i4.png', 6100000, 1150000, 5500000, 2550000)
img(s, D4 + 'graficos/burndown-sprint-i4.png', 6100000, 3750000, 5500000, 2550000)
for i, (n, c) in enumerate([('101 HH', 'Alcance del sprint'), ('70 HH', 'Completadas al 09-11')]):
    kpi(s, 746582 + i * 2400000, 5000000, 2200000, n, c)

# ---------------- avance acumulado
s = new_slide('Avance acumulado del proyecto', 'Casos de uso por incremento frente al mínimo exigido')
label(s, X0, Y0, 'ALCANCE DEL PROYECTO', 2300000)
bullets(s, X0, Y0 + 450000, 5000000, [
    'Denominador: 99 casos de uso (96 del Documento 0 + 3 del I4).',
    'Mínimos de la rúbrica: 30 %, 70 %, 95 % y 100 %.',
    'Cada entrega supera su mínimo; el I4 cierra en 100 %.'])
img(s, D4 + 'graficos/burnup-proyecto.png', 6100000, 1150000, 5500000, 2550000)
img(s, D4 + 'graficos/burndown-proyecto.png', 6100000, 3750000, 5500000, 2550000)
for i, (n, c) in enumerate([('46', 'Incremento 1 · 46,46 %'), ('77', 'Incremento 2 · 77,78 %'), ('96', 'Incremento 3 · 96,97 %'), ('99', 'Incremento 4 · 100 %')]):
    kpi(s, 746582 + (i % 2) * 2500000, 3600000 + (i // 2) * 950000, 2300000, n, c)

# ---------------- cierre (copia de la portada)
end = prs.slides.add_slide(cover.slide_layout)
for ph in list(end.placeholders):
    ph._element.getparent().remove(ph._element)
clone_shapes(cover, end)

# ---------------- quitar las diapositivas originales salvo la portada y reordenar
sldIdLst = prs.slides._sldIdLst
ids = list(sldIdLst)
for sid in ids[1:16]:
    rid = sid.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
    prs.part.drop_rel(rid)
    sldIdLst.remove(sid)
prs.save(OUT)
print('slides', len(prs.slides))
