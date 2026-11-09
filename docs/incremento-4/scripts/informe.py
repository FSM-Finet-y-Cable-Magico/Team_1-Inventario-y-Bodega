import json, sys, subprocess, os
sys.path.insert(0, os.path.dirname(__file__))
from builder import Informe, paginas, FUENTE

R = '/home/user/Team_1-Inventario-y-Bodega/'
TPL = '/mnt/user-data/uploads/Entregas/Incremento-3-v2-Claude/Grupo 1 - Incremento 3 v2 Claude.docx'
OUT = sys.argv[1]
SEQ = R + 'diagramas/diagramas-secuencia/'
D4 = R + 'diagramas/incremento4/'
EV = R + 'docs/incremento-4/evidencias/'
F_GIT = 'Fuente: Elaborado por los estudiantes a partir del historial de Git del repositorio del proyecto, 2026.'
F_PRU = 'Fuente: Ejecución de pruebas de los estudiantes en ambiente local, 9 de noviembre de 2026.'
F_DOC = 'Fuente: Elaborado por los estudiantes a partir de la retroalimentación del docente, 2026.'
F_BD = 'Fuente: Elaborado por los estudiantes a partir del esquema PostgreSQL del proyecto, 2026.'
F_CAP = 'Fuente: Captura del sistema en ambiente local con datos ficticios, 2026.'
F_VPS = 'Fuente: Elaborado por los estudiantes a partir de la configuración de la VPS FiNet y de docker-compose.vps.yml, 2026.'
F_PLAN = 'Fuente: Elaborado por los estudiantes a partir de la planificación del sprint y del historial de Git, 2026.'

doc = Informe(TPL, 4)
h1, h2, h3, p, T, KV, FIG = doc.h1, doc.h2, doc.h3, doc.p, doc.table, doc.kv, doc.figure

# =====================================================================================
h1('INTRODUCCIÓN')
p('El Sistema de Inventario y Bodega para Finet y Cable Mágico Litoral administra la trazabilidad de los equipos '
  'individualizables y los saldos de consumibles desde su ingreso hasta su asignación, instalación, devolución, préstamo '
  'o baja. Los incrementos 1, 2 y 3 dejaron implementados los 96 casos de uso definidos en el Documento 0.')
p('Este informe desarrolla el cuarto y último incremento. El sprint se ejecutó entre el 4 y el 15 de noviembre de 2026 y '
  'tuvo dos objetivos: incorporar tres requerimientos nuevos, que cierran el control físico de la bodega y la gestión de '
  'proveedores (RF-71, RF-72 y RF-73, con los casos de uso CU-97, CU-98 y CU-99), y dejar el sistema funcionando en '
  'producción en la VPS FiNet del curso, integrado con los sistemas de los grupos 3 y 8 y conectado a la base de datos '
  'global de validación.')
p('El documento mantiene la estructura de los incrementos anteriores: requerimientos, documentación de Scrum++, vistas '
  'del modelo 4+1 regeneradas con el sistema actualizado, árbol de navegación, pruebas, control de versiones, '
  'retrospectiva y anexos. Por tratarse del cierre del proyecto, el contenido se concentra en lo que cambia en este '
  'incremento y remite a los informes anteriores para lo que se conserva. La tabla 1.1 indica dónde se resuelve cada '
  'observación del docente sobre la entrega anterior.')
T('Observaciones del Incremento 3 y su resolución', ['Observación del docente', 'Resolución en este informe'], [
    ['No se ve representado en la planificación el trabajo incremental y la pila', 'Capítulo 3: pila del producto por incremento (I1 a I4) con estado, y pila del sprint con las tareas, responsables y horas del I4.'],
    ['No olvidar la traza de la metodología', 'Apartado 3.5: gráficos burn-up y burn-down del sprint y del proyecto; tabla 3.8 con la traza de cada artefacto Scrum++ y su evidencia.'],
    ['El modelo físico debe cumplirse: faltan las relaciones entre las tablas', 'Capítulo 5 y anexo 13.2: se agregaron 45 claves foráneas al esquema (72 en total) y los modelos físicos muestran cada relación.'],
    ['Trabajar de forma incremental y revisar los incrementos anteriores', 'Tablas 2.1, 3.1 y 9.1: avance, pila y pantallas identificados por incremento; los diagramas marcan con color lo que aporta cada entrega.'],
    ['Pendientes declarados en el I3 (despliegue, HTTPS, respaldo y separación por empresa)', 'Capítulo 8 y apartado 2.4: el sistema quedó en la VPS FiNet; se indica qué se cumple y qué depende del administrador del servidor.'],
], widths=[1.3, 2.4], fuente=F_DOC)

# =====================================================================================
h1('PROPUESTA DE SOLUCIÓN E INCREMENTO')
h2('Alcance, diferencias y porcentaje de avance')
p('El Documento 0 definió 96 casos de uso, completados al cierre del Incremento 3. En este incremento se agregan tres '
  'requerimientos nuevos, por lo que el denominador pasa a 99 casos de uso y los porcentajes de los incrementos anteriores '
  'se recalculan con esa base. El porcentaje parcial mide los casos incorporados en cada entrega y el acumulado suma los '
  'incrementos sin duplicar funcionalidades.')
T('Evolución de los incrementos', ['Entrega', 'Casos nuevos', 'Parcial', 'Acumulado', 'Alcance'], [
    ['Incremento 1', '46', '46,46 %', '46/99 = 46,46 %', 'CU-01 a CU-46: seguridad, catálogo y operación base.'],
    ['Incremento 2', '31', '31,31 %', '77/99 = 77,78 %', 'Proveedores, órdenes de ingreso, salidas, préstamos, bajas y reportes.'],
    ['Incremento 3', '19', '19,19 %', '96/99 = 96,97 %', 'Cierres de terreno con G3, devoluciones, reportes, alertas y notificaciones.'],
    ['Incremento 4', '3', '3,03 %', '99/99 = 100 %', 'CU-97 toma de inventario, CU-98 desactivar proveedor y CU-99 acta PDF; despliegue en la VPS.'],
], widths=[1.1, 0.8, 0.8, 1.2, 2.6])
p('Con el nuevo denominador, cada incremento sigue sobre el mínimo exigido por la rúbrica (30 %, 70 %, 95 % y 100 %). '
  'Los tres casos nuevos son de complejidad acotada y reutilizan módulos existentes: la toma de inventario usa el stock y '
  'los movimientos del Incremento 1, la desactivación de proveedores actúa sobre las órdenes de ingreso del Incremento 2 y '
  'el acta reutiliza el generador de PDF del Incremento 3.')
T('Casos incorporados en el incremento 4', ['CU', 'RF', 'Funcionalidad', 'Responsable'], [
    ['CU-97', 'RF-71', 'Registrando toma de inventario físico y ajuste de diferencias', 'Javier Farías'],
    ['CU-98', 'RF-72', 'Desactivando proveedor', 'Javier Farías'],
    ['CU-99', 'RF-73', 'Generando acta de toma de inventario en PDF', 'Javier Farías'],
], widths=[0.6, 0.6, 2.8, 1.2])

h2('Requerimientos funcionales y criterios de aceptación')
p('Los tres requerimientos se redactaron con el mismo formato del Documento 0. La prioridad usa los códigos de la fuente '
  '(E esencial, D deseable) y la procedencia C/S indica si el requerimiento proviene del cliente o del sistema.')
