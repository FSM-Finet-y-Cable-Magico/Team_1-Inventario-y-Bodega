# Construye un informe .docx a partir de la plantilla del I3 v2 (portada, estilos, índices).
import copy, re
import docx
from docx.oxml.ns import qn
from docx.text.paragraph import Paragraph
from PIL import Image

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
XML_SPACE = '{http://www.w3.org/XML/1998/namespace}space'
FUENTE = 'Fuente: Elaborado por los estudiantes de acuerdo con el proyecto, 2026.'


def _set_text(p_el, text):
    """Deja el texto en el primer run con w:t y vacía los demás."""
    runs = p_el.findall('.//' + W + 'r')
    first = None
    for r in runs:
        t = r.find(W + 't')
        if t is not None and first is None:
            first = r
        elif t is not None:
            r.getparent().remove(r)
    if first is None:
        r = runs[0]
        t = r.makeelement(W + 't', {})
        r.append(t)
        first = r
    for br in first.findall(W + 'br'):
        first.remove(br)
    for extra in first.findall(W + 't')[1:]:
        first.remove(extra)
    t = first.find(W + 't')
    parts = text.split('\n')
    t.text = parts[0]
    t.set(XML_SPACE, 'preserve')
    last = t
    for part in parts[1:]:
        br = first.makeelement(W + 'br', {})
        last.addnext(br)
        nt = first.makeelement(W + 't', {})
        nt.text = part
        nt.set(XML_SPACE, 'preserve')
        br.addnext(nt)
        last = nt


