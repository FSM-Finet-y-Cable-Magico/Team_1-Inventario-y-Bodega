import subprocess, json, html
Q=lambda q: subprocess.run(['psql','-h','127.0.0.1','-p','5544','-U','postgres','-d','inv2','-AtF','\t','-c',q],capture_output=True,text=True).stdout.strip().split('\n')
cols={}
for l in Q("select table_name,column_name,data_type,is_nullable,coalesce(character_maximum_length::text,'') from information_schema.columns where table_schema='public' order by table_name,ordinal_position"):
    p=l.split('\t');p+=['']*(5-len(p));t,c,dt,n,ml=p[:5]; cols.setdefault(t,[]).append((c,dt,n,ml))
pk=set(tuple(l.split('\t')) for l in Q("select k.table_name,k.column_name from information_schema.table_constraints tc join information_schema.key_column_usage k on k.constraint_name=tc.constraint_name and k.table_name=tc.table_name where tc.constraint_type='PRIMARY KEY' and tc.table_schema='public'"))
fks=[tuple(l.split('\t')) for l in Q("select cl.relname, a.attname, cf.relname, af.attname, c.conname from pg_constraint c join pg_class cl on cl.oid=c.conrelid join pg_class cf on cf.oid=c.confrelid join pg_attribute a on a.attrelid=c.conrelid and a.attnum=c.conkey[1] join pg_attribute af on af.attrelid=c.confrelid and af.attnum=c.confkey[1] where c.contype='f'")]
json.dump({'cols':cols,'pk':sorted(pk),'fks':fks},open('/tmp/esquema-i4.json','w'),ensure_ascii=False,indent=1)
I1='empresa rol usuario usuario_rol log_auditoria tipo_equipo unidad_equipo historial_estado_equipo bodega stock_consumible transferencia_equipo movimiento_inventario'.split()
I2='proveedor proveedor_tipo_equipo orden_ingreso orden_ingreso_detalle salida_bodega salida_detalle inventario_personal_tecnico solicitud_baja donacion donacion_detalle prestamo_externo prestamo_detalle prestamo_retorno integracion_cierre'.split()
I3='cierre_reparacion borrador_cierre secuencia_srv notificacion integracion_activacion asignacion_equipo_servicio'.split()
I4='toma_inventario toma_inventario_detalle'.split()
COL={**{t:'#BDD7EF' for t in I1},**{t:'#C7E1B5' for t in I2},**{t:'#FFD99A' for t in I3},**{t:'#D9CCF5' for t in I4}}
newfk=set(f[4] for f in fks if f[4].startswith('fk_') and f[4].count('_')>=2)
print(len(cols), 'tablas', len(fks),'fk', [t for t in cols if t not in COL])
def typ(dt,ml):
    m={'integer':'int','character varying':'varchar','timestamp with time zone':'timestamptz','timestamp without time zone':'timestamp','boolean':'bool','numeric':'numeric','text':'text','jsonb':'jsonb','date':'date','inet':'inet'}
    s=m.get(dt,dt); return s+(f'({ml})' if ml and s=='varchar' else '')
def dot(name, tables, full, title, edgesel=None):
    fkcols={(f[0],f[1]) for f in fks}
    out=[f'digraph G {{ graph [rankdir=LR, splines=true, nodesep=0.5, ranksep=1.6, fontname="Helvetica", label="{title}", labelloc=t, fontsize=20, pad=0.3]; node [shape=plain, fontname="Helvetica", fontsize=10]; edge [arrowhead=crow, arrowtail=none, color="#3A3A3A", penwidth=1.1];']
    for t in tables:
        rows=[]
        for c,dt,n,ml in cols[t]:
            k=(t,c) in pk; f=(t,c) in fkcols
            if not full and not (k or f): continue
            tag=('PK ' if k else '')+('FK' if f else '')
            nm=f'<B>{c}</B>' if k else c
            rows.append(f'<TR><TD ALIGN="LEFT" PORT="{c}">{nm}</TD><TD ALIGN="LEFT"><FONT COLOR="#555555">{typ(dt,ml)}{"" if n=="YES" else " NN"}</FONT></TD><TD ALIGN="LEFT">{(chr(60)+"FONT COLOR=\"#9B1B2E\""+chr(62)+tag+chr(60)+"/FONT"+chr(62)) if tag else " "}</TD></TR>')
        if not full and len(rows)==0: rows.append('<TR><TD COLSPAN="3"> </TD></TR>')
        out.append(f'"{t}" [label=<<TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="3" BGCOLOR="white"><TR><TD COLSPAN="3" BGCOLOR="{COL.get(t,"#EEEEEE")}"><B>{t}</B></TD></TR>{"".join(rows)}</TABLE>>];')
    for (t,c,rt,rc,cn) in fks:
        if t in tables and rt in tables and (edgesel is None or edgesel(t,rt)):
            col='#6A4FB3' if cn in NEWFK else '#3A3A3A'
            out.append(f'"{rt}":"{rc}":e -> "{t}":"{c}":w [color="{col}"];')
    out.append('}')
    open(name+'.dot','w').write('\n'.join(out))
    for fmt in ('png','svg'):
        subprocess.run(['dot','-T'+fmt,'-Gdpi=130' if fmt=='png' else '-Gdpi=72',name+'.dot','-o',f'{name}.{fmt}'],check=True)
NEWFK=set(json.load(open('/tmp/fk-nuevas.json')))
allt=I1+I2+I3+I4
dot('modelo-fisico-general', allt, False, 'Modelo físico general con relaciones (34 tablas) — azul I1 · verde I2 · ámbar I3 · violeta I4 · líneas violetas: FK agregadas en I4')
dot('modelo-fisico-toma-proveedor', I4+['bodega','tipo_equipo','unidad_equipo','usuario','empresa','proveedor','orden_ingreso','proveedor_tipo_equipo','movimiento_inventario','stock_consumible'], True, 'Modelo físico — Incremento 4: toma de inventario y proveedores')
dot('modelo-fisico-cierres', I3+['integracion_cierre','empresa','usuario','unidad_equipo','tipo_equipo','inventario_personal_tecnico','historial_estado_equipo'], True, 'Modelo físico — Cierres e integración, con las relaciones agregadas en I4')