RFS = [
    ('RF-71 — Toma de inventario físico y ajuste de diferencias',
     'El sistema debe permitir que el encargado de bodega abra una toma de inventario de una bodega, que guarda lo que el '
     'sistema espera encontrar (unidades en bodega y saldos de consumibles). El encargado registra lo contado: cantidades '
     'de consumibles y números de serie leídos. Al confirmar, el sistema calcula las diferencias, ajusta el stock de '
     'consumibles con movimientos de ajuste y deja informadas las series faltantes o sobrantes. Solo puede existir una toma '
     'abierta por bodega.',
     [['Identificador y tipo', 'RF-71 / funcional'], ['Prioridad / fuente', 'E / C'],
      ['Necesidad', 'Cuadrar periódicamente el inventario registrado con lo que existe físicamente en la bodega.'],
      ['Casos que lo realizan', 'CU-97 (y CU-99 para el acta)'],
      ['Entradas y precondiciones', 'Usuario con rol ADMIN_BODEGA, ADMIN o SUPERUSUARIO; bodega activa de su empresa sin otra toma abierta.'],
      ['Criterio de aceptación', 'Al confirmar, cada diferencia de consumible genera un movimiento AJUSTE_INVENTARIO, el stock queda igual a lo contado y la toma queda CONFIRMADA en el log de auditoría.'],
      ['Verificación', 'Pruebas P97-N y P97-E1 del capítulo 10 y pruebas unitarias del módulo tomas-inventario.']]),
    ('RF-72 — Desactivación de proveedores',
     'El sistema debe permitir que un administrador desactive un proveedor que ya no se utilizará y lo reactive si vuelve a '
     'operar. Un proveedor inactivo conserva sus datos y su historial, pero no puede seleccionarse en órdenes de ingreso '
     'nuevas. No se puede desactivar un proveedor con órdenes de ingreso pendientes de recepción.',
     [['Identificador y tipo', 'RF-72 / funcional'], ['Prioridad / fuente', 'D / C'],
      ['Necesidad', 'Evitar compras a proveedores dados de baja sin perder la trazabilidad de las órdenes anteriores.'],
      ['Casos que lo realizan', 'CU-98'],
      ['Entradas y precondiciones', 'Usuario con rol ADMIN o SUPERUSUARIO; proveedor existente y activo.'],
      ['Criterio de aceptación', 'El proveedor queda inactivo, no aparece en el formulario de órdenes de ingreso, el backend rechaza órdenes nuevas con él y el cambio queda en el log de auditoría.'],
      ['Verificación', 'Pruebas P98-N, P98-E1, P98-E2, P98-E3 y P98-R del capítulo 10.']]),
    ('RF-73 — Acta de toma de inventario en PDF',
     'El sistema debe generar, para una toma de inventario confirmada, un acta en PDF con la empresa, la bodega, las fechas '
     'de apertura y confirmación, los usuarios que abrieron y confirmaron la toma y el detalle de cada línea: esperado, '
     'contado, diferencia y resultado. El acta sirve como respaldo firmable del conteo.',
     [['Identificador y tipo', 'RF-73 / funcional'], ['Prioridad / fuente', 'D / C'],
      ['Necesidad', 'Contar con un documento formal del resultado de cada toma para revisión y archivo.'],
      ['Casos que lo realizan', 'CU-99'],
      ['Entradas y precondiciones', 'Toma de inventario de la empresa del usuario en estado CONFIRMADA.'],
      ['Criterio de aceptación', 'Se descarga el archivo acta-toma-{id}-AAAAMMDD.pdf con todas las líneas de la toma y la generación queda en el log de auditoría.'],
      ['Verificación', 'Pruebas P99-N, P99-E1 y P99-E2 del capítulo 10.']]),
]
for titulo, texto, kv in RFS:
    h3(titulo)
    p(texto)
    KV(f'Especificación funcional {titulo.split(" — ")[0]}', kv)

h2('Requerimientos de usuario según la matriz ESA')
p('Los requerimientos nuevos se agrupan en dos requerimientos de usuario que continúan la numeración de la matriz ESA '
  'del Documento 0. Los atributos usan la misma escala de los incrementos anteriores.')
URS = [
    ('UR 13.1 — Control físico periódico del inventario de bodega.', '13.1', 'Control físico periódico del inventario de bodega.',
     'El sistema debe permitir contar físicamente el inventario de una bodega, comparar lo contado con lo registrado, ajustar las diferencias y dejar un acta del resultado. Trazabilidad: RF-71, RF-73', 'RF-71, RF-73', 'CU-97, CU-99'),
    ('UR 13.2 — Gestión de la vigencia de proveedores.', '13.2', 'Gestión de la vigencia de proveedores.',
     'El sistema debe permitir dejar sin efecto a un proveedor para nuevas compras sin eliminar su historial. Trazabilidad: RF-72', 'RF-72', 'CU-98'),
]
for titulo, uid, desc, orig, rf, cu in URS:
    h3(titulo)
    KV(f'Atributos ESA de UR {uid}', [['Tipo', 'UR'], ['ID', uid], ['Descripción', desc], ['Necesidad', '1'],
        ['Prioridad', '2' if uid == '13.1' else '3'], ['Estabilidad', '1'], ['Claridad', '1'], ['Verificabilidad', '1'],
        ['Fuente', '1'], ['Enunciado original', orig], ['RF del incremento', rf], ['CU vinculados', cu]])

h2('Límites y atributos de calidad')
p('Los requerimientos no funcionales se conservan del Documento 0. En este incremento cambia principalmente su '
  'aplicación, porque el sistema pasó del entorno local a la VPS FiNet. Cada apartado indica cómo se cumple al cierre '
  'del proyecto y, cuando corresponde, qué depende del administrador del servidor compartido.')
RNF = [
    ('RNF-01 — Compatibilidad de navegadores', 'La aplicación web no requiere complementos y se usó en Google Chrome y Microsoft Edge sobre Windows y macOS. El acceso a la VPS se hace desde el navegador a través del túnel SSH.'),
    ('RNF-02 — Diseño responsivo', 'Las pantallas nuevas de toma de inventario y proveedores usan los mismos componentes responsivos del sistema; la vista móvil del técnico (RF-39) no cambia.'),
    ('RNF-03 — Infraestructura de despliegue', 'El sistema quedó desplegado en la VPS FiNet entregada por el curso (38.7.201.104), con Docker rootless y docker-compose.vps.yml (capítulo 8). La VPS usa Ubuntu 20.04, versión definida por la administración del curso y distinta de la 22.04 indicada en el Documento 0.'),
    ('RNF-04 — Base de datos relacional', 'El sistema usa PostgreSQL. En producción se conecta a la base global de validación finet_global_validacion (PostgreSQL 15), compartida por los grupos, con el rol g1_app. En este incremento se agregaron 45 claves foráneas para que el modelo físico tenga todas sus relaciones.'),
    ('RNF-05 — Almacenamiento seguro de contraseñas', 'Se mantiene bcrypt con factor de costo 12. Las credenciales de la VPS y de la base global no se publican en el repositorio ni en este informe.'),
    ('RNF-06 — Tiempos de respuesta', 'Las operaciones nuevas son consultas y actualizaciones acotadas a una bodega o un proveedor; en las pruebas locales respondieron en menos de un segundo. Los ensayos de concurrencia del Incremento 3 se mantienen como referencia.'),
    ('RNF-07 — Comunicación cifrada (HTTPS)', 'Las integraciones con G3 y G8 pasan por el nginx del administrador con certificado válido (https://38.7.201.104:8143/api/integraciones/). Los usuarios acceden por túnel SSH, que cifra la conexión; la política de la VPS no permite publicar la aplicación directamente en Internet.'),
    ('RNF-08 — Respaldo automático', 'La guía de despliegue documenta el respaldo con pg_dump y la vuelta atrás de la configuración (.env.antes-validacion). La base global pertenece al servidor compartido y su respaldo programado lo define el administrador de la VPS.'),
    ('RNF-09 — Separación de datos por empresa', 'Toda consulta filtra por id_empresa y las tomas, proveedores y actas de otra empresa responden 404 (prueba P99-E2). La base global usa un solo esquema public acordado entre los grupos, por lo que la separación sigue siendo lógica y no por esquemas.'),
    ('RNF-10 — Pila tecnológica', 'Frontend Svelte 5 con SvelteKit, backend NestJS 11 sobre Node.js 20, PostgreSQL y Docker Compose. Los casos nuevos no agregan librerías.'),
]
for t, a in RNF:
    h3(t)
    doc.bold_lead('Aplicación en el incremento:', a)

# =====================================================================================
h1('DOCUMENTACIÓN ASOCIADA A SCRUM++')
h2('Objetivo del sprint y Product Backlog')
p('Objetivo del sprint: cerrar el proyecto con el sistema en producción en la VPS FiNet e incorporar el control físico '
  'de inventario y la gestión de vigencia de proveedores, respondiendo además a las observaciones del Incremento 3.')
p('La pila del producto se presenta por incremento para que se vea el trabajo incremental: cada fila agrupa los '
  'elementos que se terminaron en una entrega y no vuelven a aparecer como trabajo pendiente en la siguiente.')
T('Pila del producto por incremento', ['Incremento', 'Elementos de la pila', 'CU', 'Estado al cierre', 'Periodo'], [
    ['I1', 'Seguridad, usuarios, catálogo, bodegas, unidades, stock, movimientos y auditoría', 'CU-01 a CU-46 (46)', 'Terminado y aceptado', 'Agosto 2026'],
    ['I2', 'Proveedores, órdenes de ingreso, salidas a técnico, préstamos, bajas, donaciones y reportes', '31 CU (CU-47 a CU-91, parcial)', 'Terminado y aceptado', 'Septiembre 2026'],
    ['I3', 'Cierres de instalación y reparación con G3, devoluciones, reportes, alertas y notificaciones', '19 CU', 'Terminado y aceptado', '23-09 al 04-10-2026'],
    ['I4', 'Toma de inventario, desactivación de proveedor, acta PDF, relaciones del modelo físico y despliegue en la VPS', 'CU-97, CU-98, CU-99 (3)', 'Terminado; aceptación en curso', '04-11 al 15-11-2026'],
], widths=[0.6, 2.6, 1.3, 1.1, 1.1], fuente=F_PLAN)
p('La tabla 3.2 detalla los elementos de la pila del Incremento 4 con su prioridad y estimación en horas hombre (HH). '
  'El sprint se planificó con 89 HH; el 9 de noviembre se incorporaron RF-72 y RF-73 (12 HH), por lo que el alcance '
  'final es de 101 HH.')