class Informe:
    def __init__(self, plantilla, incremento):
        self.d = docx.Document(plantilla)
        body = self.d.element.body
        ch = list(body)
        P = lambda e: Paragraph(e, self.d)
        txt = [P(e).text if e.tag == W + 'p' else None for e in ch]
        i_cont = txt.index('ÍNDICE DE CONTENIDOS')
        i_fig = txt.index('ÍNDICE DE FIGURAS')
        i_tab = txt.index('ÍNDICE DE TABLAS')
        i_body = next(i for i, e in enumerate(ch) if txt[i] == '1. INTRODUCCIÓN' and e.tag == W + 'p'
                      and P(e).style.name.startswith('Heading'))
        st = lambda i: P(ch[i]).style.name
        self.proto = {
            'h1': ch[i_body], 'normal': ch[i_body + 1],
        }
        # prototipos del cuerpo
        def find(cond, start=i_body):
            return next(ch[i] for i in range(start, len(ch)) if cond(i))
        self.proto['h2'] = find(lambda i: ch[i].tag == W + 'p' and st(i) == 'Heading 2')
        self.proto['h3'] = find(lambda i: ch[i].tag == W + 'p' and st(i) == 'Heading 3')
        self.proto['capT'] = find(lambda i: ch[i].tag == W + 'p' and st(i) == 'Leyenda tabla')
        self.proto['capF'] = find(lambda i: ch[i].tag == W + 'p' and st(i) == 'Leyenda figura')
        k = ch.index(self.proto['capF'])
        self.proto['img'] = ch[k - 1]
        self.proto['fuente'] = ch[k + 1]
        self.proto['tbl'] = find(lambda i: ch[i].tag == W + 'tbl')
        # entradas de índice: una "interior" de cada estilo
        def entry(style, a, b):
            for i in range(a + 2, b - 1):
                if ch[i].tag == W + 'p' and st(i) == style and ch[i].find(W + 'hyperlink') is not None \
                        and ch[i].find(W + 'pPr/' + W + 'sectPr') is None:
                    ins = ''.join(x.text or '' for x in ch[i].iter(W + 'instrText'))
                    if 'TOC' not in ins.replace('PAGEREF', ''):
                        return ch[i]
        self.proto['toc 1'] = entry('toc 1', i_cont, i_fig)
        self.proto['toc 2'] = entry('toc 2', i_cont, i_fig)
        self.proto['toc 3'] = entry('toc 3', i_cont, i_fig)
        self.proto['tof'] = entry('table of figures', i_fig, i_tab)
        # campos TOC (run begin/instr/separate) de la primera entrada de cada índice
        self.field_runs = {}
        for key, i in (('cont', i_cont), ('fig', i_fig), ('tab', i_tab)):
            first = ch[i + 1]
            self.field_runs[key] = [copy.deepcopy(r) for r in first.findall(W + 'r')[:3]]
        last_tab = ch[i_body - 1]
        self.end_run = copy.deepcopy(last_tab.findall(W + 'r')[-1])
        self.sect_idx = copy.deepcopy(last_tab.find(W + 'pPr/' + W + 'sectPr'))
        self.heads = {k: ch[i] for k, i in (('cont', i_cont), ('fig', i_fig), ('tab', i_tab))}
        for key in list(self.proto):
            if self.proto[key] is not None:
                self.proto[key] = copy.deepcopy(self.proto[key])
        self.final_sect = ch[-1]
        # borrar desde los índices hasta el final (salvo sectPr final)
        for e in ch[i_cont:-1]:
            if e not in self.heads.values():
                body.remove(e)
        self.body = body
        self.cursor = self.heads['tab']  # el cuerpo se agrega después del índice de tablas
        self.body_anchor = None
        self.chap = 0; self.sec = 0; self.ntab = 0; self.nfig = 0
        self.entries = {'cont': [], 'fig': [], 'tab': []}
        self.bm = 5000
        self.docpr = 20000
        self.incremento = incremento
        self.pending_intro = None
        self.anchor = self.heads['tab']
        self.items = []  # orden del cuerpo

    # ---------------- utilidades
    def _add(self, el):
        self.items.append(el)
        return el

    def _bookmark(self, p_el):
        self.bm += 1
        name = f'_Toc{self.bm}'
        bs = p_el.find(W + 'bookmarkStart')
        be = p_el.find(W + 'bookmarkEnd')
        if bs is not None:
            bs.set(W + 'id', str(self.bm)); bs.set(W + 'name', name)
            be.set(W + 'id', str(self.bm))
        return name

    # ---------------- bloques
    def h1(self, text):
        self.chap += 1; self.sec = 0; self.ntab = 0; self.nfig = 0
        label = f'{self.chap}. {text}'
        el = copy.deepcopy(self.proto['h1']); _set_text(el, label)
        self.entries['cont'].append(('toc 1', label, self._bookmark(el)))
        self._add(el)

    def h2(self, text):
        self.sec += 1
        label = f'{self.chap}.{self.sec} {text}'
        el = copy.deepcopy(self.proto['h2']); _set_text(el, label)
        self.entries['cont'].append(('toc 2', label, self._bookmark(el)))
        self._add(el)

    def h3(self, text, indice=True):
        el = copy.deepcopy(self.proto['h3']); _set_text(el, text)
        name = self._bookmark(el)
        if indice:
            self.entries['cont'].append(('toc 3', text, name))
        self._add(el)

    def p(self, text):
        el = copy.deepcopy(self.proto['normal']); _set_text(el, text)
        self._add(el)

    def bold_lead(self, lead, text):
        el = copy.deepcopy(self.proto['normal']); _set_text(el, text)
        r = el.find('.//' + W + 'r')
        nr = copy.deepcopy(r)
        rpr = nr.find(W + 'rPr')
        b = rpr.makeelement(W + 'b', {W + 'val': '1'}); rpr.insert(0, b)
        nr.find(W + 't').text = lead + ' '
        r.addprevious(nr)
        self._add(el)

    def next_tab(self):
        return f'{self.chap}.{self.ntab + 1}'

    def next_fig(self):
        return f'{self.chap}.{self.nfig + 1}'

    def table(self, titulo, headers, rows, widths=None, intro=None, fuente=FUENTE, bold_first=False):
        num = self.next_tab()
        ART = {'actores': 'los', 'alcance': 'el', 'aportes': 'los', 'atributos': 'los', 'cambios': 'los', 'caso': 'el', 'casos': 'los',
               'claves': 'las', 'configuración': 'la', 'decisiones': 'las', 'definición': 'la', 'diccionario': 'el', 'especificación': 'la',
               'evolución': 'la', 'ficha': 'la', 'formas': 'las', 'hitos': 'los', 'mapa': 'el', 'matriz': 'la', 'observaciones': 'las',
               'pila': 'la', 'procedencia': 'la', 'pruebas': 'las', 'registro': 'el', 'resultado': 'el', 'resultados': 'los',
               'retrospectiva': 'la', 'seguimiento': 'el', 'sprint': 'el', 'tablas': 'las', 'traza': 'la'}
        t0 = titulo[0].lower() + titulo[1:]
        art = ART.get(t0.split()[0], '')
        self.p(intro.format(n=num) if intro else f'La tabla {num} presenta {(art + " ") if art else ""}{t0}.')
        self.ntab += 1
        proto = self.proto['tbl']
        tbl = copy.deepcopy(proto)
        trs = tbl.findall(W + 'tr')
        h_tc = copy.deepcopy(trs[0].findall(W + 'tc')[0])
        d_tc = copy.deepcopy(trs[1].findall(W + 'tc')[0])
        h_trpr = copy.deepcopy(trs[0].find(W + 'trPr'))
        for tr in trs:
            tbl.remove(tr)
        n = len(headers)
        total = 9405
        if widths is None:
            widths = [1] * n
        s = sum(widths)
        ws = [int(total * w / s) for w in widths]
        grid = tbl.find(W + 'tblGrid')
        for g in list(grid):
            grid.remove(g)
        for w in ws:
            grid.append(grid.makeelement(W + 'gridCol', {W + 'w': str(w)}))

        def mk_row(cells, header):
            tr = tbl.makeelement(W + 'tr', {})
            if header:
                tr.append(copy.deepcopy(h_trpr))
            else:
                trpr = tr.makeelement(W + 'trPr', {}); trpr.append(trpr.makeelement(W + 'cantSplit', {W + 'val': '1'}))
                tr.append(trpr)
            for j, (c, w) in enumerate(zip(cells, ws)):
                tc = copy.deepcopy(h_tc if header else d_tc)
                tcpr = tc.find(W + 'tcPr')
                for x in tcpr.findall(W + 'tcW'):
                    tcpr.remove(x)
                tcpr.insert(0, tcpr.makeelement(W + 'tcW', {W + 'w': str(w), W + 'type': 'dxa'}))
                _set_text(tc.find(W + 'p'), str(c))
                if not header and bold_first and j == 0:
                    rpr = tc.find('.//' + W + 'r/' + W + 'rPr')
                    b = rpr.find(W + 'b')
                    if b is not None:
                        b.set(W + 'val', '1')
                tr.append(tc)
            tbl.append(tr)
        mk_row(headers, True)
        for r in rows:
            mk_row(r, False)
        self._add(tbl)
        cap = copy.deepcopy(self.proto['capT'])
        label = f'Tabla {num}. {titulo}'
        _set_text(cap, label)
        self.entries['tab'].append(('tof', label, self._bookmark(cap)))
        self._add(cap)
        f = copy.deepcopy(self.proto['fuente']); _set_text(f, fuente); self._add(f)
        return num

    def kv(self, titulo, pairs, intro=None, fuente=FUENTE, head=('Campo', 'Contenido')):
        return self.table(titulo, list(head), pairs, widths=[1, 2.6], intro=intro, fuente=fuente, bold_first=True)

    def figure(self, titulo, path, intro, width_cm=16.0, max_h_cm=21.0, fuente=FUENTE):
        num = self.next_fig()
        if intro:
            self.p(intro.format(n=num))
        self.nfig += 1
        rid, _ = self.d.part.get_or_add_image(path)
        w, h = Image.open(path).size
        cw = width_cm
        ch_ = cw * h / w
        if ch_ > max_h_cm:
            ch_ = max_h_cm; cw = ch_ * w / h
        cx, cy = int(cw * 360000), int(ch_ * 360000)
        el = copy.deepcopy(self.proto['img'])
        for e in el.iter():
            if e.tag.endswith('}extent') or e.tag.endswith('}ext'):
                if e.get('cx'):
                    e.set('cx', str(cx)); e.set('cy', str(cy))
            if e.tag.endswith('}blip'):
                e.set(qn('r:embed'), rid)
            if e.tag.endswith('}docPr'):
                self.docpr += 1
                e.set('id', str(self.docpr)); e.set('name', f'img{self.docpr}.png')
        self._add(el)
        cap = copy.deepcopy(self.proto['capF'])
        label = f'Figura {num}. {titulo}'
        _set_text(cap, label)
        self.entries['fig'].append(('tof', label, self._bookmark(cap)))
        self._add(cap)
        f = copy.deepcopy(self.proto['fuente']); _set_text(f, fuente); self._add(f)
        return num

    # ---------------- índices y guardado
    def _entry(self, style, label, bm, page):
        el = copy.deepcopy(self.proto[style])
        hl = el.find(W + 'hyperlink')
        hl.set(W + 'anchor', bm)
        ts = hl.findall('.//' + W + 't')
        ts[0].text = label; ts[0].set(XML_SPACE, 'preserve')
        ts[-1].text = str(page)
        for ins in hl.iter(W + 'instrText'):
            if 'PAGEREF' in (ins.text or ''):
                ins.text = f' PAGEREF {bm} \\h '
        # quitar runs fuera del hipervínculo (campos)
        for r in el.findall(W + 'r'):
            el.remove(r)
        return el

    def build(self, pages=None):
        pages = pages or {}
        anchor = None
        for key in ('cont', 'fig', 'tab'):
            head = self.heads[key]
            last = head
            ents = self.entries[key]
            for k, (style, label, bm) in enumerate(ents):
                el = self._entry(style, label, bm, pages.get(label, 0))
                if k == 0:
                    for r in reversed(self.field_runs[key]):
                        el.find(W + 'pPr').addnext(copy.deepcopy(r))
                if k == len(ents) - 1:
                    el.append(copy.deepcopy(self.end_run))
                last.addnext(el); last = el
            anchor = last
        anchor.find(W + 'pPr').append(copy.deepcopy(self.sect_idx))
        for el in self.items:
            anchor.addnext(el); anchor = el
        # portada y encabezado
        for p in self.d.paragraphs[:21]:
            if p.text.strip() == 'INCREMENTO N° 3':
                _set_text(p._p, f'INCREMENTO N° {self.incremento}')
        for s in self.d.sections:
            for part in (s.header, s.first_page_header, s.even_page_header):
                for p in part.paragraphs:
                    for r in p.runs:
                        if 'Incremento 3' in r.text:
                            r.text = r.text.replace('Incremento 3', f'Incremento {self.incremento}')

    def save(self, path):
        part = self.d.part
        used = {e.get(qn('r:embed')) for e in part.element.iter() if e.get(qn('r:embed'))}
        used |= {e.get(qn('r:id')) for e in part.element.iter() if e.get(qn('r:id'))}
        for rid, rel in list(part.rels.items()):
            if rel.reltype.endswith('/image') and rid not in used:
                part.drop_rel(rid)
        self.d.save(path)


def paginas(pdf, labels):
    """Devuelve {label: página impresa} buscando cada título en el PDF (cuerpo con numeración arábiga)."""
    import subprocess
    n = int(re.search(r'Pages:\s+(\d+)', subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout).group(1))
    norm = lambda s: re.sub(r'\s+', '', s)
    texts = []
    for i in range(1, n + 1):
        t = subprocess.run(['pdftotext', '-f', str(i), '-l', str(i), '-layout', pdf, '-'], capture_output=True, text=True).stdout
        texts.append(t)
    # inicio del cuerpo: primera página que contiene '1. INTRODUCCIÓN' y no tiene líneas de puntos de índice
    start = next(i for i, t in enumerate(texts) if '1. INTRODUCCIÓN' in t and '....' not in t)
    out = {}
    cur = start
    for lab in labels:
        key = norm(lab)[:60]
        for i in range(cur, n):
            if key in norm(texts[i]):
                out[lab] = i - start + 1; cur = i; break
    return out, n, start
