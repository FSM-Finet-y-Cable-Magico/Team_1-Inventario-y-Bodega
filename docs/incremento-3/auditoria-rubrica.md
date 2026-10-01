# Auditoría de rúbrica — Incremento 3

Fecha: 1 de octubre de 2026. Fuente: «2026-Rubrica Proyecto-Ingenieria_de_Software-v5 (4).pdf», 14 páginas, y observaciones docentes 3–9. Corte de aplicación: dev `a810aa40f23d0a677d4f5ff989995bc4ad945696`; G3 `5ca1fbb`.

## Resultado

**No se acredita todavía cumplimiento integral de la rúbrica.** Se desglosaron 64 criterios; cada uno registra fuente, evidencia, estado y acción pendiente. Estos conteos son una lista de control, no una nota ni un porcentaje ponderado.

- Comprobado: 34.
- Parcial: 16.
- Corregido: 4.
- Pendiente de evidencia: 1.
- Pendiente del equipo: 4.
- Planificado: 1.
- Acción personal: 2.
- Condicional pendiente: 1.
- No auditado integralmente: 1.

## Por qué el informe era más corto

El Incremento 2 renderiza 371 páginas; el I3 anterior a esta auditoría, 187. I2 dedica 131 páginas físicas (222–352) a evidencias y capturas dentro de anexos. I3 integra las pantallas en el capítulo 9 y las pruebas en el 10. La reducción de 31 a 19 CU explica parte de la diferencia, pero no toda: las tablas del I3 estaban a 10 puntos y existían omisiones concretas.

Se recuperaron 11 UR ESA desde Documento 0, RF-43 (la asociación múltiple de CU-67 se trataba incorrectamente como una sola referencia), los 10 RNF y su situación real; se amplió la matriz de excepciones y se restauraron tablas a 12 puntos. El aumento de páginas responde a contenido y legibilidad. La rúbrica no establece un mínimo de páginas.

## Nuevas comprobaciones

- AUD90-E1: exportación de productividad con rango superior a 90 días; HTTP 400 con mensaje del límite.
- AUD66-E1: actualización de cliente G3 con correo y teléfono inválidos; HTTP 400 y comprobación posterior de persistencia sin cambios mediante consulta por RUT.
- Ambas se ejecutaron sobre QA local; `resultados/pruebas-auditoria.json` conserva entrada, respuesta y comprobación. El total es 64 escenarios (47 + 10 + 5 + 2), no 64 CU ni cobertura exhaustiva de 96 CU.
- La comparación exacta con excepciones deja brechas en CU-63/67/68/69/94; no se cambia una expectativa de negocio para ocultar el comportamiento observado.

## Matriz completa

El informe Word/PDF contiene esta matriz en 13.4, comparación de extensión en 13.5, cobertura en 13.6 y entrega acumulada/condiciones abiertas en 13.7–13.8. Las páginas citadas a continuación son las de la rúbrica, no las del informe.