BACK = [
    ['1', 'Especificar RF-71 y CU-97 (toma de inventario)', 'Alta', 'Javier Farías', '4'],
    ['2', 'Implementar CU-97 (backend, frontend y pruebas unitarias)', 'Alta', 'Javier Farías', '12'],
    ['3', 'Desplegar el sistema en la VPS FiNet e integrar con G3/G8 y la base global', 'Alta', 'Javier Farías', '10'],
    ['4', 'Agregar las relaciones faltantes del modelo físico', 'Alta', 'Javier Farías', '4'],
    ['5', 'Regenerar los diagramas de las vistas 4+1', 'Alta', 'Kevin Cifuentes', '10'],
    ['6', 'Ejecutar y documentar las pruebas del incremento', 'Alta', 'Tomás Heilenkötter', '8'],
    ['7', 'Redactar el informe del Incremento 4', 'Alta', 'Kevin Cifuentes', '12'],
    ['8', 'Representar el trabajo incremental y la traza de la metodología', 'Media', 'Uriel Navarrete', '5'],
    ['9', 'Corregir observaciones de los documentos anteriores', 'Media', 'Uriel Navarrete', '6'],
    ['10', 'Preparar la presentación (PPT)', 'Media', 'Javiera Morán', '6'],
    ['11', 'Grabar los videos de instalación, funcionalidad y aceptación', 'Media', 'Javier Farías / Javiera Morán', '6'],
    ['12', 'Proceso final con el sistema y carta de aceptación', 'Media', 'Javiera Morán', '4'],
    ['13', 'Revisión final y entrega', 'Media', 'Javier Farías', '2'],
    ['14', 'CU-98 Desactivando proveedor (agregado el 09-11)', 'Media', 'Javier Farías', '6'],
    ['15', 'CU-99 Generando acta de toma de inventario en PDF (agregado el 09-11)', 'Media', 'Javier Farías', '6'],
]
T('Pila del Incremento 4 con prioridad y estimación', ['N°', 'Elemento', 'Prioridad', 'Responsable', 'HH'], BACK,
  widths=[0.4, 3.2, 0.8, 1.5, 0.4], fuente=F_PLAN)

h2('Sprint Planning y Sprint Backlog')
p('La planificación del 4 de noviembre revisó la retroalimentación del Incremento 3, la rúbrica y el estado de la VPS. '
  'Se acordó priorizar el despliegue, porque las integraciones con G3 y G8 dependían de él, y en paralelo especificar e '
  'implementar CU-97. La documentación se dejó para la segunda semana, una vez estabilizados el código y el servidor.')
p('La tabla 3.3 presenta el Sprint Backlog con el estado de cada tarea al 9 de noviembre de 2026.')
EST = ['Terminado', 'Terminado', 'Terminado', 'Terminado', 'Terminado', 'Terminado', 'En curso', 'Terminado', 'Terminado',
       'Pendiente', 'En curso (instalación terminada)', 'Pendiente', 'Pendiente', 'Terminado', 'Terminado']
EVI = ['docs/05-backend/tomas-inventario.md', 'PR #78 (8b589e9)', 'PR #76, #79, #80, #82, #84, #86', 'PR #89 (f9dae72)',
       'diagramas/incremento4', 'docs/incremento-4/resultados', 'Este informe', 'Apartado 3.5', 'Tabla 1.1',
       'Presentación I4', 'Videos', 'Anexo 13.3', 'Entrega en Drive', 'PR #89 (9917e23)', 'PR #89 (87bc5da)']
T('Sprint Backlog del Incremento 4', ['N°', 'Tarea', 'Estado al 09-11', 'Evidencia'],
  [[b[0], b[1], e, v] for b, e, v in zip(BACK, EST, EVI)], widths=[0.4, 2.9, 1.3, 1.6], intro=None, fuente=F_PLAN)

h2('Seguimiento y Daily Scrum')
p('El seguimiento se hizo en reuniones breves y por el chat del equipo, revisando el avance, el trabajo siguiente y '
  'los impedimentos. Como en este incremento hubo coordinación con el administrador de la VPS y con los grupos 3 y 8, '
  'la mayor parte de los impedimentos fueron externos al código.')
T('Seguimiento diario del sprint', ['Fecha', 'Avance', 'Siguiente trabajo', 'Impedimento'], [
    ['04-11', 'Planificación; compose y guía de la VPS (PR #76); CU-97 implementado (PR #78)', 'Levantar la app en la VPS', 'Docker rootless sin acceso al puerto 80'],
    ['05-11', 'App en la VPS con 4 contenedores sanos; nginx del administrador publica integraciones con HTTPS', 'Configurar claves de G3 y G8', 'Acceso solo por túnel SSH'],
    ['06-11', 'Opción para usar la base global (PR #79, #80); conexión a la base global', 'Revisar tablas y permisos de la base global', 'Permisos y ruta de red dependían del administrador'],
    ['07-11', 'Comparación del esquema global con el propio; datos de prueba cargados', 'Equivalencia de roles con la base global', 'Roles distintos entre grupos'],
    ['08-11', 'Equivalencia de roles y técnico del cierre (PR #82, #84, #87); cambio a finet_global_validacion', 'Pruebas de cierres reales de G3', 'G3 envía datos de reparación en otro nivel del JSON (resuelto en PR #87)'],
    ['09-11', 'CU-98, CU-99 y 45 claves foráneas (PR #89); diagramas, pruebas e informe', 'Presentación, videos y aceptación', 'Ninguno'],
], widths=[0.6, 2.4, 1.5, 1.6], fuente=F_PLAN)

h2('Sprint Review y definición de terminado')
p('La revisión se hizo sobre la rama dev y sobre la aplicación en la VPS. El jefe de grupo revisó cada Pull Request antes '
  'de integrarla y el sistema se comprobó con las pruebas del capítulo 10.')
T('Resultado de la revisión del sprint', ['Aspecto', 'Resultado', 'Continuidad'], [
    ['Objetivo funcional', '3 CU nuevos; 99 de 99 casos implementados', 'Aceptación del Product Owner con la carta de aceptación'],
    ['Despliegue', 'Sistema en la VPS FiNet, integrado con G3 y G8 y conectado a la base global', 'Actualizar la VPS al integrar la PR #89 en main'],
    ['Modelo físico', '45 claves foráneas nuevas, 72 en total', 'Aplicar el mismo script a la base global con el administrador'],
    ['Cambios del backlog', 'RF-72 y RF-73 agregados el 09-11 (+12 HH)', 'Registrados en la pila y en el burn-up'],
    ['Participación', 'Desarrollo y despliegue concentrados en el jefe de grupo; documentación y presentación distribuidas', 'Ver planilla de organización del trabajo'],
], widths=[1.2, 2.3, 2.3])
T('Definición de terminado y evidencia', ['Criterio', 'Evidencia', 'Resultado'], [
    ['Caso implementado con flujo normal y excepciones', 'Casos extendidos (cap. 4) y fichas de prueba (cap. 10)', 'CU-97, CU-98 y CU-99 cumplen'],
    ['Pruebas automatizadas aprobadas', 'npm test en backend-inventario', '174 de 174 pruebas aprobadas'],
    ['Compilación sin errores', 'tsc, svelte-check y build del frontend', 'Sin errores'],
    ['Persistencia y auditoría', 'Movimientos AJUSTE_INVENTARIO y eventos DESACTIVAR, REACTIVAR y GENERAR_ACTA', 'Comprobado en la base local'],
    ['Documentación y diagramas', 'Capítulos 4 a 9, docs del repositorio y archivos .puml y .drawio', 'Actualizados'],
    ['Integración revisada', 'Pull Request a dev revisada por el jefe de grupo', 'PR #78 integrada; PR #89 en revisión'],
], widths=[1.6, 2.4, 1.6])

h2('Métricas del alcance')
p('Los gráficos se construyeron con las horas de la pila del sprint (tabla 3.2) y las fechas de integración del '
  'historial de Git. Hasta el 9 de noviembre los valores son reales; desde el 10 de noviembre la línea punteada es la '
  'proyección de las tareas pendientes (presentación, videos, aceptación y entrega).')
FIG('Burn-up del sprint del Incremento 4', D4 + 'graficos/burnup-sprint-i4.png',
    'El escalón del 9 de noviembre muestra el aumento de alcance por RF-72 y RF-73. La figura {n} muestra el burn-up del sprint.',
    fuente=F_PLAN)
FIG('Burn-down del sprint del Incremento 4', D4 + 'graficos/burndown-sprint-i4.png',
    'El trabajo restante baja más rápido en los primeros días por el despliegue y CU-97, y sube el 9 de noviembre con el '
    'nuevo alcance. La figura {n} muestra el burn-down del sprint.', fuente=F_PLAN)
