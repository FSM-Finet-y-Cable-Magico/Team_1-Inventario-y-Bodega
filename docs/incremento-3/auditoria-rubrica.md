# Auditoría de rúbrica del Incremento 3

Fecha: 1 de octubre de 2026. Aplicación probada en dev `a810aa40`.

## Resultado de esta pasada

Se incorporaron registros reales de Shortcut, reparto de revisión entre cinco integrantes, proceso de reuniones de I2 confirmado por el jefe, 234 versiones Draw.io, proceso final BPMN y seis registros adicionales de prueba. El total es 70 registros: 65 escenarios funcionales y cinco ensayos de concurrencia.

Los 64 criterios siguientes conservan evidencia y límites. Un criterio parcial no se declara cumplido por aparecer en el informe.

| ID | Rúbrica | Criterio | Estado | Evidencia | Cierre |
|---|---|---|---|---|---|
| R01 | 2, 11 | Portada: título, integrantes completos y orden por apellido | Comprobado | Portada: Cifuentes, Farías, Heilenkötter, Morán y Navarrete. | Sin acción adicional en esta auditoría. |
| R02 | 2, 12 | Índice de contenidos | Comprobado | Preliminares; referencias contrastadas con PDF. | Sin acción adicional en esta auditoría. |
| R03 | 2, 12 | Índice de figuras | Comprobado | Índice de figuras con referencias contrastadas con el PDF; incluye proceso final y asignación Shortcut. | Sin acción adicional en esta auditoría. |
| R04 | 2, 12 | Índice de tablas | Comprobado | Preliminares; correlativos por capítulo. | Sin acción adicional en esta auditoría. |
| R05 | 2 | Introducción | Comprobado | Capítulo 1: problema, solución, alcance y corte de dev. | Sin acción adicional en esta auditoría. |
| R06 | 2, 8 | Propuesta y alcance del incremento | Comprobado | 2.1: 46 + 31 + 19 = 96; I3 19,79 % y acumulado 100 % declarado. | Sin acción adicional en esta auditoría. |
| R07 | 8 | Umbral I3 de al menos 95 % | Parcial | 2.1: 96 CU declarados; 19 tratados en I3. Existen discrepancias funcionales y aceptación pendiente. | No equiparar roadmap con aceptación sin reservas; revisar contrato y matriz de excepciones. |
| R08 | 3 | Product Backlog con RF, prioridad y responsable | Comprobado | 3.1 y matriz RF–CU; responsables de implementación identificados. | Sin acción adicional en esta auditoría. |
| R09 | 3 | Planificación del sprint y tiempo estimado | Parcial | 3.1–3.2: criterio I2 de 2 HH/CU aplicado a 19 CU (38 HH); 19 tickets con responsables y fechas reales. | Shortcut permanece Unestimated; no presentar las horas referenciales como estimación histórica registrada. |
| R10 | 3 | Sprint Backlog vinculado a vista externa | Comprobado | 3.1 y capítulo 4: 19 CU del alcance; 3.2 tareas de cierre separadas. | Sin acción adicional en esta auditoría. |
| R11 | 3–4 | Las cuatro vistas restantes del sprint | Comprobado | Capítulos 5–8: lógica, procesos, desarrollo y física. | Sin acción adicional en esta auditoría. |
| R12 | 3 | Casos de uso extendidos | Comprobado | 4.2–4.20: actores, resumen, frecuencia, precondición, flujo, excepciones y poscondición. | Sin acción adicional en esta auditoría. |
| R13 | 3 | Nombres de CU en gerundio | Comprobado | Los 19 nombres conservan la redacción de docs/casos-de-uso.json. | Sin acción adicional en esta auditoría. |
| R14 | 1, 3 | Requerimientos funcionales y UR ESA trazados | Corregido | 2.2: RF-43 recuperado al separar la referencia múltiple de CU-67. 2.3: UR originales con sus atributos ESA. | La fuente conserva algunos campos vacíos; se identifican sin inventar calificaciones. |
| R15 | 1, 3 | Matriz RF–CU y diagrama de CU | Corregido | 4.1 y 4.21; RF-42/RF-43 separados y ambos trazados a CU-67. | Sin acción adicional en esta auditoría. |
| R16 | 1, 9 | Requerimientos no funcionales aplicables | Parcial | 2.4 y 10.6: diez RNF, cinco ensayos de 20 solicitudes simultáneas; duraciones registradas. | Restan carga de cierre, sesiones reales, navegadores/SO, despliegue, HTTPS productivo, backup y separación por esquemas. |
| R17 | 4 | Vista lógica: clases y modelo de datos explicados | Comprobado | 5.1–5.4 y 13.1–13.2; relaciones, claves, unidades y consumibles contextualizados. | Sin acción adicional en esta auditoría. |
| R18 | 4 | Vista de procesos: secuencias de diseño entre objetos | Comprobado | Capítulo 6; vistas/controladores/servicios/BD y secuencias G3. | Sin acción adicional en esta auditoría. |
| R19 | 4 | Vista de desarrollo: componentes y estructura | Comprobado | 7.1–7.3: componentes, rutas, módulos, contrato y divergencias. | Sin acción adicional en esta auditoría. |
| R20 | 4 | Vista física: software y hardware/despliegue | Comprobado | Capítulo 8: diagrama y configuración QA; el despliegue productivo exigido por RNF-03 sigue sin verificarse. | Sin acción adicional en esta auditoría. |
| R21 | 4 | Explicación de cada vista, no solo imágenes | Comprobado | Capítulos 4–8 tienen texto de contexto y correspondencia con el sistema. | Sin acción adicional en esta auditoría. |
| R22 | 4 | Árbol de navegación | Comprobado | Capítulo 9 y fuente arbol-navegacion-incremento3.drawio; procedencia por incremento. | Sin acción adicional en esta auditoría. |
| R23 | 4 | Funcionamiento de pantallas | Comprobado | 9.1–9.24: 24 vistas actuales descritas, incluidas G3 y excepciones móviles. | Sin acción adicional en esta auditoría. |
| R24 | 3 | Evidencia de cada prueba ejecutada | Comprobado | Capítulo 10: 70 registros, 65 escenarios funcionales y cinco ensayos de concurrencia; fechas y respuestas adjuntas. | Sin acción adicional documental. |
| R25 | 3 | Cobertura de flujos y excepciones especificados | Parcial | 13.6: CU94 sin alertas comprobado; acuerdos #141/#145/#146/#147 recuperados. | Mantener límites exactos de CU63/67/69; no declarar pruebas no ejecutadas. |
| R26 | 5 | Daily diario: avance, siguiente trabajo e impedimentos | Parcial | 3.3: proceso de reuniones igual a I2 confirmado por jefe de grupo; seguimiento, próximos pasos e impedimentos trazados con Shortcut. | Frecuencia semanal frente a diaria de la rúbrica; no existen fechas/asistencias individuales de actas. |
| R27 | 5–6 | Sprint Review con equipo y Product Owner | Parcial | 3.4: Review técnica con objetivos, resultados, cambios del backlog, problemas y mejoras; tickets In Review. | Aceptación formal del Product Owner no registrada. |
| R28 | 6 | Retrospectiva: inspección y plan de mejora | Comprobado | 3.7 y 12: procedimiento I2 confirmado, inspección de hechos y plan de mejora con revisores asignados. | La revisión humana de acciones permanece por realizar. |
| R29 | 6 | Definición de terminado y calidad | Parcial | 3.4 y 10.5: 140/140 pruebas y 23/23 suites sobre dev con montaje de pruebas corregido en PR 67 (02-10-2026). | Persiste lint global: 1203 errores y 118 advertencias; los nueve archivos de prueba corregidos pasan ESLint. |
| R30 | 7 | PPT: portada, índice, alcance y traza Scrum++ | Corregido | Diapositiva 13: Planning 19 CU/38 HH, backlog #139–157, Review, retrospectiva y reparto de #160–173 visibles. | La presentación conserva la plantilla del I2. |
| R31 | 7 | PPT recomendada ≤7 min; total ≤15 min | Planificado | Guía: 6 min 30 s de presentación y 7 min 30 s de demo. | Ensayar y registrar la duración real; el guion no acredita el tiempo ejecutado. |
| R32 | 7, 9 | Todos presentes y presentan | Acción personal | Guía distribuye el recorrido de presentación. | Asistencia y participación reales del equipo. |
| R33 | 7–8 | Enviar por jefe de grupo; asunto y Drive | Acción personal | Entrega I3 hasta 04-10-2026 23:59; presentación semana 05-10. | Enviar desde el jefe con asunto Ingeniería de Software – Grupo 1 y enlace completo; registrar comprobante. |
| R34 | 8 | Incluir I2, I1 y Documento 0 corregidos | Parcial | Carpeta raíz de Drive contiene I2, I1 y acceso directo Documento 0. | Existencia comprobada; no se verificó el cierre integral de todas las correcciones en esos tres documentos. El I3 por sí solo no lo acredita. |
| R35 | 9 | Documento Word autocontenido | Parcial | RF, CU, vistas, pruebas, modelos y diccionario incluidos. Respuestas técnicas completas y fuentes editables van adjuntas. | Las diferencias de contrato y condiciones no ejecutadas permanecen explícitas; los modelos generales deben consultarse también en resolución original. |
| R36 | 9 | Transacciones en base de datos relacional | Comprobado | PostgreSQL, 32 tablas, claves y prueba de rollback. JSONB se distingue del núcleo transaccional. | Sin acción adicional en esta auditoría. |
| R37 | 9 | Word, PPT y documentos complementarios | Comprobado | Drive I3: DOCX, PDF, PPTX, XLSX y guía DOCX/PDF. | Sin acción adicional en esta auditoría. |
| R38 | 9 | Archivos Draw.io de secuencias, objetos y otros | Corregido | 234 archivos Draw.io con 31.414 objetos y textos editables, además de fuentes originales y árbol/despliegue. | Se conservan las geometrías de los SVG de PlantUML; las primitivas se pueden editar en Draw.io. |
| R39 | 9 | Documento de instalación | Comprobado | Guía de instalación y demo: requisitos, comandos, configuración, comprobación, respaldo y solución de problemas. | Sin acción adicional en esta auditoría. |
| R40 | 9 | Video de instalación | Pendiente del equipo | Guion preparado; carpeta I3 no contiene grabación. | Grabar y adjuntar el video correspondiente; comprobar audio, legibilidad y archivo reproducible. |
| R41 | 9 | Video de funcionalidades del incremento | Pendiente del equipo | Guion preparado; carpeta I3 no contiene grabación. | Grabar y adjuntar el video correspondiente; comprobar audio, legibilidad y archivo reproducible. |
| R42 | 9 | Video de presentación y demo por separado | Pendiente del equipo | Presentación y recorrido preparados; faltan archivos de grabación separados. | Grabar y adjuntar el video correspondiente; comprobar audio, legibilidad y archivo reproducible. |
| R43 | 9 | ZIP con archivos necesarios para ejecutar aplicación | Comprobado | ZIP del código y anexos de PR 67, con comprobación de integridad y archivos .env de ejemplo; revisión exacta registrada en el manifiesto de entrega. | El funcionamiento de servicios externos requiere su configuración; el ZIP no lleva secretos de producción. |
| R44 | 9 | Versionamiento Git de todos e informe de commits | Comprobado | Capítulo 11: 78 registros del periodo y aportes de cinco integrantes; PR 67 hacia dev. | Sin acción adicional en esta auditoría. |
| R45 | 9–10 | Excel: capítulo, contenido, autores y revisores | Corregido | Excel: capítulos, elaboración/fuentes, revisores asignados y 19 registros de desarrollo Shortcut. | La columna de revisión realizada permanece Pendiente hasta conformidad real. |
| R46 | 12 | Invocar y explicar cada figura/tabla antes de aparecer | Corregido | Invocaciones previas a tablas explican campos y propósito; figuras contextualizadas antes de aparecer. | Validar continuidad visual en la renderización final. |
| R47 | 13 | Numeración capítulo.correlativo | Comprobado | Figuras y tablas generadas por contador de capítulo; índices enlazados por etiqueta. | Sin acción adicional en esta auditoría. |
| R48 | 13 | Carta y márgenes de 2,5 cm | Comprobado | Secciones DOCX: 21,59 × 27,94 cm, cuatro márgenes 2,5 cm. | Sin acción adicional en esta auditoría. |
| R49 | 13 | Fuente Arial/TNR 12; leyendas recomendadas 9 | Corregido | Cuerpo TNR y tablas Arial, tamaño 12; leyendas 9. UR ESA restauradas con todos sus atributos y trazabilidad. | La versión de 187 páginas tenía todas las tablas a 10, parte de la reducción de tamaño. |
| R50 | 13 | Interlineado 1,5 y simple en anexos/leyendas/referencias | Corregido | Cuerpo con interlineado 1,5; tablas y material de anexo simple; leyendas 9. | Sin acción adicional en esta auditoría. |
| R51 | 13–14 | Texto justificado, títulos y sangría de subtítulos | Comprobado | Estilos DOCX: texto justificado, títulos a izquierda y sangría progresiva. | Sin acción adicional en esta auditoría. |
| R52 | 14 | Numeración romana y arábiga abajo a derecha a 1,5 cm | Comprobado | Preliminares romanos, cuerpo desde 1, pie a 1,5 cm; portada sin número. | Sin acción adicional en esta auditoría. |
| R53 | 14 | Capítulos/índices en página nueva; títulos en mayúsculas | Comprobado | Estilo Heading 1 con salto anterior; índices independientes. | Sin acción adicional en esta auditoría. |
| R54 | 13–14 | APA vigente y referencias al final | Corregido | Referencias ordenadas por autor, año, título, tipo y enlace cuando existe, con sangría francesa. | Documentos internos sin URL pública conservan identificación y procedencia; no se inventan DOI ni fecha exacta. |
| R55 | 4 | Levantamiento de procesos con sistema terminado | Parcial | 13.9: proceso final, comparación con proceso inicial, PNG, Draw.io y BPMN 2.0 con geometría. | Importación en Bizagi y guardado propietario .bpm no verificados; aplicación no disponible en este equipo. |
| R56 | 1, 9 | Complementos Documento 0: BPMN Bizagi, análisis, costos, CV y aceptación | Parcial | 13.10: Doc0 contiene análisis, modelos iniciales, CV, aceptación inicial, costos y planificación. Se identificaron figuras y secciones. | No se localizó .bpm editable; mención de 2025 en descripción A18 contradice planificación 2026. La aceptación inicial no sustituye cierre I3. |
| R57 | 9 | Integridad, originalidad, participación y entrega completa | Parcial | ZIP íntegro y fuentes trazables; informe de commits y datos QA identificados. | No se ha ejecutado análisis antivirus; originalidad/participación y completitud requieren evidencia del equipo, no certificación automática. |
| D03 | Observación3 | Pila sin I1 en proceso | Comprobado | 3.1 separa 77 CU terminados de tareas de revisión; no arrastra desarrollo histórico pendiente. | Sin acción adicional en esta auditoría. |
| D04 | Observación4 | Físico, diferencias, MERE/MR/FNs/ME en anexos | Comprobado | 2.1, 5 y 13: físico por áreas, esquema de 32 tablas, MERE histórico, MR/ME/FNs; límites de normalización explícitos. | Sin acción adicional en esta auditoría. |
| D05 | Observación5 | Eliminar hoja en blanco | Comprobado | Se eliminó un salto vacío detectado en la revisión de maquetación. El PDF corregido se vuelve a inspeccionar antes de publicar. | Sin acción adicional en esta auditoría. |
| D06 | Observación6 | Árbol identificado por incremento | Comprobado | Árbol I3 rotulado; matriz de pantallas y CU por procedencia. | Sin acción adicional en esta auditoría. |
| D07 | Observación7 | Vistas explicadas | Comprobado | Capítulos 4–9 incluyen explicación y capturas; no solo listado de imágenes. | Sin acción adicional en esta auditoría. |
| D08 | Observación8 | Evidencias de pruebas por incremento | Parcial | Inventario de los 96 CU, evidencias históricas y 70 registros actuales, incluido CU94 vacío. | Persisten condiciones exactas no ejecutadas de integración; ver 13.6. |
| D09 | Observación9 | Retrospectiva | Comprobado | Capítulo 12 y 3.7: retrospectiva, acciones y responsables de revisión; proceso confirmado por el jefe. | Conformidad humana se conserva como pendiente. |

## Reparto de revisión

- Javier: 160, 169, 173.
- Kevin: 162, 166, 172.
- Tomás: 163, 165, 171.
- Javiera: 161, 167, 170.
- Uriel: 164, 168 (vistas y trazabilidad).

Los tickets permanecen abiertos hasta revisión humana.