| ID | Pág. rúbrica | Criterio | Estado | Evidencia | Acción de cierre |
|---|---|---|---|---|---|
| R01 | 2, 11 | Portada: título, integrantes completos y orden por apellido | Comprobado | Portada: Cifuentes, Farías, Heilenkötter, Morán y Navarrete. | Sin acción adicional en esta auditoría. |
| R02 | 2, 12 | Índice de contenidos | Comprobado | Preliminares; referencias contrastadas con PDF. | Sin acción adicional en esta auditoría. |
| R03 | 2, 12 | Índice de figuras | Comprobado | Preliminares; 87 figuras identificadas. | Sin acción adicional en esta auditoría. |
| R04 | 2, 12 | Índice de tablas | Comprobado | Preliminares; correlativos por capítulo. | Sin acción adicional en esta auditoría. |
| R05 | 2 | Introducción | Comprobado | Capítulo 1: problema, solución, alcance y corte de dev. | Sin acción adicional en esta auditoría. |
| R06 | 2, 8 | Propuesta y alcance del incremento | Comprobado | 2.1: 46 + 31 + 19 = 96; I3 19,79 % y acumulado 100 % declarado. | Sin acción adicional en esta auditoría. |
| R07 | 8 | Umbral I3 de al menos 95 % | Parcial | 2.1: 96 CU declarados; 19 tratados en I3. Existen discrepancias funcionales y aceptación pendiente. | No equiparar roadmap con aceptación sin reservas; revisar contrato y matriz de excepciones. |
| R08 | 3 | Product Backlog con RF, prioridad y responsable | Comprobado | 3.1 y matriz RF–CU; responsables de implementación identificados. | Sin acción adicional en esta auditoría. |
| R09 | 3 | Planificación del sprint y tiempo estimado | Parcial | 3.1–3.2 contiene horas de revisión propuestas; no estimaciones originales del desarrollo. | Recuperar planificación real desde registros del equipo; no reconstruirla como si hubiera sido previa. |
| R10 | 3 | Sprint Backlog vinculado a vista externa | Comprobado | 3.1 y capítulo 4: 19 CU del alcance; 3.2 tareas de cierre separadas. | Sin acción adicional en esta auditoría. |
| R11 | 3–4 | Las cuatro vistas restantes del sprint | Comprobado | Capítulos 5–8: lógica, procesos, desarrollo y física. | Sin acción adicional en esta auditoría. |
| R12 | 3 | Casos de uso extendidos | Comprobado | 4.2–4.20: actores, resumen, frecuencia, precondición, flujo, excepciones y poscondición. | Sin acción adicional en esta auditoría. |
| R13 | 3 | Nombres de CU en gerundio | Comprobado | Los 19 nombres conservan la redacción de docs/casos-de-uso.json. | Sin acción adicional en esta auditoría. |
| R14 | 1, 3 | Requerimientos funcionales y UR ESA trazados | Corregido | 2.2: RF-43 recuperado al separar la referencia múltiple de CU-67. 2.3: UR originales con sus atributos ESA. | La fuente conserva algunos campos vacíos; se identifican sin inventar calificaciones. |
| R15 | 1, 3 | Matriz RF–CU y diagrama de CU | Corregido | 4.1 y 4.21; RF-42/RF-43 separados y ambos trazados a CU-67. | Sin acción adicional en esta auditoría. |
| R16 | 1, 9 | Requerimientos no funcionales aplicables | Parcial | 2.4: RNF-01 a RNF-10 y estado de verificación incorporados. | Compatibilidad, carga, despliegue, HTTPS y backup no quedan acreditados por pruebas locales. |
| R17 | 4 | Vista lógica: clases y modelo de datos explicados | Comprobado | 5.1–5.4 y 13.1–13.2; relaciones, claves, unidades y consumibles contextualizados. | Sin acción adicional en esta auditoría. |
| R18 | 4 | Vista de procesos: secuencias de diseño entre objetos | Comprobado | Capítulo 6; vistas/controladores/servicios/BD y secuencias G3. | Sin acción adicional en esta auditoría. |
| R19 | 4 | Vista de desarrollo: componentes y estructura | Comprobado | 7.1–7.3: componentes, rutas, módulos, contrato y divergencias. | Sin acción adicional en esta auditoría. |
| R20 | 4 | Vista física: software y hardware/despliegue | Comprobado | Capítulo 8: diagrama y configuración QA; el despliegue productivo exigido por RNF-03 sigue sin verificarse. | Sin acción adicional en esta auditoría. |
| R21 | 4 | Explicación de cada vista, no solo imágenes | Comprobado | Capítulos 4–8 tienen texto de contexto y correspondencia con el sistema. | Sin acción adicional en esta auditoría. |
| R22 | 4 | Árbol de navegación | Comprobado | Capítulo 9 y fuente arbol-navegacion-incremento3.drawio; procedencia por incremento. | Sin acción adicional en esta auditoría. |
| R23 | 4 | Funcionamiento de pantallas | Comprobado | 9.1–9.24: 24 vistas actuales descritas, incluidas G3 y excepciones móviles. | Sin acción adicional en esta auditoría. |
| R24 | 3 | Evidencia de cada prueba ejecutada | Comprobado | Capítulo 10; 62 registros previos más 2 pruebas exactas de esta auditoría, con respuestas y fechas. | Sin acción adicional en esta auditoría. |
| R25 | 3 | Cobertura de flujos y excepciones especificados | Parcial | Matriz 13.6: identifica equivalencias, diferencias y condiciones no ejecutadas. | CU-94 sin alertas no ejecutado; CU-63/67/68/69 conservan diferencias o cobertura parcial. No afirmar exhaustividad. |
| R26 | 5 | Daily diario: avance, siguiente trabajo e impedimentos | Pendiente de evidencia | 3.3 es bitácora Git, declarada expresamente como tal. | Recuperar registros reales de Daily con fecha, participantes y acuerdos; no sustituirlos por commits. |
| R27 | 5–6 | Sprint Review con equipo y Product Owner | Pendiente del equipo | 3.4 prepara la revisión técnica; no hay acta de cierre ni aceptación del cliente. | Registrar asistentes, objetivos logrados/no logrados, observaciones, carencias, nuevas tareas y backlog revisado. |
| R28 | 6 | Retrospectiva: inspección y plan de mejora | Parcial | Capítulo 12 aporta hechos, causas, acciones y criterios de cierre. | La participación y los acuerdos reales del equipo aún deben registrarse; no se atribuyen a una reunión inexistente. |
| R29 | 6 | Definición de terminado y calidad | Parcial | 3.4 y 10.5: criterios y hallazgos explícitos. | Corregir/revisar las nueve suites fallidas y deuda de lint; volver a ejecutar después de cambios. |
| R30 | 7 | PPT: portada, índice, alcance y traza Scrum++ | Parcial | Presentación de 13 diapositivas: portada/índice/alcance/traza RF–CU. Scrum++ está principalmente en notas del orador. | Añadir evidencia visible de backlog, Review y retrospectiva a las diapositivas, además de las notas. |
| R31 | 7 | PPT recomendada ≤7 min; total ≤15 min | Planificado | Guía: 6 min 30 s de presentación y 7 min 30 s de demo. | Ensayar y registrar la duración real; el guion no acredita el tiempo ejecutado. |
| R32 | 7, 9 | Todos presentes y presentan | Acción personal | Guía distribuye el recorrido de presentación. | Asistencia y participación reales del equipo. |
| R33 | 7–8 | Enviar por jefe de grupo; asunto y Drive | Acción personal | Entrega I3 hasta 04-10-2026 23:59; presentación semana 05-10. | Enviar desde el jefe con asunto Ingeniería de Software – Grupo 1 y enlace completo; registrar comprobante. |
| R34 | 8 | Incluir I2, I1 y Documento 0 corregidos | Parcial | Carpeta raíz de Drive contiene I2, I1 y acceso directo Documento 0. | Existencia comprobada; no se verificó el cierre integral de todas las correcciones en esos tres documentos. El I3 por sí solo no lo acredita. |
| R35 | 9 | Documento Word autocontenido | Parcial | RF, CU, vistas, pruebas, modelos y diccionario incluidos. Respuestas técnicas completas y fuentes editables van adjuntas. | Las diferencias de contrato y condiciones no ejecutadas permanecen explícitas; los modelos generales deben consultarse también en resolución original. |
| R36 | 9 | Transacciones en base de datos relacional | Comprobado | PostgreSQL, 32 tablas, claves y prueba de rollback. JSONB se distingue del núcleo transaccional. | Sin acción adicional en esta auditoría. |
| R37 | 9 | Word, PPT y documentos complementarios | Comprobado | Drive I3: DOCX, PDF, PPTX, XLSX y guía DOCX/PDF. | Sin acción adicional en esta auditoría. |
| R38 | 9 | Archivos Draw.io de secuencias, objetos y otros | Parcial | ZIP contiene Draw.io de árbol y despliegue; secuencias, clases, objetos y modelos se conservan principalmente en PlantUML + PNG. | El formato Draw.io literal no está cubierto para todos los diagramas de diseño. No contar PNG incrustado como edición por objetos. |
| R39 | 9 | Documento de instalación | Comprobado | Guía de instalación y demo: requisitos, comandos, configuración, comprobación, respaldo y solución de problemas. | Sin acción adicional en esta auditoría. |
| R40 | 9 | Video de instalación | Pendiente del equipo | Guion preparado; carpeta I3 no contiene grabación. | Grabar y adjuntar el video correspondiente; comprobar audio, legibilidad y archivo reproducible. |
| R41 | 9 | Video de funcionalidades del incremento | Pendiente del equipo | Guion preparado; carpeta I3 no contiene grabación. | Grabar y adjuntar el video correspondiente; comprobar audio, legibilidad y archivo reproducible. |
| R42 | 9 | Video de presentación y demo por separado | Pendiente del equipo | Presentación y recorrido preparados; faltan archivos de grabación separados. | Grabar y adjuntar el video correspondiente; comprobar audio, legibilidad y archivo reproducible. |
| R43 | 9 | ZIP con archivos necesarios para ejecutar aplicación | Comprobado | ZIP del código y anexos de PR 67, con comprobación de integridad y archivos .env de ejemplo; revisión exacta registrada en el manifiesto de entrega. | El funcionamiento de servicios externos requiere su configuración; el ZIP no lleva secretos de producción. |
| R44 | 9 | Versionamiento Git de todos e informe de commits | Comprobado | Capítulo 11: 78 registros del periodo y aportes de cinco integrantes; PR 67 hacia dev. | Sin acción adicional en esta auditoría. |
| R45 | 9–10 | Excel: capítulo, contenido, autores y revisores | Parcial | XLSX organización: capítulos, elaboración asistida y fuentes; revisores Sin asignar. | Registrar quién efectivamente revisó y su conformidad cuando ocurra, sin asignar ahora por instrucción del usuario. |
| R46 | 12 | Invocar y explicar cada figura/tabla antes de aparecer | Parcial | Figuras con explicación; tablas invocadas. Varias introducciones de tablas siguen siendo genéricas. | Sustituir las introducciones genéricas por interpretación específica donde la tabla lo requiera; la mera frase organiza antecedentes no prueba explicación suficiente. |
| R47 | 13 | Numeración capítulo.correlativo | Comprobado | Figuras y tablas generadas por contador de capítulo; índices enlazados por etiqueta. | Sin acción adicional en esta auditoría. |
| R48 | 13 | Carta y márgenes de 2,5 cm | Comprobado | Secciones DOCX: 21,59 × 27,94 cm, cuatro márgenes 2,5 cm. | Sin acción adicional en esta auditoría. |
| R49 | 13 | Fuente Arial/TNR 12; leyendas recomendadas 9 | Corregido | Cuerpo TNR y tablas Arial, tamaño 12; leyendas 9. UR ESA restauradas con todos sus atributos y trazabilidad. | La versión de 187 páginas tenía todas las tablas a 10, parte de la reducción de tamaño. |
| R50 | 13 | Interlineado 1,5 y simple en anexos/leyendas/referencias | Corregido | Cuerpo con interlineado 1,5; tablas y material de anexo simple; leyendas 9. | Sin acción adicional en esta auditoría. |
| R51 | 13–14 | Texto justificado, títulos y sangría de subtítulos | Comprobado | Estilos DOCX: texto justificado, títulos a izquierda y sangría progresiva. | Sin acción adicional en esta auditoría. |
| R52 | 14 | Numeración romana y arábiga abajo a derecha a 1,5 cm | Comprobado | Preliminares romanos, cuerpo desde 1, pie a 1,5 cm; portada sin número. | Sin acción adicional en esta auditoría. |
| R53 | 14 | Capítulos/índices en página nueva; títulos en mayúsculas | Comprobado | Estilo Heading 1 con salto anterior; índices independientes. | Sin acción adicional en esta auditoría. |
| R54 | 13–14 | APA vigente y referencias al final | Parcial | 13.9: referencias del proyecto; procedencia de imágenes reforzada. | Revisión bibliográfica formal pendiente; las referencias locales sin URL/fecha de publicación completa requieren completar metadatos verificables. |
| R55 | 4 | Levantamiento de procesos con sistema terminado | Condicional pendiente | La rúbrica lo exige al último incremento. El calendario reserva I4 para noviembre, pero I3 ya declara 100 %. | Preparar BPMN final y su archivo Bizagi; no cerrar el criterio automáticamente alegando que será I4. |
| R56 | 1, 9 | Complementos Documento 0: BPMN Bizagi, análisis, costos, CV y aceptación | No auditado integralmente | La carpeta raíz conserva Documento 0; esta auditoría revisa I3 y su arrastre documental. | Verificar el paquete acumulado antes del envío. No implicar que su mera presencia acredita sus anexos y correcciones. |
| R57 | 9 | Integridad, originalidad, participación y entrega completa | Parcial | ZIP íntegro y fuentes trazables; informe de commits y datos QA identificados. | No se ha ejecutado análisis antivirus; originalidad/participación y completitud requieren evidencia del equipo, no certificación automática. |
| D03 | Observación3 | Pila sin I1 en proceso | Comprobado | 3.1 separa 77 CU terminados de tareas de revisión; no arrastra desarrollo histórico pendiente. | Sin acción adicional en esta auditoría. |
| D04 | Observación4 | Físico, diferencias, MERE/MR/FNs/ME en anexos | Comprobado | 2.1, 5 y 13: físico por áreas, esquema de 32 tablas, MERE histórico, MR/ME/FNs; límites de normalización explícitos. | Sin acción adicional en esta auditoría. |
| D05 | Observación5 | Eliminar hoja en blanco | Comprobado | Se eliminó un salto vacío detectado en la revisión de maquetación. El PDF corregido se vuelve a inspeccionar antes de publicar. | Sin acción adicional en esta auditoría. |
| D06 | Observación6 | Árbol identificado por incremento | Comprobado | Árbol I3 rotulado; matriz de pantallas y CU por procedencia. | Sin acción adicional en esta auditoría. |
| D07 | Observación7 | Vistas explicadas | Comprobado | Capítulos 4–9 incluyen explicación y capturas; no solo listado de imágenes. | Sin acción adicional en esta auditoría. |
| D08 | Observación8 | Evidencias de pruebas por incremento | Parcial | 10.4 inventaría 96 CU; muestras históricas y 64 escenarios actuales. | Las capturas históricas no sustituyen la reejecución; completar condiciones exactas marcadas en 13.6. |
| D09 | Observación9 | Retrospectiva | Parcial | 12.1: análisis documental y plan de acciones. | Registrar revisión y acuerdos del equipo, sin inventar una ceremonia. |

## Seguimiento

Shortcut 160 agrupa la revisión; nuevas subtareas 172 y 173, sin responsables asignados y con título «Revisar». PR 67 conserva los cambios en `feat/javier-cus` hacia `dev`. La auditoría no fusiona ni modifica `main`.

Los registros históricos de ceremonias, estimaciones y aceptación deben proceder de evidencia real. Los videos y la exposición requieren al equipo. Los pendientes de formatos, pruebas y documentos acumulados siguen siendo trabajo abierto; no se transfieren implícitamente al equipo por aparecer en esta lista.