FIG('Burn-up del proyecto por incremento', D4 + 'graficos/burnup-proyecto.png',
    'A nivel de proyecto, el acumulado de casos de uso supera en cada entrega el mínimo exigido. La figura {n} muestra el '
    'burn-up del proyecto.', fuente=F_PLAN)
FIG('Burn-down del proyecto por incremento', D4 + 'graficos/burndown-proyecto.png',
    'La figura {n} muestra los casos de uso pendientes del proyecto al cierre de cada incremento.', fuente=F_PLAN)
T('Traza de la metodología Scrum++ en el proyecto', ['Artefacto o evento', 'Dónde se registró', 'Evidencia en este informe'], [
    ['Product Backlog', 'Documento 0 y tablero Shortcut por incremento', 'Tabla 3.1 (pila por incremento) y tabla 3.2'],
    ['Sprint Planning', 'Reunión del 04-11 y tickets del sprint', 'Apartado 3.2'],
    ['Sprint Backlog', 'Tablero Shortcut y ramas del repositorio', 'Tabla 3.3'],
    ['Daily Scrum', 'Reuniones breves y chat del equipo', 'Tabla 3.4'],
    ['Incremento', 'Pull Requests integradas en dev y main', 'Capítulo 11'],
    ['Sprint Review', 'Revisión de PR y prueba en la VPS', 'Tablas 3.5 y 3.6'],
    ['Retrospectiva', 'Reunión de cierre', 'Apartado 3.6 y capítulo 12'],
    ['Métricas', 'Horas de la pila y fechas de Git', 'Figuras 3.1 a 3.4'],
], widths=[1.3, 2.2, 2.2])

h2('Retrospectiva del sprint')
p('El sprint confirmó que el despliegue en un servidor compartido requiere más coordinación que el desarrollo: los '
  'bloqueos principales fueron permisos, rutas de red y diferencias de datos entre grupos, y se resolvieron con acuerdos '
  'documentados y cambios pequeños integrados por Pull Request. El capítulo 12 detalla los hechos y las acciones.')

# =====================================================================================
h1('VISTA EXTERNA DEL SISTEMA')
h2('Actores y diagrama de casos de uso')
p('La vista externa muestra quién usa cada función nueva. El encargado de bodega realiza la toma de inventario y '
  'descarga el acta; el administrador gestiona la vigencia de los proveedores. Los roles son acumulativos: el '
  'administrador puede hacer lo del encargado y el superusuario lo de ambos.')
T('Actores y responsabilidades', ['Actor', 'Interacción en el incremento', 'Control'], [
    ['Encargado de bodega (ADMIN_BODEGA)', 'Abre la toma, registra el conteo, confirma o cancela y descarga el acta', 'Rol y empresa de la bodega'],
    ['Administrador (ADMIN)', 'Lo anterior, más desactivar y reactivar proveedores', 'Rol y empresa'],
    ['Superusuario', 'Todas las operaciones en ambas empresas', 'Acceso completo'],
], widths=[1.6, 2.6, 1.2])
FIG('Diagrama de casos de uso del incremento 4', D4 + 'casos-uso-i4.png',
    'En violeta se marcan los casos nuevos y con el color de su incremento los casos anteriores que se reutilizan. La '
    'figura {n} muestra el diagrama de casos de uso del incremento 4.')

CUS = [
    ('CU-97', 'Registrando toma de inventario físico y ajuste de diferencias', [
        ['Nombre', 'Registrando toma de inventario físico y ajuste de diferencias'],
        ['Actor(es)', 'Encargado de bodega, Administrador, Superusuario'],
        ['Resumen', 'El actor abre una toma de una bodega, registra lo contado y la confirma; el sistema calcula las diferencias y ajusta el stock de consumibles.'],
        ['Frecuencia', 'Periódica (por ejemplo, mensual) o ante una sospecha de diferencia.'],
        ['Precondiciones', 'La bodega pertenece a la empresa del actor, está activa y no tiene otra toma abierta.'],
        ['Flujo normal', '1. El actor abre una toma para la bodega. 2. El sistema guarda lo esperado: unidades En bodega y saldos de consumibles. 3. El actor registra las cantidades contadas y las series leídas (puede guardar varias veces). 4. El sistema muestra cada línea como COINCIDE, FALTANTE, SOBRANTE, OTRA_UBICACION o NO_REGISTRADA. 5. El actor confirma. 6. El sistema genera un movimiento AJUSTE_INVENTARIO por cada diferencia de consumible, actualiza el stock, cierra la toma y registra el evento en auditoría.'],
        ['Excepción 1', 'La bodega ya tiene una toma abierta. / Respuesta: 409 «La bodega ya tiene una toma abierta (#n)».'],
        ['Excepción 2', 'Se lee una serie que no estaba en la bodega. / Respuesta: la línea queda como OTRA_UBICACION o NO_REGISTRADA y no se mueve la unidad.'],
        ['Excepción 3', 'El stock cambió durante el conteo. / Respuesta: 409 MOVIMIENTOS_DURANTE_CONTEO; el actor puede confirmar de nuevo y el ajuste se aplica sobre el stock actual.'],
        ['Poscondiciones', 'Stock de consumibles igual a lo contado; toma CONFIRMADA o CANCELADA; evento en el log de auditoría.'],
        ['Dependencias', 'CU-44 (bodegas), CU-45 (stock), CU-08 (auditoría)'],
        ['Requerimiento', 'RF-71'], ['Implementación', 'Javier Farías; módulo tomas-inventario'],
        ['Pruebas relacionadas', 'P97-N, P97-E1 y 17 pruebas unitarias']]),
    ('CU-98', 'Desactivando proveedor', [
        ['Nombre', 'Desactivando proveedor'],
        ['Actor(es)', 'Administrador, Superusuario'],
        ['Resumen', 'El actor desactiva un proveedor para que no se use en órdenes de ingreso nuevas, o lo reactiva.'],
        ['Frecuencia', 'Ocasional, cuando se deja de trabajar con un proveedor.'],
        ['Precondiciones', 'El proveedor existe y está activo.'],
        ['Flujo normal', '1. El actor elige Desactivar en el listado de proveedores. 2. El sistema pide confirmación. 3. El actor confirma. 4. El sistema verifica que no haya órdenes de ingreso pendientes, deja el proveedor inactivo y registra el evento DESACTIVAR. 5. El proveedor deja de aparecer en el formulario de órdenes de ingreso.'],
        ['Excepción 1', 'El proveedor ya está inactivo. / Respuesta: 409 «El proveedor ya está inactivo.»'],
        ['Excepción 2', 'Tiene órdenes Pendiente de recepción o Recepción parcial. / Respuesta: 409 con la cantidad de órdenes; no se desactiva.'],
        ['Excepción 3', 'Se intenta crear una orden de ingreso con un proveedor inactivo. / Respuesta: 400 «El proveedor seleccionado está inactivo.»'],
        ['Flujo alternativo', 'Reactivar: el actor elige Reactivar y el proveedor vuelve a estar disponible (409 si ya estaba activo).'],
        ['Poscondiciones', 'Proveedor inactivo con su historial intacto; evento en el log de auditoría.'],
        ['Dependencias', 'CU-49 a CU-51 (proveedores), CU-52 (órdenes de ingreso), CU-08'],
        ['Requerimiento', 'RF-72'], ['Implementación', 'Javier Farías; módulos proveedores y ordenes-ingreso'],
        ['Pruebas relacionadas', 'P98-N, P98-E1, P98-E2, P98-E3, P98-R y 6 pruebas unitarias']]),
    ('CU-99', 'Generando acta de toma de inventario en PDF', [
        ['Nombre', 'Generando acta de toma de inventario en PDF'],
        ['Actor(es)', 'Encargado de bodega, Administrador, Superusuario'],
        ['Resumen', 'El actor descarga el acta en PDF de una toma de inventario confirmada.'],
        ['Frecuencia', 'Una o más veces por cada toma confirmada.'],
        ['Precondiciones', 'La toma pertenece a la empresa del actor y está CONFIRMADA.'],
        ['Flujo normal', '1. El actor abre el detalle de la toma y elige Descargar acta PDF. 2. El sistema arma el encabezado (empresa, bodega, fechas, usuarios) y la tabla de líneas: primero consumibles y luego series. 3. El sistema registra GENERAR_ACTA_TOMA_INVENTARIO y entrega el archivo acta-toma-{id}-AAAAMMDD.pdf.'],
        ['Excepción 1', 'La toma está abierta o cancelada. / Respuesta: 409 «Solo se puede generar el acta de una toma confirmada.»'],
        ['Excepción 2', 'La toma es de otra empresa. / Respuesta: 404 «Toma de inventario no encontrada.»'],
        ['Poscondiciones', 'El actor dispone del acta; el evento queda en el log de auditoría.'],
        ['Dependencias', 'CU-97 (extiende), CU-93 (generador PDF), CU-08'],
        ['Requerimiento', 'RF-73'], ['Implementación', 'Javier Farías; módulo tomas-inventario'],
        ['Pruebas relacionadas', 'P99-N, P99-E1, P99-E2 y 3 pruebas unitarias']]),
]
for cu, nombre, kv in CUS:
    h2(f'{cu}: {nombre}')
    KV(f'Caso de uso extendido {cu}', kv, head=('Campo', 'Especificación'))

