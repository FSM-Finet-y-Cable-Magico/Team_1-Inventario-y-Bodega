from pathlib import Path
import xml.etree.ElementTree as E,re,zlib,base64,urllib.parse,json,sys
if len(sys.argv)!=3:raise SystemExit('Uso: python svg_a_drawio.py CARPETA_SVG CARPETA_DRAWIO')
SRC=Path(sys.argv[1]); OUT=Path(sys.argv[2]);OUT.mkdir(parents=True,exist_ok=True)
def num(s):return float(re.sub('[a-z%]+$','',str(s or 0)))
def compress(s):return base64.b64encode(zlib.compress(urllib.parse.quote(s,safe="~()*!.'-").encode())[2:-4]).decode()
manifest=[]
for f in sorted(SRC.glob('*.svg')):
 svg=E.parse(f).getroot(); W=num(svg.get('width'));H=num(svg.get('height'))
 file=E.Element('mxfile',host='app.diagrams.net',type='device');diagram=E.SubElement(file,'diagram',name=f.stem,id=f.stem)
 model=E.SubElement(diagram,'mxGraphModel',page='0',pageWidth=str(W),pageHeight=str(H),grid='0',math='0',shadow='0');root=E.SubElement(model,'root');E.SubElement(root,'mxCell',id='0');E.SubElement(root,'mxCell',id='1',parent='0');n=1
 def cell(style,x,y,w,h,value=''):
  global n
  n+=1;c=E.SubElement(root,'mxCell',id=str(n),parent='1',vertex='1',value=value,style=style)
  E.SubElement(c,'mxGeometry',x=str(x),y=str(y),width=str(max(w,.01)),height=str(max(h,.01)),attrib={'as':'geometry'})
 for e in svg.iter():
  tag=e.tag.split('}')[-1]; a=e.attrib;st=dict(x.split(':',1) for x in a.get('style','').split(';') if ':' in x)
  fill=a.get('fill',st.get('fill','none'));stroke=st.get('stroke',a.get('stroke','none'));sw=st.get('stroke-width','1')
  if num(a.get('fill-opacity',1))==0:fill='none'
  common=f'fillColor={fill};strokeColor={stroke};strokeWidth={sw};'
  if 'stroke-dasharray' in st:common+='dashed=1;dashPattern='+st['stroke-dasharray'].replace(',',' ')+';'
  if tag=='text':
   size=num(a.get('font-size',13));value=''.join(e.itertext());x=num(a.get('x'));y=num(a.get('y'));w=num(a.get('textLength',len(value)*size*.6))
   cell('text;html=0;align=left;verticalAlign=top;spacing=0;whiteSpace=nowrap;overflow=visible;fillColor=none;strokeColor=none;'+f'fontFamily=Arial;fontSize={size};fontColor={fill};fontStyle={1 if a.get("font-weight")in ["bold","700"] else 0};',x,y-size*1.25,w+2,size*1.2,value)
  elif tag=='rect':cell(common+('rounded=1;arcSize=5;' if num(a.get('rx')) else 'rounded=0;'),num(a.get('x')),num(a.get('y')),num(a.get('width')),num(a.get('height')))
  elif tag=='ellipse':cell('ellipse;'+common,num(a.get('cx'))-num(a.get('rx')),num(a.get('cy'))-num(a.get('ry')),2*num(a.get('rx')),2*num(a.get('ry')))
  elif tag in ['line','polygon','path']:
   commands=[]
   if tag=='line':commands=[('M',[num(a.get('x1')),num(a.get('y1'))]),('L',[num(a.get('x2')),num(a.get('y2'))])]
   elif tag=='polygon':
    pts=[float(t) for t in re.findall(r'-?\d+(?:\.\d+)?',a['points'])];commands=[('M' if i==0 else 'L',pts[i:i+2]) for i in range(0,len(pts),2)]+[('Z',[])]
   else:
    toks=re.findall(r'[MLQCZA]|-?(?:\d*\.)?\d+(?:[eE][+-]?\d+)?',a['d']);i=0
    while i<len(toks):
     command=toks[i];i+=1;k={'M':2,'L':2,'Q':4,'C':6,'A':7,'Z':0}[command];v=list(map(float,toks[i:i+k]));i+=k;commands.append((command,v))
   xs=[];ys=[]
   for c,v in commands:
    vv=v[-2:] if c=='A' else v
    xs+=vv[::2];ys+=vv[1::2]
   x=min(xs);y=min(ys);w=max(max(xs)-x,.01);h=max(max(ys)-y,.01)
   shape=E.Element('shape',w=str(w),h=str(h),aspect='variable',strokewidth='inherit');fg=E.SubElement(shape,'foreground');path=E.SubElement(fg,'path')
   for c,v in commands:
    if c=='Z':E.SubElement(path,'close');continue
    if c=='A':attrs={'rx':str(v[0]),'ry':str(v[1]),'x-axis-rotation':str(v[2]),'large-arc-flag':str(int(v[3])),'sweep-flag':str(int(v[4])),'x':str(v[5]-x),'y':str(v[6]-y)};el='arc'
    else:
     el={'M':'move','L':'line','Q':'quad','C':'curve'}[c];attrs={}
     for j in range(0,len(v),2):
      suffix=str(j//2+1) if c in ['Q','C'] else '';attrs['x'+suffix]=str(v[j]-x);attrs['y'+suffix]=str(v[j+1]-y)
    E.SubElement(path,el,attrs)
   E.SubElement(fg,'fillstroke' if fill!='none' else 'stroke')
   cell('shape=stencil('+compress(E.tostring(shape,encoding='unicode'))+');'+common,x,y,w,h)
 out=OUT/(f.stem+'.drawio');E.ElementTree(file).write(out,encoding='utf-8',xml_declaration=True);manifest.append({'archivo':out.name,'objetos_editables':n-1,'fuente_svg':f.name})
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(len(manifest),'archivos',sum(r['objetos_editables']for r in manifest),'objetos')
