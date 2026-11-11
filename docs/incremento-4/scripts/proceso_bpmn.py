# Genera el proceso final del sistema (Incremento 4) en BPMN 2.0, importable en Bizagi Modeler.
# Uso: python3 proceso_bpmn.py SALIDA.bpmn
import sys
from xml.sax.saxutils import escape

LANES = ['Administrador', 'Encargado de bodega', 'Técnico de terreno', 'Sistema de Inventario y Bodega (T1)', 'Sistema de terreno (G3)']
LH = [210, 150, 150, 150, 150]
X0, COL = 200, 150
N = [  # id, tipo, nombre, carril, columna, dy
    ('s1', 'start', 'Se requieren equipos', 0, 0, 30),
    ('t1', 'task', 'Revisar vigencia del proveedor', 0, 1, 30),
    ('g1', 'xor', '¿Proveedor activo?', 0, 2, 30),
    ('t3', 'task', 'Reactivar o elegir otro proveedor (CU-98)', 0, 3, -45),
    ('t2', 'task', 'Registrar orden de ingreso', 0, 4, 30),
    ('t4', 'task', 'Validar proveedor activo y crear la orden', 3, 5, 0),
    ('t5', 'task', 'Recibir equipos', 1, 6, 0),
    ('t6', 'task', 'Registrar unidades y stock', 3, 7, 0),
    ('t7', 'task', 'Asignar equipos y consumibles al técnico', 1, 8, 0),
    ('t8', 'task', 'Instalar o reparar en terreno', 2, 9, 0),
    ('t9', 'task', 'Confirmar cierre de la orden de trabajo', 4, 10, 0),
    ('t10', 'task', 'Aplicar cierre: estados, consumos y SRV', 3, 11, 0),
    ('i1', 'timer', 'Periodo de control', 1, 12, 0),
    ('t11', 'task', 'Abrir toma de inventario (CU-97)', 1, 13, 0),
    ('t12', 'task', 'Guardar lo esperado de la bodega', 3, 14, 0),
    ('t13', 'task', 'Contar consumibles y leer series', 1, 15, 0),
    ('g2', 'xor', '¿Hay diferencias?', 3, 16, 0),
    ('t14', 'task', 'Ajustar stock con movimientos de ajuste', 3, 17, 0),
    ('t15', 'task', 'Generar acta PDF (CU-99)', 3, 18, 0),
    ('t16', 'task', 'Firmar y archivar el acta', 1, 19, 0),
    ('t17', 'task', 'Desactivar proveedores sin uso (CU-98)', 0, 20, 30),
    ('e1', 'end', 'Inventario cuadrado y proveedores vigentes', 0, 21, 30),
]
E = [('s1', 't1', ''), ('t1', 'g1', ''), ('g1', 't3', 'No'), ('g1', 't2', 'Sí'), ('t3', 't2', ''), ('t2', 't4', ''),
     ('t4', 't5', ''), ('t5', 't6', ''), ('t6', 't7', ''), ('t7', 't8', ''), ('t8', 't9', ''), ('t9', 't10', 'Webhook'),
     ('t10', 'i1', ''), ('i1', 't11', ''), ('t11', 't12', ''), ('t12', 't13', ''), ('t13', 'g2', ''),
     ('g2', 't14', 'Sí'), ('g2', 't15', 'No'), ('t14', 't15', ''), ('t15', 't16', ''), ('t16', 't17', ''), ('t17', 'e1', '')]

lane_top = []
y = 80
for h in LH:
    lane_top.append(y); y += h
H_TOTAL = y - 80
W_TOTAL = X0 + COL * (max(n[4] for n in N) + 1) - 100
SIZE = {'task': (110, 70), 'xor': (50, 50), 'start': (36, 36), 'end': (36, 36), 'timer': (36, 36)}
geo = {}
for nid, t, name, lane, col, dy in N:
    w, h = SIZE[t]
    cx = X0 + col * COL
    cy = lane_top[lane] + LH[lane] / 2 + dy
    geo[nid] = (cx - w / 2, cy - h / 2, w, h)

P = []
P.append('<?xml version="1.0" encoding="UTF-8"?>')
P.append('<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" '
         'xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" '
         'id="Def_I4" targetNamespace="http://finet.cl/inventario/bpmn" exporter="Grupo 1" exporterVersion="1.0">')
