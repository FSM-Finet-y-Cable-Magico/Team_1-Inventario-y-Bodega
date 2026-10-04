from pathlib import Path
import xml.etree.ElementTree as E
R=Path(__file__).resolve().parents[3]/'diagramas/incremento3';R.mkdir(exist_ok=True)
ns={'bpmn':'http://www.omg.org/spec/BPMN/20100524/MODEL','bpmndi':'http://www.omg.org/spec/BPMN/20100524/DI','dc':'http://www.omg.org/spec/DD/20100524/DC','di':'http://www.omg.org/spec/DD/20100524/DI'}
for k,v in ns.items():E.register_namespace(k,v)
def tag(k,n):return '{'+ns[k]+'}'+n
D=E.Element(tag('bpmn','definitions'),id='Def_Inc3',targetNamespace='https://finet.example/inventario/inc3',exporter='Grupo 1',exporterVersion='Incremento 3');P=E.SubElement(D,tag('bpmn','process'),id='Proceso_Final',name='Gestión operativa con inventario y terreno',isExecutable='false')
ls=E.SubElement(P,tag('bpmn','laneSet'),id='Carriles');lanes=['Coordinación e integración G3–T1','Inventario y bodega / T1','Técnico de terreno / G3','Administración / T1']
ln=[E.SubElement(ls,tag('bpmn','lane'),id=f'Lane{i}',name=n)for i,n in enumerate(lanes)]
# x, y, width, height preserve horizontal lanes and BPMN palette of Documento 0.
nodes=[('inicio','startEvent','OT disponible',0,105,120,32,32),('ot','userTask','Consultar cliente y OT\nCU-63/65/66/67 · G3',0,170,100,180,72),('asignar','userTask','Asignar equipos y consumibles\nCU-57/58 · I2',1,380,290,175,72),('jornada','userTask','Consultar jornada e inventario\nCU-61 · I3',2,585,480,175,72),('preparar','userTask','Preparar datos del trabajo\nCU-70 · I3',2,790,480,175,72),('cerrar','userTask','Confirmar instalación o reparación\nCU-63/69 · I3 / G3',2,995,480,185,72),('evento','serviceTask','Notificar cierre a T1\nWebhook G3',2,1220,480,165,72),('validar','serviceTask','Validar clave, empresa e idempotencia\nCU-64 · I3',1,1210,290,185,72),('repetido','exclusiveGateway','¿Ya procesado?',1,1440,300,50,50),('respuesta','serviceTask','Responder cierre previo\nSin duplicar movimientos',0,1440,100,175,72),('aplicar','serviceTask','Aplicar estados y consumos\nTransacción CU-64/68/69',1,1540,290,180,72),('discrepancia','exclusiveGateway','¿Discrepancias?',1,1765,300,50,50),('registrar','serviceTask','Registrar diferencia y alertas\nSin saldo negativo',0,1730,100,175,72),('resultado','serviceTask','Persistir resultado y responder\nSRV / cierre trazable',1,1870,290,180,72),('reporte','userTask','Consultar reportes y alertas\nCU-87/90/92/93/94/96',3,1860,670,190,72),('fin','endEvent','Cierre registrado',3,2100,690,32,32)]
# Routes use explicit waypoints; labels are business outcomes.
flows=[('inicio','ot','',[(137,136),(170,136)]),('ot','asignar','',[(350,136),(467,136),(467,290)]),('asignar','jornada','',[(555,326),(672,326),(672,480)]),('jornada','preparar','',[(760,516),(790,516)]),('preparar','cerrar','',[(965,516),(995,516)]),('cerrar','evento','',[(1180,516),(1220,516)]),('evento','validar','',[(1302,480),(1302,362)]),('validar','repetido','',[(1395,326),(1440,325)]),('repetido','respuesta','Sí',[(1465,300),(1465,172)]),('repetido','aplicar','No',[(1490,325),(1540,326)]),('respuesta','fin','',[(1615,136),(1640,136),(1640,75),(2160,75),(2160,706),(2132,706)]),('aplicar','discrepancia','',[(1720,326),(1765,325)]),('discrepancia','registrar','Sí',[(1790,300),(1790,172)]),('discrepancia','resultado','No',[(1815,325),(1870,326)]),('registrar','resultado','',[(1905,136),(1960,136),(1960,290)]),('resultado','reporte','',[(1960,362),(1960,670)]),('reporte','fin','',[(2050,706),(2100,706)])]
for id,kind,name,l,x,y,w,h in nodes:
 el=E.SubElement(P,tag('bpmn',kind),id=id,name=name.replace('\n',' — '));E.SubElement(ln[l],tag('bpmn','flowNodeRef')).text=id
 for i,(a,b,_,_)in enumerate(flows):
  if b==id:E.SubElement(el,tag('bpmn','incoming')).text=f'F{i}'
  if a==id:E.SubElement(el,tag('bpmn','outgoing')).text=f'F{i}'