h2('Matriz de requerimientos y casos de uso')
T('Matriz de requerimientos y casos de uso del incremento', ['RF', 'UR', 'Casos', 'Efecto verificable'], [
    ['RF-71', 'UR 13.1', 'CU-97', 'Stock igual a lo contado, movimientos de ajuste y toma confirmada en auditoría.'],
    ['RF-72', 'UR 13.2', 'CU-98', 'Proveedor inactivo, sin órdenes nuevas y con su historial conservado.'],
    ['RF-73', 'UR 13.1', 'CU-99', 'Acta PDF descargada y registrada en auditoría.'],
], widths=[0.7, 0.8, 0.7, 3.4])

# =====================================================================================
h1('VISTA LÓGICA Y MODELO DE DATOS')
h2('Clases, objetos y responsabilidades')
p('Las clases nuevas siguen la organización del backend: el controlador recibe y valida, el servicio aplica las reglas '
  'y los repositorios TypeORM acceden a PostgreSQL. El diagrama marca en violeta lo que agrega el Incremento 4 y muestra '
  'las clases existentes con las que se relaciona.')
FIG('Clases del incremento 4 y sus relaciones', D4 + 'clases-i4.png',
    'TomasInventarioService concentra CU-97 y CU-99 y reutiliza el generador PDF de reportes; ProveedoresService suma '
    'desactivar y reactivar, y OrdenesIngresoService valida el estado del proveedor. La figura {n} muestra las clases del incremento 4.')
FIG('Objetos de una toma de inventario confirmada', D4 + 'objetos-toma.png',
    'El diagrama de objetos usa la toma de las pruebas del capítulo 10: una bodega, sus líneas de consumibles y series '
    'y los movimientos de ajuste generados al confirmar. La figura {n} muestra los objetos de una toma confirmada.')

h2('Modelo físico y relaciones entre tablas')
p('El docente observó en el Incremento 3 que el modelo físico no mostraba las relaciones entre tablas. Al revisar el '
  'esquema se confirmó que varias columnas apuntaban a otra tabla sin una clave foránea declarada. El script de '
  'migración agrega ahora 45 claves foráneas, con lo que el esquema queda con 72. Cada una se crea como NOT VALID y '
  'luego se valida, para no bloquear una base con datos antiguos inconsistentes.')
p('Se dejaron sin clave foránea, a propósito, las columnas que guardan identificadores externos (G3 y G8), las de '
  'auditoría que usan 0 para eventos del sistema y las de integraciones que reciben identificadores de técnicos de otro '
  'sistema. El anexo 13.2 lista las 45 relaciones.')
FIG('Modelo físico general con relaciones', D4 + 'modelo-fisico-general.png',
    'El color de cada tabla indica su incremento: azul I1, verde I2, ámbar I3 y violeta I4. Las líneas violetas son las '
    'claves foráneas agregadas en este incremento. La figura {n} muestra el modelo físico general con relaciones.', width_cm=16, max_h_cm=22)
FIG('Modelo físico de toma de inventario y proveedores', D4 + 'modelo-fisico-toma-proveedor.png',
    'Este detalle muestra todas las columnas, tipos y claves de las tablas que usan los tres casos nuevos. La figura {n} '
    'muestra el modelo físico de toma de inventario y proveedores.', max_h_cm=20)
FIG('Modelo físico de cierres e integraciones', D4 + 'modelo-fisico-cierres.png',
    'El área de cierres e integraciones es la que recibió más relaciones nuevas. La figura {n} muestra su modelo físico.', max_h_cm=21)
fks = json.load(open('/tmp/fk45.json'))
areas = {}
for t, c, rt, rc in fks:
    areas.setdefault(t, []).append(c)
T('Tablas nuevas y relaciones agregadas en el incremento 4', ['Tabla', 'Incremento', 'Cambio'], [
    ['toma_inventario', 'I4', 'Tabla nueva: cabecera de la toma (bodega, empresa, estado, usuarios y fechas).'],
    ['toma_inventario_detalle', 'I4', 'Tabla nueva: líneas esperadas y contadas por tipo de equipo o unidad.'],
    ['proveedor', 'I2', 'Sin columnas nuevas: CU-98 usa la columna activa existente.'],
    ['24 tablas existentes', 'I1 a I3', 'Reciben 45 claves foráneas nuevas (detalle en el anexo 13.2).'],
], widths=[1.5, 0.8, 3.4], fuente=F_BD)

h2('Formas normales y estados')
p('Las dos tablas nuevas siguen el patrón cabecera y detalle ya usado en salidas, préstamos y órdenes de ingreso. '
  'La tabla 5.2 resume cómo cumplen las formas normales.')
T('Formas normales de las tablas nuevas', ['Forma', 'Aplicación', 'Ejemplo'], [
    ['1FN', 'Atributos escalares; cada línea contada es una fila', 'Una fila de toma_inventario_detalle por consumible o por serie'],
    ['2FN', 'Los datos de la toma dependen de id_toma y los de la línea de id_detalle', 'Bodega y fechas en la cabecera; cantidades en el detalle'],
    ['3FN', 'Los datos de otras entidades se referencian por clave', 'Nombre de bodega, tipo y usuario se obtienen por FK'],
    ['Instantánea', 'cantidad_esperada y numero_serie se copian al abrir la toma', 'Duplicación intencional para conservar lo que se esperaba al contar'],
], widths=[0.8, 2.4, 2.4], fuente=F_BD)
FIG('Estados de la toma de inventario y del proveedor', D4 + 'estados-i4.png',
    'La toma tiene tres estados y el acta solo se genera en CONFIRMADA; el proveedor alterna entre activo e inactivo. '
    'Las unidades no ganan estados nuevos: una serie faltante solo se informa. La figura {n} muestra los estados.', width_cm=13)

# =====================================================================================
h1('VISTA DE PROCESOS')
p('Cada diagrama de secuencia parte en la vista que usa el actor (V_) y muestra el paso por el controlador, el servicio '
  'y las tablas. Los colores identifican la capa: vista en azul, control en verde y persistencia en naranja. Todas las '
  'llamadas tienen su retorno.')
SEQS = [
    ('CU-97', 'Registrando toma de inventario físico y ajuste de diferencias', 'El encargado abre la toma, registra lo contado y la confirma; la precondición es que la bodega no tenga otra toma abierta.',
     [('CU97/CU97-normal.png', 'flujo normal'), ('CU97/CU97-exc-toma-abierta.png', 'excepción toma abierta'), ('CU97/CU97-exc-movimientos-conteo.png', 'excepción movimientos durante el conteo')],
     'Stock ajustado, movimientos AJUSTE_INVENTARIO y toma confirmada.'),
    ('CU-98', 'Desactivando proveedor', 'El administrador desactiva un proveedor desde el listado; la precondición es que el proveedor esté activo.',
     [('CU98/CU98-normal.png', 'flujo normal'), ('CU98/CU98-exc-ordenes-pendientes.png', 'excepción órdenes pendientes')],
     'Proveedor inactivo y evento DESACTIVAR en auditoría.'),
    ('CU-99', 'Generando acta de toma de inventario en PDF', 'El encargado descarga el acta desde el detalle de la toma; la precondición es que la toma esté confirmada.',
     [('CU99/CU99-normal.png', 'flujo normal'), ('CU99/CU99-exc-toma-no-confirmada.png', 'excepción toma no confirmada')],
     'Archivo PDF entregado y evento GENERAR_ACTA_TOMA_INVENTARIO en auditoría.'),
]
for cu, nombre, intro, figs, res in SEQS:
    h2(f'{cu} — {nombre}')
    p(intro)
    for f, t in figs:
        FIG(f'{cu} — {t}', SEQ + f, f'La figura {{n}} muestra el detalle de {cu} — {t}.', max_h_cm=20)
    p(f'Resultado del proceso: {res}')

# =====================================================================================
h1('VISTA DE DESARROLLO')
h2('Componentes y organización del código')
p('Los casos nuevos se agregan como un módulo NestJS (tomas-inventario) y como ampliaciones de los módulos proveedores '
  'y ordenes-ingreso, con sus rutas SvelteKit. No se agregan dependencias: el acta reutiliza el generador PDF propio de '
  'reportes (CU-93).')
FIG('Componentes del incremento 4', D4 + 'componentes-i4.png',
    'La figura {n} muestra los componentes que intervienen en el incremento y sus dependencias.', width_cm=13)
