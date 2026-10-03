# Auditoría de rúbrica del Incremento 3

Fecha: 3 de octubre de 2026. Aplicación probada en dev `a810aa40`.

Se preservaron las ediciones del equipo descargadas el 3 de octubre. La revisión incorpora las observaciones adicionales: orden y glosario de pruebas, colores por incremento, cuatro gráficos, trazabilidad CU64/CU69 y componentes actualizados.

Se documentan 74 registros: 73 conformes y uno no conforme (INT69-TECNICO). La integridad documental no se presenta como ausencia de defectos del software. Bizagi pertenece al Documento 0; aceptación formal posterior fuera del alcance; videos y exposición a cargo del equipo.

| ID | Rúbrica | Criterio | Estado | Evidencia | Cierre |
|---|---|---|---|---|---|
| R01 | 2, 11 | Portada: título, integrantes completos y orden por apellido | Comprobado | Portada: Cifuentes, Farías, Heilenkötter, Morán y Navarrete. | Sin acción adicional en esta auditoría. |
| R02 | 2, 12 | Índice de contenidos | Comprobado | Preliminares; referencias contrastadas con PDF. | Sin acción adicional en esta auditoría. |
| R03 | 2, 12 | Índice de figuras | Comprobado | Índice de figuras con referencias contrastadas con el PDF; incluye proceso final y asignación Shortcut. | Sin acción adicional en esta auditoría. |
| R04 | 2, 12 | Índice de tablas | Comprobado | Preliminares; correlativos por capítulo. | Sin acción adicional en esta auditoría. |
| R05 | 2 | Introducción | Comprobado | Capítulo 1: problema, solución, alcance y corte de dev. | Sin acción adicional en esta auditoría. |
| R06 | 2, 8 | Propuesta y alcance del incremento | Comprobado | 2.1: 46 + 31 + 19 = 96; I3 19,79 % y acumulado 100 % declarado. | Sin acción adicional en esta auditoría. |
| R07 | 8 | Umbral I3 de al menos 95 % | Parcial | 96 CU implementados declarados en dev; I3 incorpora 19. INT69-TECNICO documenta una restricción que no cumple su expectativa. | El alcance implementado supera 95%; no equivale a conformidad funcional sin reservas. |
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
| R24 | 3 | Evidencia de cada prueba ejecutada | Comprobado | Capítulo 10: 74 registros, 73 conformes y uno no conforme; orden por CU, identificadores explicados y respuestas adjuntas. | Sin acción documental adicional. |
| R25 | 3 | Cobertura de flujos y excepciones especificados | Parcial | 13.6 y 10.7: cliente inexistente, consulta sin equipos y saldo insuficiente comprobados. INT69-TECNICO no conforme. | Distinguir acuerdos de integración de restricciones especificadas; seguimiento técnico de la pertenencia de la serie al técnico. |
| R26 | 5 | Daily diario: avance, siguiente trabajo e impedimentos | Parcial | 3.3: proceso de reuniones igual a I2 confirmado por jefe de grupo; seguimiento, próximos pasos e impedimentos trazados con Shortcut. | Frecuencia semanal frente a diaria de la rúbrica; no existen fechas/asistencias individuales de actas. |
| R27 | 5–6 | Sprint Review con equipo y Product Owner | Documentado | 3.4: Review técnica, objetivos, resultados, problemas y mejoras; proceso de reuniones igual a I2 confirmado por el jefe de grupo. | La aceptación formal corresponde a una etapa posterior y no es un entregable de I3. |
| R28 | 6 | Retrospectiva: inspección y plan de mejora | Comprobado | 3.7 y 12: procedimiento I2 confirmado, inspección de hechos y plan de mejora con revisores asignados. | La revisión humana de acciones permanece por realizar. |
| R29 | 6 | Definición de terminado y calidad | Parcial | 3.4 y 10.5: 140/140 pruebas y 23/23 suites sobre dev con corrección del montaje de pruebas en PR 67 (02-10-2026). | Persiste deuda global de lint: 1203 errores y 118 advertencias. Los nueve archivos de prueba corregidos pasan ESLint; se conservan resultados anteriores. |
| R30 | 7 | PPT: portada, índice, alcance y traza Scrum++ | Corregido | PPT: portada, índice, introducción, alcance, Scrum, requisitos, componentes, físico, trazabilidad CU64/CU69, secuencias, árbol y pruebas. | Sin acción documental adicional. |
| R31 | 7 | PPT recomendada ≤7 min; total ≤15 min | Planificado | Guía: 6 min 30 s de presentación y 7 min 30 s de demo. | Ensayar y registrar la duración real; el guion no acredita el tiempo ejecutado. |
| R32 | 7, 9 | Todos presentes y presentan | Acción personal | Guía distribuye el recorrido de presentación. | Asistencia y participación reales del equipo. |
| R33 | 7–8 | Enviar por jefe de grupo; asunto y Drive | Acción personal | Entrega I3 hasta 04-10-2026 23:59; presentación semana 05-10. | Enviar desde el jefe con asunto Ingeniería de Software – Grupo 1 y enlace completo; registrar comprobante. |
| R34 | 8 | Incluir I2, I1 y Documento 0 corregidos | Revisado | Carpetas I1 e I2 de Drive contrastadas: documentos, presentaciones, código, SQL, diagramas, CU, gráficos y organización. Documento 0 consultado como antecedente. | La revisión de antecedentes no reescribe ni certifica las copias históricas completas. |
| R35 | 9 | Documento Word autocontenido | Comprobado | Informe autocontenido: requisitos, 19 CU, vistas, capturas, modelos y diccionario, 74 pruebas, Scrum y cuatro gráficos. Hallazgos técnicos identificados. | Sin acción documental adicional. |
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
| R55 | 4 | Levantamiento de procesos con sistema terminado | Documentado | 13.9: proceso final implementado y comparación con el antecedente. El modelo Bizagi pertenece al Documento 0, según delimitación del jefe de grupo. | Sin acción documental adicional. |
| R56 | 1, 9 | Complementos Documento 0: BPMN Bizagi, análisis, costos, CV y aceptación | Antecedente | 13.10: análisis, modelos, CV, costos, planificación y aceptación inicial del Documento 0. Bizagi se conserva en dicho documento. | La aceptación formal posterior queda fuera de esta etapa; grabaciones y exposición a cargo del equipo. |
| R57 | 9 | Integridad, originalidad, participación y entrega completa | Parcial | ZIP íntegro y fuentes trazables; informe de commits y datos QA identificados. | No se ha ejecutado análisis antivirus; originalidad/participación y completitud requieren evidencia del equipo, no certificación automática. |
| D03 | Observación3 | Pila sin I1 en proceso | Comprobado | 3.1 separa 77 CU terminados de tareas de revisión; no arrastra desarrollo histórico pendiente. | Sin acción adicional en esta auditoría. |
| D04 | Observación4 | Físico, diferencias, MERE/MR/FNs/ME en anexos | Corregido | Modelos físico, MERE, MR, FNs y ME en informe y anexos; ChartDB con 12 tablas I1 azules, 14 I2 verdes y 6 I3 ámbar. | Sin acción documental adicional. |
| D05 | Observación5 | Eliminar hoja en blanco | Comprobado | Se eliminó un salto vacío detectado en la revisión de maquetación. El PDF corregido se vuelve a inspeccionar antes de publicar. | Sin acción adicional en esta auditoría. |
| D06 | Observación6 | Árbol identificado por incremento | Corregido | Árbol con leyenda I1 azul, I2 verde e I3 ámbar; borde ámbar para ampliaciones de pantallas anteriores. | Sin acción documental adicional. |
| D07 | Observación7 | Vistas explicadas | Comprobado | Capítulos 4–9 incluyen explicación y capturas; no solo listado de imágenes. | Sin acción adicional en esta auditoría. |
| D08 | Observación8 | Evidencias de pruebas por incremento | Comprobado | Capítulo 10 ordenado por CU y tipo de escenario; glosario P/REG/N/E y evidencias de 74 registros, incluido un hallazgo no conforme. | Sin acción documental adicional. |
| D09 | Observación9 | Retrospectiva | Corregido | Capítulo 12: acciones, responsables y cuatro gráficos: burn-up y burn-down de I3 y del proyecto completo. Cortes de entrega identificados. | Sin acción documental adicional. |

## Reparto de revisión

- Javier: 160, 169, 173.
- Kevin: 162, 166, 172.
- Tomás: 163, 165, 171.
- Javiera: 161, 167, 170.
- Uriel: 164, 168.

Los tickets permanecen abiertos hasta revisión humana.