for i,(a,b,label,pts)in enumerate(flows):E.SubElement(P,tag('bpmn','sequenceFlow'),id=f'F{i}',sourceRef=a,targetRef=b,name=label)
collab=E.SubElement(D,tag('bpmn','collaboration'),id='Colab');E.SubElement(collab,tag('bpmn','participant'),id='Pool',name='Finet y Cable Mágico — proceso soportado por el sistema',processRef='Proceso_Final')
diagram=E.SubElement(D,tag('bpmndi','BPMNDiagram'),id='Diagrama');plane=E.SubElement(diagram,tag('bpmndi','BPMNPlane'),id='Plano',bpmnElement='Colab')
def shape(id,x,y,w,h):
 sh=E.SubElement(plane,tag('bpmndi','BPMNShape'),id='DI_'+id,bpmnElement=id);E.SubElement(sh,tag('dc','Bounds'),x=str(x),y=str(y),width=str(w),height=str(h))
shape('Pool',20,50,2190,760)
for i in range(4):shape(f'Lane{i}',50,50+190*i,2160,190)
for id,k,n,l,x,y,w,h in nodes:shape(id,x,y,w,h)
for i,(a,b,label,pts)in enumerate(flows):
 ed=E.SubElement(plane,tag('bpmndi','BPMNEdge'),id=f'DI_F{i}',bpmnElement=f'F{i}')
 for x,y in pts:E.SubElement(ed,tag('di','waypoint'),x=str(x),y=str(y))
E.ElementTree(D).write(R/'proceso-final-incremento3.bpmn',encoding='utf-8',xml_declaration=True)
F=E.Element('mxfile',host='app.diagrams.net');di=E.SubElement(F,'diagram',id='BPMN-I3',name='Proceso final');m=E.SubElement(di,'mxGraphModel',page='0');root=E.SubElement(m,'root');E.SubElement(root,'mxCell',id='0');E.SubElement(root,'mxCell',id='1',parent='0')
def cell(id,value,style,x,y,w,h):
 c=E.SubElement(root,'mxCell',id=id,value=value,style=style,vertex='1',parent='1');E.SubElement(c,'mxGeometry',x=str(x),y=str(y),width=str(w),height=str(h),attrib={'as':'geometry'})
cell('title','Gestión operativa con el sistema del Incremento 3','text;align=center;fontFamily=Arial;fontSize=20;fontStyle=1;',20,5,2190,35)
for i,label in enumerate(lanes):
 cell(f'L{i}','', 'fillColor=#FFFFFF;strokeColor=#808080;',20,50+i*190,2190,190)
 cell(f'LT{i}',label,'text;rotation=-90;fontFamily=Arial;fontSize=13;',-50,125+i*190,175,35)
for id,kind,name,l,x,y,w,h in nodes:
 st='fontFamily=Arial;fontSize=13;whiteSpace=wrap;align=center;verticalAlign=middle;'
 if kind=='startEvent':st+='ellipse;fillColor=#E6FF99;strokeColor=#70AD20;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;'
 elif kind=='endEvent':st+='ellipse;fillColor=#F6B6B6;strokeColor=#B40000;strokeWidth=3;verticalLabelPosition=bottom;verticalAlign=top;'
 elif kind=='exclusiveGateway':st+='rhombus;fillColor=#FFFFD0;strokeColor=#A6AD24;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;'
 else:st+='rounded=1;arcSize=10;fillColor=#EEF0FF;strokeColor=#007CB4;strokeWidth=2;'
 cell(id,name,st,x,y,w,h)
for i,(a,b,label,pts)in enumerate(flows):
 c=E.SubElement(root,'mxCell',id=f'F{i}',value=label,edge='1',parent='1',style='endArrow=block;endFill=1;rounded=1;strokeColor=#333333;fontFamily=Arial;fontSize=12;')
 g=E.SubElement(c,'mxGeometry',relative='1',attrib={'as':'geometry'})
 E.SubElement(g,'mxPoint',x=str(pts[0][0]),y=str(pts[0][1]),attrib={'as':'sourcePoint'});E.SubElement(g,'mxPoint',x=str(pts[-1][0]),y=str(pts[-1][1]),attrib={'as':'targetPoint'})
 ar=E.SubElement(g,'Array',attrib={'as':'points'})
 for x,y in pts[1:-1]:E.SubElement(ar,'mxPoint',x=str(x),y=str(y))
E.ElementTree(F).write(R/'proceso-final-incremento3.drawio',encoding='utf-8',xml_declaration=True)
print('BPMN y Draw.io generados')