T('Mapa de implementación por caso', ['CU', 'Backend', 'Rutas API', 'Frontend', 'Dependencia'], [
    ['CU-97', 'tomas-inventario', 'POST /tomas-inventario; PATCH /:id/conteo; POST /:id/confirmar y /:id/cancelar', '/tomas-inventario y /tomas-inventario/[id]', 'CU-44, CU-45'],
    ['CU-98', 'proveedores, ordenes-ingreso', 'PATCH /proveedores/:id/desactivar y /:id/reactivar', '/proveedores', 'CU-49 a CU-52'],
    ['CU-99', 'tomas-inventario, reportes/pdf-reporte', 'GET /tomas-inventario/:id/acta', '/tomas-inventario/[id]', 'CU-97, CU-93'],
], widths=[0.8, 1.4, 2.3, 1.6, 0.9], fuente='Fuente: Elaborado por los estudiantes a partir del código de la rama del incremento, 2026.')
h2('Decisiones de implementación')
T('Decisiones de implementación del incremento', ['Tema', 'Decisión', 'Motivo'], [
    ['Ajuste de stock', 'La diferencia se suma al stock actual y no se reemplaza por lo contado', 'No pisar movimientos registrados mientras se contaba'],
    ['Una toma por bodega', 'Validación en el servicio e índice único parcial uq_toma_abierta_por_bodega', 'Evitar dos conteos simultáneos aunque lleguen dos solicitudes a la vez'],
    ['Series faltantes', 'Se informan en la toma y en el acta, sin cambiar el estado de la unidad', 'No inventar un estado nuevo; la baja sigue su propio caso de uso'],
    ['Proveedor inactivo', 'Se usa la columna activa existente y se valida también en el backend', 'Que una orden con proveedor inactivo no entre ni por la API'],
    ['Acta PDF', 'Reutiliza construirPdfReporte de CU-93', 'Mismo formato que los reportes y sin librerías nuevas'],
    ['Claves foráneas', 'Se crean NOT VALID y luego se validan; si una falla, solo se avisa', 'Que la migración no se caiga en bases con datos antiguos'],
], widths=[1.1, 2.5, 2.2])

# =====================================================================================
h1('VISTA FÍSICA')
p('El cambio principal del incremento es el entorno de producción. El sistema dejó Railway y quedó en la VPS FiNet del '
  'curso, compartida con los demás grupos. La figura 8.1 muestra cómo se conectan los componentes.')
FIG('Despliegue del sistema en la VPS FiNet', D4 + 'despliegue-vps.png', None, width_cm=14, fuente=F_VPS)
h2('Entorno de producción')
T('Configuración de producción en la VPS FiNet', ['Elemento', 'Configuración', 'Propósito'], [
    ['Servidor', 'VPS 38.7.201.104, Ubuntu 20.04, Docker rootless; cuenta grupo1 en /srv/finet/grupo1', 'Servidor compartido del curso'],
    ['Contenedores', 'nginx, frontend (SvelteKit), backend (NestJS) con docker-compose.vps.yml', 'Aplicación del grupo 1'],
    ['Entrada de usuarios', '127.0.0.1:8100 en la VPS, por túnel SSH', 'Política de la VPS: sin servicios abiertos a Internet'],
    ['Integraciones', 'nginx del administrador: https://38.7.201.104:8143/api/integraciones/ con certificado válido', 'Webhooks de cierre de G3 y consultas de G8 con X-API-KEY'],
    ['Base de datos', 'finet_global_validacion (PostgreSQL 15), rol g1_app, acceso por 10.0.2.2:8150', 'Base global de validación compartida por los grupos'],
    ['Arranque', 'OMITIR_MIGRACIONES y OMITIR_SEED en true', 'No alterar la base global al reiniciar el backend'],
], widths=[1.1, 3.0, 1.9], fuente=F_VPS)
h2('Instalación, configuración y operación')
p('La guía de instalación entregada junto a este informe detalla los pasos. En resumen: se clona la rama main en '
  '/srv/finet/grupo1, se crea el archivo .env a partir de vps.env.example con secretos generados con openssl, se levanta '
  'docker-compose.vps.yml y se comprueba /api/health/ping. Para usar la aplicación se abre un túnel SSH desde el '
  'computador y se entra a http://127.0.0.1:18100.')
p('Para actualizar a una versión nueva no hay despliegue automático: después de integrar en main, se ejecuta git pull y '
  'docker compose up -d --build en la VPS. Antes de cambiar la conexión a la base se respalda el archivo .env, lo que '
  'permite volver a la configuración anterior con una sola copia.')
h2('Hitos del despliegue')
T('Hitos del despliegue en la VPS', ['Fecha', 'Hito', 'Evidencia'], [
    ['04-11', 'Compose y guía de despliegue para la VPS', 'PR #76'],
    ['05-11', 'Aplicación en la VPS con los cuatro contenedores sanos; publicación de integraciones con HTTPS', 'PR #77; respuesta 401 sin clave y 200 con la clave de G3 y G8'],
    ['06-11', 'Opción para usar la base global; conexión a la base global de prueba', 'PR #79 y #80'],
    ['08-11', 'Equivalencia de roles y búsqueda del técnico del cierre por id, RUT o usuario', 'PR #82, #84 y #86'],
    ['08-11', 'Cambio a la base global de validación finet_global_validacion', 'Inicio de sesión y cierres de prueba de G3'],
    ['08-11', 'Cierre de reparación con los datos que envía G3', 'PR #87'],
], widths=[0.6, 3.4, 2.0], fuente=F_GIT)
p('Los casos CU-98 y CU-99 y las claves foráneas llegan a la VPS cuando la PR #89 se integre en dev y luego en main. '
  'Como la base global se inicia con OMITIR_MIGRACIONES, las claves foráneas se aplicarán en ella con el administrador '
  'usando la misma lista del script de migración.')

# =====================================================================================
h1('ÁRBOL DE NAVEGACIÓN Y VISTAS DEL SISTEMA')
p('El árbol de navegación del Incremento 3 se amplía con los nodos del Incremento 4, marcados en violeta: Toma de '
  'inventario con su detalle y el acta, y las acciones de desactivar y reactivar en Proveedores.')
FIG('Árbol de navegación identificado por incremento', R + 'diagramas/arbol-navegacion/arbol-navegacion-incremento4.png', None, width_cm=12.5, max_h_cm=22)
T('Procedencia de las pantallas del incremento', ['Pantalla', 'Incremento de origen', 'Aporte del incremento 4'], [
    ['Toma de inventario (listado y detalle)', 'I4', 'CU-97 apertura, conteo, confirmación y cancelación; CU-99 descarga del acta'],
    ['Proveedores', 'I2 (CU-49 a CU-51)', 'CU-98 botones Desactivar y Reactivar con confirmación'],
    ['Órdenes de ingreso', 'I2 (CU-52)', 'Solo ofrece proveedores activos'],
    ['Menú lateral', 'I1', 'Nueva entrada Toma de inventario'],
], widths=[1.8, 1.3, 2.9])
PANT = [
    ('Listado de tomas de inventario', 'CU97-listado-tomas.png', 'El listado muestra las tomas de la empresa con su bodega, estado y fechas, y permite abrir una nueva.'),
    ('Conteo de una toma abierta', 'CU97-conteo-abierta.png', 'En el detalle se registran las cantidades y las series; cada línea muestra su resultado antes de confirmar.'),
    ('Toma confirmada con acceso al acta', 'CU99-toma-confirmada.png', 'Al confirmar, la toma queda cerrada y aparece el botón Descargar acta PDF.'),
    ('Acta de toma de inventario en PDF', 'CU99-acta-pdf.png', 'El acta muestra el encabezado de la toma y la tabla de líneas con esperado, contado, diferencia y resultado.'),
    ('Listado de proveedores con acciones de vigencia', 'CU98-listado.png', 'Cada proveedor tiene el botón Desactivar o Reactivar según su estado.'),
    ('Confirmación de desactivación', 'CU98-confirmacion.png', 'Antes de desactivar se pide confirmación y se explica el efecto sobre las órdenes de ingreso.'),
    ('Proveedor inactivo', 'CU98-inactivo.png', 'El proveedor queda marcado como inactivo y conserva sus datos.'),
    ('Rechazo por órdenes pendientes', 'CU98-E2-ordenes-pendientes.png', 'Si el proveedor tiene órdenes pendientes, el sistema muestra el motivo y no lo desactiva.'),
    ('Reactivación de proveedor', 'CU98-reactivar.png', 'La reactivación usa el mismo diálogo de confirmación.'),
    ('Orden de ingreso solo con proveedores activos', 'ordenes-ingreso.png', 'El formulario de órdenes de ingreso no ofrece los proveedores inactivos.'),
]
for t, f, d in PANT:
    h2(t)
    FIG(t, EV + f, d + ' La figura {n} muestra esta pantalla.', width_cm=15, fuente=F_CAP)

# =====================================================================================
h1('EVIDENCIAS DE PRUEBAS')
h2('Método, alcance y resultados')
p('Las pruebas se ejecutaron el 9 de noviembre de 2026 con el código de la rama del incremento, en un entorno local '
  'con PostgreSQL 16, la base inicializada con init.sql, las migraciones y el seed QA, y datos ficticios. Se combinaron '
  'solicitudes HTTP reales, recorridos de interfaz con capturas y las pruebas unitarias del backend.')