P.append('<collaboration id="Colab_I4"><participant id="Pool_I4" name="Proceso operativo final de inventario y bodega (Incremento 4)" processRef="Proc_I4"/></collaboration>')
P.append('<process id="Proc_I4" name="Proceso operativo final" isExecutable="false"><laneSet id="LS">')
for i, ln in enumerate(LANES):
    P.append(f'<lane id="Lane_{i}" name="{escape(ln)}">' + ''.join(f'<flowNodeRef>{n[0]}</flowNodeRef>' for n in N if n[3] == i) + '</lane>')
P.append('</laneSet>')
inc = {n[0]: [] for n in N}; out = {n[0]: [] for n in N}
for k, (a, b, _) in enumerate(E):
    out[a].append(f'f{k}'); inc[b].append(f'f{k}')
TAG = {'task': 'task', 'xor': 'exclusiveGateway', 'start': 'startEvent', 'end': 'endEvent', 'timer': 'intermediateCatchEvent'}
for nid, t, name, *_ in N:
    body = ''.join(f'<incoming>{x}</incoming>' for x in inc[nid]) + ''.join(f'<outgoing>{x}</outgoing>' for x in out[nid])
    if t == 'timer':
        body += f'<timerEventDefinition id="TD_{nid}"/>'
    P.append(f'<{TAG[t]} id="{nid}" name="{escape(name)}">{body}</{TAG[t]}>')
for k, (a, b, lab) in enumerate(E):
    P.append(f'<sequenceFlow id="f{k}" sourceRef="{a}" targetRef="{b}"' + (f' name="{lab}"' if lab else '') + '/>')
P.append('</process>')
P.append('<bpmndi:BPMNDiagram id="Diag_I4"><bpmndi:BPMNPlane id="Plane_I4" bpmnElement="Colab_I4">')
P.append(f'<bpmndi:BPMNShape id="Pool_di" bpmnElement="Pool_I4" isHorizontal="true"><dc:Bounds x="40" y="80" width="{W_TOTAL}" height="{H_TOTAL}"/></bpmndi:BPMNShape>')
for i in range(len(LANES)):
    P.append(f'<bpmndi:BPMNShape id="Lane_{i}_di" bpmnElement="Lane_{i}" isHorizontal="true"><dc:Bounds x="70" y="{lane_top[i]}" width="{W_TOTAL - 30}" height="{LH[i]}"/></bpmndi:BPMNShape>')
for nid, t, *_ in N:
    x, y_, w, h = geo[nid]
    extra = ' isMarkerVisible="true"' if t == 'xor' else ''
    lab = f'<bpmndi:BPMNLabel><dc:Bounds x="{x - 30}" y="{y_ + h + 4}" width="{w + 60}" height="28"/></bpmndi:BPMNLabel>' if t != 'task' else ''
    P.append(f'<bpmndi:BPMNShape id="{nid}_di" bpmnElement="{nid}"{extra}><dc:Bounds x="{x}" y="{y_}" width="{w}" height="{h}"/>{lab}</bpmndi:BPMNShape>')
for k, (a, b, lab) in enumerate(E):
    ax, ay, aw, ah = geo[a]; bx, by, bw, bh = geo[b]
    sx, sy = ax + aw, ay + ah / 2
    tx, ty = bx, by + bh / 2
    if a == 'g2' and b == 't15':
        pts = [(ax + aw / 2, ay + ah), (ax + aw / 2, ay + ah + 30), (bx + bw / 2, ay + ah + 30), (bx + bw / 2, by + bh)]
    elif abs(sy - ty) < 1:
        pts = [(sx, sy), (tx, ty)]
    elif a == 'g1' and b == 't3':
        pts = [(ax + aw / 2, ay), (ax + aw / 2, ty), (tx, ty)]
    elif a == 't3':
        pts = [(sx, sy), (bx + bw / 2, sy), (bx + bw / 2, by)]
    else:
        mx = (sx + tx) / 2
        pts = [(sx, sy), (mx, sy), (mx, ty), (tx, ty)]
    wp = ''.join(f'<di:waypoint x="{px}" y="{py}"/>' for px, py in pts)
    P.append(f'<bpmndi:BPMNEdge id="f{k}_di" bpmnElement="f{k}">{wp}</bpmndi:BPMNEdge>')
P.append('</bpmndi:BPMNPlane></bpmndi:BPMNDiagram></definitions>')
open(sys.argv[1], 'w', encoding='utf-8').write('\n'.join(P))
print('ok', len(N), 'nodos', len(E), 'flujos')
