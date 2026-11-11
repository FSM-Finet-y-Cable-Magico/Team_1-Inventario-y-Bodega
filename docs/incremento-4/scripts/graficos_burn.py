import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
R,G,L='#9B1B2E','#3A3A3A','#7B7B7B'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11})
dias=['04/11','05/11','06/11','07/11','08/11','09/11','10/11','11/11','12/11','13/11','14/11','15/11']
alc=[89]*5+[101]*7
real=[6,16,28,34,46,70]
proy=[70,78,85,90,95,98,101]
x=list(range(12))
def fin(f): plt.tight_layout(); plt.savefig(f,dpi=160); plt.close()
# burn-up sprint
plt.figure(figsize=(9,5))
plt.step(x,alc,where='post',color=L,lw=2,label='Alcance (HH)')
plt.plot(x[:6],real,'-o',color=R,lw=2.4,label='Completado real')
plt.plot(x[5:],proy,'--o',color=R,alpha=.5,label='Completado proyectado')
plt.annotate('+12 HH: RF-72 y RF-73\n(CU-98, CU-99)',xy=(5,101),xytext=(1.2,96),arrowprops=dict(arrowstyle='->',color=G),color=G)
plt.xticks(x,dias,rotation=45);plt.ylabel('Horas hombre');plt.ylim(0,110);plt.grid(alpha=.3)
plt.title('Burn-up Incremento 4 (sprint 04/11 – 15/11)',color=G);plt.legend(loc='lower right');fin('burnup-sprint-i4.png')
# burn-down sprint
plt.figure(figsize=(9,5))
ideal=[89-89*i/11 for i in x]
plt.plot(x,ideal,'--',color=L,label='Ideal (89 HH)')
plt.plot(x[:6],[a-r for a,r in zip(alc,real)],'-o',color=R,lw=2.4,label='Restante real')
plt.plot(x[5:],[101-p for p in proy],'--o',color=R,alpha=.5,label='Restante proyectado')
plt.xticks(x,dias,rotation=45);plt.ylabel('Horas hombre restantes');plt.ylim(0,95);plt.grid(alpha=.3)
plt.title('Burn-down Incremento 4 (sprint 04/11 – 15/11)',color=G);plt.legend();fin('burndown-sprint-i4.png')
# proyecto burn-up
inc=['Inicio','I1','I2','I3','I4']
acum=[0,46,77,96,99]; minimo=[0,30,70,95,100]
plt.figure(figsize=(9,5))
plt.plot(inc,[99]*5,color=L,lw=2,label='Alcance total (99 CU)')
plt.plot(inc,acum,'-o',color=R,lw=2.4,label='CU implementados (acumulado)')
plt.plot(inc,[m*0.99 for m in minimo],':s',color=G,label='Mínimo exigido (30/70/95/100 %)')
for i,v in enumerate(acum[1:],1): plt.annotate(f'{v} CU\n{v/99*100:.2f} %'.replace('.',','),(i,v),textcoords='offset points',xytext=(-28,8),color=R,fontsize=9)
plt.ylabel('Casos de uso');plt.ylim(0,112);plt.grid(alpha=.3);plt.legend(loc='lower right')
plt.title('Burn-up del proyecto por incremento',color=G);fin('burnup-proyecto.png')
plt.figure(figsize=(9,5))
plt.plot(inc,[99-99*i/4 for i in range(5)],'--',color=L,label='Ideal')
plt.plot(inc,[99-a for a in acum],'-o',color=R,lw=2.4,label='CU pendientes')
for i,a in enumerate(acum): plt.annotate(str(99-a),(i,99-a),textcoords='offset points',xytext=(6,6),color=R)
plt.ylabel('Casos de uso pendientes');plt.ylim(0,105);plt.grid(alpha=.3);plt.legend()
plt.title('Burn-down del proyecto por incremento',color=G);fin('burndown-proyecto.png')