T('Resultados de la ejecución', ['Conjunto', 'Escenarios', 'Correctos', 'Archivo de evidencia'], [
    ['API CU-97 y CU-99', '5', '5', 'resultados/pruebas-api-cu97-cu99.txt'],
    ['API CU-98', '5', '5', 'resultados/pruebas-api-cu98.txt'],
    ['Unitarias de CU-97, CU-98 y CU-99', '26', '26', 'resultados/unitarios-i4.log'],
    ['Suite completa del backend (regresión)', '174', '174', 'resultados/unitarios.log'],
], widths=[2.2, 0.8, 0.8, 2.4], fuente=F_PRU)
p('Identificadores: P = prueba funcional; N = flujo normal; E1, E2 y E3 = excepciones del caso extendido; R = flujo '
  'alternativo de reactivación. Las respuestas completas están en los archivos de evidencia de docs/incremento-4.')
h2('Fichas de prueba')
FICHAS = [
    ('CU-97', 'Confirmación de toma con diferencias', 'P97-N', 'Toma confirmada y movimientos de ajuste', '201', 'Estado CONFIRMADA; Conector 5→4 FALTANTE, Fibra 450,5 COINCIDE, UTP 320→322 SOBRANTE, DEMO-ONT-0002 FALTANTE'),
    ('CU-97', 'Abrir una segunda toma en la misma bodega', 'P97-E1', '409 por toma abierta', '409', '«La bodega ya tiene una toma abierta (#2).»'),
    ('CU-98', 'Desactivar proveedor sin órdenes pendientes', 'P98-N', 'Proveedor inactivo', '200', 'Importadora Pacífico SpA con activa = false'),
    ('CU-98', 'Desactivar un proveedor ya inactivo', 'P98-E1', '409', '409', '«El proveedor ya está inactivo.»'),
    ('CU-98', 'Desactivar proveedor con órdenes pendientes', 'P98-E2', '409 con la cantidad de órdenes', '409', '«El proveedor tiene 1 orden(es) de ingreso pendiente(s) de recepción…»'),
    ('CU-98', 'Crear orden de ingreso con proveedor inactivo', 'P98-E3', '400', '400', '«El proveedor seleccionado está inactivo.»'),
    ('CU-98', 'Reactivar proveedor', 'P98-R', 'Proveedor activo', '200', 'Importadora Pacífico SpA con activa = true'),
    ('CU-99', 'Descargar acta de toma confirmada', 'P99-N', 'Archivo PDF', '200', 'application/pdf, acta-toma-1-20261109.pdf, 11 líneas'),
    ('CU-99', 'Descargar acta de toma abierta', 'P99-E1', '409', '409', '«Solo se puede generar el acta de una toma confirmada.»'),
    ('CU-99', 'Descargar acta de otra empresa (admin_cable)', 'P99-E2', '404', '404', '«Toma de inventario no encontrada.»'),
]
for cu, esc, pid, esp, http, obs in FICHAS:
    h3(f'{cu} — {esc} [{pid}]')
    KV(f'Ficha de prueba {pid}', [['Caso de uso', cu], ['Escenario y acción', esc], ['Resultado esperado', esp],
        ['Estado HTTP', http], ['Resultado observado', obs], ['Veredicto', 'Cumple la expectativa registrada'],
        ['Fecha', '2026-11-09']], head=('Campo', 'Evidencia'), fuente=F_PRU)
h2('Pruebas automatizadas')
UNIT = [l.strip()[3:] for l in open(R + 'docs/incremento-4/resultados/unitarios-i4.log') if l.startswith('OK ')]
T('Pruebas unitarias de los casos del incremento', ['N°', 'Prueba', 'Resultado'],
  [[str(i + 1), u, 'Aprobada'] for i, u in enumerate(UNIT)], widths=[0.4, 4.6, 0.9], fuente=F_PRU)
h2('Regresión e integridad del esquema')
p('La suite completa del backend (174 pruebas) se ejecutó después de agregar los tres casos y las claves foráneas, sin '
  'fallas. Además, el script de migración se probó en tres situaciones: base nueva creada con init.sql, base vacía sin '
  'init.sql y una segunda ejecución sobre una base ya migrada. En las tres terminó sin errores, el seed QA cargó '
  'completo y se validaron las 72 claves foráneas.')

# =====================================================================================
h1('CONTROL DE VERSIONES Y TRAZABILIDAD')
p('El desarrollo se integra en dev mediante Pull Requests revisadas por el jefe de grupo, y dev se integra en main, la '
  'rama que se despliega en la VPS. En este incremento parte del código se preparó con asistencia de IA (Claude Code), '
  'que aparece como autor «Claude» en el historial; cada cambio fue revisado e integrado por el jefe de grupo.')
T('Aportes de implementación del incremento', ['Integrante', 'Aporte', 'Evidencia'], [
    ['Javier Farías', 'CU-97, CU-98, CU-99, claves foráneas, despliegue en la VPS e integraciones', 'PR #76 a #89'],
    ['Kevin Cifuentes', 'Informe del incremento y diagramas', 'Planilla de organización'],
    ['Tomás Heilenkötter', 'Pruebas del incremento', 'Planilla de organización'],
    ['Javiera Morán', 'Presentación, proceso final y aceptación', 'Planilla de organización'],
    ['Uriel Navarrete', 'Trabajo incremental, traza y observaciones de documentos anteriores', 'Planilla de organización'],
], widths=[1.3, 3.2, 1.4], fuente=F_GIT)
COMMITS = [
    ['2026-11-09 / 65160f3', 'Claude', 'docs(I4): diagramas, modelo físico con FK y burn charts'],
    ['2026-11-09 / d8f124f', 'Claude', 'docs(I4): evidencias y mapa de CU-98 y CU-99'],
    ['2026-11-09 / f9dae72', 'Claude', 'fix(BD): agregar las FK que faltaban en el modelo físico'],
    ['2026-11-09 / 87bc5da', 'Claude', 'feat(CU-99): acta PDF de la toma de inventario'],
    ['2026-11-09 / 9917e23', 'Claude', 'feat(CU-98): desactivar y reactivar proveedor'],
    ['2026-11-08 / afa4836', 'Javier Farías', 'Merge pull request #87'],
    ['2026-11-08 / edda173', 'Claude', 'Cierre reparación: aceptar datos en primer nivel del JSON'],
    ['2026-11-08 / f2f091f', 'Javier Farías', 'Merge pull request #84'],
    ['2026-11-08 / c4c9971', 'Claude', 'Cierre de OT: identificar técnico por usuario_tecnico'],
    ['2026-11-08 / 4cb50ab', 'Javier Farías', 'Merge pull request #82'],
    ['2026-11-08 / 8f02210', 'Claude', 'Equivalencia de roles y técnico del cierre para la BDD global'],
    ['2026-11-05 / d52f3c6', 'Javier Farías', 'Merge pull request #80 (dev a main)'],
    ['2026-11-06 / 87f2e09', 'Claude', 'deploy: opción para usar la BDD global en la VPS'],
    ['2026-11-05 / ca7de46', 'Claude', 'deploy: script para poblar equipos en la VPS'],
    ['2026-11-05 / ae283f4', 'Javier Farías', 'Merge pull request #78'],
    ['2026-11-04 / 8b589e9', 'Javier F', 'feat(CU-97): toma de inventario físico y ajuste de diferencias'],
    ['2026-11-04 / ec7d9ac', 'Javier Farías', 'Merge pull request #76'],
    ['2026-11-04 / 12e2601', 'Claude', 'deploy: compose y guía para la VPS FiNet'],
]
T('Registro de commits del periodo', ['Fecha / SHA', 'Autor', 'Descripción'], COMMITS, widths=[1.5, 1.0, 3.4], fuente=F_GIT)
T('Traza de extremo a extremo', ['RF / CU', 'Implementación', 'Pruebas', 'Documentación'], [
    ['RF-71 / CU-97', 'tomas-inventario', 'P97-N, P97-E1, 17 unitarias', 'Cap. 2, 4, 5, 6, 9 y 10; docs/05-backend/tomas-inventario.md'],
    ['RF-72 / CU-98', 'proveedores, ordenes-ingreso', 'P98-N, E1, E2, E3, R, 6 unitarias', 'Cap. 2, 4, 6, 9 y 10; docs/05-backend/proveedores.md'],
    ['RF-73 / CU-99', 'tomas-inventario', 'P99-N, E1, E2, 3 unitarias', 'Cap. 2, 4, 6, 9 y 10; docs/05-backend/tomas-inventario.md'],
], widths=[1.1, 1.5, 1.7, 2.6])

# =====================================================================================
h1('RETROSPECTIVA Y CONCLUSIÓN')
h2('Inspección del incremento')
T('Retrospectiva y acciones de mejora', ['Hecho observado', 'Causa', 'Acción', 'Criterio de cierre'], [
    ['El despliegue tomó más tiempo que el desarrollo', 'Servidor compartido con permisos y red controlados por el administrador', 'Documentar cada acuerdo y dejar vuelta atrás (.env de respaldo)', 'Guía de despliegue al día y app funcionando'],
    ['Datos distintos entre grupos en la base global', 'Cada grupo definió sus roles y formatos', 'Tabla de equivalencia de roles y búsqueda flexible del técnico', 'Cierres de G3 procesados sin discrepancias de técnico'],
    ['Faltaban relaciones en el modelo físico', 'Columnas creadas sin FK en incrementos anteriores', 'Script de migración con las 45 FK y diagramas regenerados', '72 FK validadas en una base nueva'],
    ['La pila no mostraba el trabajo incremental', 'Se presentaba solo el sprint actual', 'Pila por incremento y burn charts del proyecto', 'Tablas 3.1 y 3.2 y figuras 3.1 a 3.4'],
    ['Trabajo concentrado en una persona', 'El despliegue y la integración requerían acceso a la VPS', 'Repartir documentación, pruebas y presentación', 'Planilla de organización con autor y revisor por capítulo'],
], widths=[1.4, 1.5, 1.6, 1.5])
h2('Alcance del incremento y del proyecto')
T('Alcance final del proyecto', ['Incremento', 'CU del incremento', 'Acumulado', 'Mínimo exigido', 'Cumple'], [
    ['I1', '46', '46,46 %', '30 %', 'Sí'], ['I2', '31', '77,78 %', '70 %', 'Sí'],
    ['I3', '19', '96,97 %', '95 %', 'Sí'], ['I4', '3', '100 %', '100 %', 'Sí'],
], widths=[1, 1, 1, 1, 0.8])
p('Las figuras 3.3 y 3.4 muestran la misma información en forma gráfica. Con este incremento el sistema cubre los 99 '
  'casos de uso del proyecto y queda en producción.')
h2('Conclusión')
p('El Incremento 4 cierra el proyecto con los 99 casos de uso implementados. La toma de inventario y su acta permiten '
  'cuadrar la bodega con lo que existe físicamente y dejar respaldo del resultado, y la desactivación de proveedores '
  'evita compras a proveedores dados de baja sin perder su historial. Las 45 claves foráneas agregadas hacen que el '
  'modelo físico refleje todas las relaciones del sistema.')
p('El sistema quedó desplegado en la VPS FiNet, conectado a la base global de validación y recibiendo los cierres del '
  'Grupo 3 y las consultas del Grupo 8 por HTTPS. Para la continuidad quedan dos tareas operativas: integrar la PR #89 '
  'en main y actualizar la VPS, y aplicar las claves foráneas en la base global junto con su administrador.')

# =====================================================================================
h1('ANEXOS Y REFERENCIAS')
h2('Diccionario físico de las tablas del incremento')
import subprocess as sp
q = ("select table_name, column_name, data_type, coalesce(character_maximum_length::text,'-'), is_nullable, coalesce(column_default,'-') "
     "from information_schema.columns where table_schema='public' and table_name in ('toma_inventario','toma_inventario_detalle','proveedor') "
     "order by table_name, ordinal_position")
rows = sp.run(['psql', '-h', '/var/tmp/pgi4', '-p', '5544', '-U', 'postgres', '-d', 'inv2', '-At', '-F', '\t', '-c', q], capture_output=True, text=True).stdout.strip().split('\n')
fkmap = {}
for l in open('/tmp/allfk.txt'):
    t, c, rt, rc, n = l.strip().split('|')
    fkmap[(t, c)] = f'FK → {rt}.{rc}'
dic = {}
for l in rows:
    t, c, dt, ml, nul, de = l.split('\t')
    tipo = dt.replace('character varying', 'varchar').replace('timestamp with time zone', 'timestamptz')
    if ml != '-':
        tipo += f'({ml})'
    clave = 'PK' if c == {'toma_inventario': 'id_toma', 'toma_inventario_detalle': 'id_detalle', 'proveedor': 'id_proveedor'}[t] else fkmap.get((t, c), '')
    dic.setdefault(t, []).append([c, tipo, 'Sí' if nul == 'YES' else 'No', clave])
for t in ('toma_inventario', 'toma_inventario_detalle', 'proveedor'):
    h3(t)
    T(f'Diccionario de {t}', ['Columna', 'Tipo', 'Nulo', 'Clave'], dic[t], widths=[1.6, 1.4, 0.6, 2.0], fuente=F_BD)
h2('Claves foráneas agregadas en el incremento 4')
T('Claves foráneas agregadas por la migración', ['N°', 'Tabla', 'Columna', 'Referencia'],
  [[str(i + 1), t, c, f'{rt}.{rc}'] for i, (t, c, rt, rc) in enumerate(fks)], widths=[0.4, 2.0, 1.7, 2.0], fuente=F_BD)
h2('Proceso operativo con el sistema implementado')
p('El proceso final integra el control físico de la bodega al ciclo de operación: el encargado abre la toma, cuenta y '
  'confirma; el sistema ajusta el stock y genera el acta; si en la revisión se detecta un proveedor que ya no se usará, '
  'el administrador lo desactiva para que no entre en nuevas órdenes de ingreso.')
FIG('Proceso operativo final con el sistema', D4 + 'proceso-final.png',
    'El diagrama usa carriles por actor y notación de actividades equivalente a BPMN. La figura {n} muestra el proceso final.', width_cm=14, max_h_cm=19)
T('Cambios del proceso inicial al proceso implementado', ['Etapa', 'Situación inicial (Documento 0)', 'Proceso con el sistema', 'Traza'], [
    ['Conteo físico', 'Planilla impresa y conteo manual', 'Toma con lo esperado precargado y conteo por línea o serie', 'CU-97'],
    ['Ajuste de diferencias', 'Corrección manual del saldo', 'Movimientos AJUSTE_INVENTARIO automáticos y auditados', 'CU-97'],
    ['Respaldo del conteo', 'Planilla firmada sin vínculo con el sistema', 'Acta PDF generada desde la toma confirmada', 'CU-99'],
    ['Proveedores', 'Lista informal de proveedores vigentes', 'Proveedor inactivo bloqueado en nuevas órdenes de ingreso', 'CU-98'],
], widths=[1.1, 1.6, 2.4, 0.6])
p('Se adjuntan proceso-final.puml, su versión editable proceso-final.drawio y el PNG en diagramas/incremento4. El proceso '
  'Bizagi de referencia corresponde al Documento 0.')
h2('Referencias')
for ref in [
    'Grupo 1. (2026a). Grupo 1 – Documento 0: Sistema de Gestión Integral para Finet y Cable Mágico Litoral [Documento de proyecto].',
    'Grupo 1. (2026b). Grupo 1 – Incremento 3 [Informe de entrega]. Google Drive.',
    'Grupo 1. (2026c). Team 1-Inventario-y-Bodega [Código fuente y documentación]. GitHub. https://github.com/FSM-Finet-y-Cable-Magico/Team_1-Inventario-y-Bodega',
    'Grupo 1. (2026d). Despliegue en la VPS FiNet [Guía técnica]. GitHub. https://github.com/FSM-Finet-y-Cable-Magico/Team_1-Inventario-y-Bodega/blob/main/codigo/DESPLIEGUE-VPS.md',
    'Grupo 3. (2026). Team-3-FSM [Código fuente del sistema de terreno]. Repositorio del proyecto.',
    'PostgreSQL Global Development Group. (2025). PostgreSQL 16 documentation: ALTER TABLE. https://www.postgresql.org/docs/16/sql-altertable.html',
    'Quinsacara Jofré, P. (2026). Rúbrica para proyecto de Ingeniería de Software I y II (versión 5) [Rúbrica de evaluación].',
    'Schwaber, K., & Sutherland, J. (2020). The Scrum Guide. https://scrumguides.org/scrum-guide.html',
]:
    p(ref)

# ------------------------------------------------------------------ armar, renderizar y paginar
PJ = OUT.replace('.docx', '-paginas.json')
pages = json.load(open(PJ)) if len(sys.argv) > 2 and os.path.exists(PJ) else {}
doc.build(pages)
doc.save(OUT)
outdir = os.path.dirname(OUT)
sp.run(['soffice', '--headless', '--convert-to', 'pdf', '--outdir', outdir, OUT], capture_output=True)
pdf = OUT.replace('.docx', '.pdf')
allp = {}
for key in ('cont', 'fig', 'tab'):
    labs = [e[1] for e in doc.entries[key]]
    got, n, start = paginas(pdf, labs)
    allp.update(got)
    print(key, len(labs), 'encontradas', len(got), 'faltan', [l for l in labs if l not in got][:5])
if not pages:
    json.dump(allp, open(PJ, 'w'), ensure_ascii=False, indent=1)
else:
    print('cambios de pagina vs pasada 1:', sum(1 for k in allp if pages.get(k) != allp[k]))
print('pdf pages', n, 'body start', start + 1)
