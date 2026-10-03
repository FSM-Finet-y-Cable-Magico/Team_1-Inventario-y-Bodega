# Incremento 3 — documentación y evidencias

## Corte y alcance

- Aplicación probada: `origin/dev`, SHA `a810aa40f23d0a677d4f5ff989995bc4ad945696`.
- G3 real: `Team-3-FSM`, revisión `5ca1fbb`, base QA local independiente.
- Incrementos: **46 + 31 + 19 = 96 CU**. Parcial I3: **19,79 %**; acumulado: **100 %**.
- Los 19 CU son 48, 61, 63–71, 73, 87, 90 y 92–96. Los CU-63, 65, 66 y 67 pertenecen a G3.
- Los 11 tickets sc-147 a sc-157 eran una parte del trabajo restante; no representan todo el alcance académico de I3.

## Entregables y revisión

- [Informe en Drive](https://docs.google.com/document/d/1OkxhjvTPfQbadXeKDR3hmWowumHwDbxH/edit).
- [Carpeta de Incremento 3](https://drive.google.com/drive/folders/12HV-c5VJi4wnbOLoio0mt7d2E6ROdOTl).
- [Shortcut: revisión asignada](https://app.shortcut.com/ing-de-software/story/160).
- [PR 67: documentación, modelos y corrección de inicialización](https://github.com/FSM-Finet-y-Cable-Magico/Team_1-Inventario-y-Bodega/pull/67).

El documento mantiene la plantilla del Incremento 2 e incluye los 19 casos extendidos, requerimientos, Scrum++, vistas 4+1, secuencias, pantallas, pruebas, retrospectiva y anexos. El informe ampliado incorpora siete apartados de Scrum, proceso final y auditoría acumulada; incluye 24 vistas actuales explicadas. La edición revisada contiene 94 figuras y 193 tablas; la paginación y los archivos se identifican en el manifiesto. Los índices se contrastaron con el PDF y no hay páginas vacías. Las capturas se completaron el 1 de octubre de 2026.

Las tareas se titulan «Revisar» y se asignaron a los cinco integrantes (3/3/3/3/2). No se inventan actas, horas históricas ni aprobaciones del equipo.

## Evidencias

`evidencias/` contiene capturas realizadas en el navegador sobre las instancias locales. `resultados/` conserva respuestas HTTP, comprobaciones SQL, fechas y archivos descargados. Los datos son ficticios y no incluyen JWT, sesiones ni credenciales de producción.

| Conjunto | Escenarios | Resultado |
|---|---:|---|
| `pruebas-api.json` | 47 | 47 cumplen la expectativa registrada |
| `pruebas-g3.json` | 10 | 10 cumplen; G3 real |
| `pruebas-extra.json` | 5 | 5 cumplen; devolución y límite de exportación |
| `pruebas-auditoria.json` | 2 | 2 cumplen; rango >90 días y contacto inválido G3 |
| `pruebas-cierre.json` | 6 | CU94 sin alertas y cinco ensayos de 20 solicitudes HTTP simultáneas |
| `pruebas-integracion.json` | 4 | 3 conformes; INT69-TECNICO no conforme, documentado en Shortcut 171 |

El total de **74 registros** (69 escenarios funcionales y cinco ensayos de concurrencia) no equivale a 74 CU ni a una repetición exhaustiva de todos los caminos de los 96 CU. Las capturas históricas de `Casos de uso/` se identifican por separado en el informe.

### Pruebas de integración

- CU-61: servidor local controlado como doble de G3 para jornada normal, vacía e indisponible; T1 ejecuta código real de dev.
- CU-63/65/66/67: backend real de G3 con PostgreSQL local.
- Cierre real de G3 OT 1: T1 registra `PROCESADO`, `SRV-2026-00003`.
- CU-64: rollback provocado mediante trigger temporal exclusivamente en QA. El trigger y su función se eliminaron después de comprobar unidad, saldo y ausencia de cierre persistido.
- CU-92/93: bloqueo temporal de tabla en QA; HTTP 408 a los 15 segundos. La transacción de bloqueo se libera al terminar.

### Calidad técnica

- Backend Jest (02-10-2026): **140/140** pruebas y **23/23** suites correctas sobre dev a810aa40 con nueve archivos de prueba corregidos en PR 67. Se añadieron dobles de dependencias y tres verificaciones de salud; no se modificó el código funcional. Evidencia: `unitarios-dev-corregidos.log/json`. El registro previo fallido permanece en `unitarios.log`.
- Los nueve archivos de prueba corregidos pasan ESLint y el build backend finaliza. El lint global mantiene **1203 errores y 118 advertencias**, detallados en `lint-resumen-cierre.json`.
- Frontend con `npm ci` en checkout QA: **0 errores y 2 advertencias** en `svelte-check`; build correcto. El error inicial de tipos Node era del entorno de dependencias.
- El reporte de lint previo registra deuda técnica; no se declara el repositorio completamente libre de errores estáticos.
- Revisar diferencias de contrato de G3, cantidades declaradas frente a consumos aplicados y presentación de fechas de garantía.

## Modelos de datos

- MERE: `diagramas/diagrama_mere/` (fuente conceptual conservada).
- MR y físico general: `diagramas/diagrama_modelo_fisico/`.
- Físico por área, ME, estados y FNs: `diagramas/incremento3/`.
- Diccionario observado: `resultados/esquema.json` y anexo del informe.

Las FNs describen dependencias y descomposición de cabecera/detalle. No se afirma 3FN universal: existen instantáneas de datos de cliente y JSONB de integración/auditoría. La lectura de notificaciones se persiste por registro y empresa, no por usuario individual.

## Auditoría de rúbrica

La [matriz de 64 criterios](auditoria-rubrica.md) registra fuente, evidencia, estado y acción pendiente. Se recuperaron 11 UR ESA, RF-43, los 10 RNF y la cobertura exacta de excepciones. La documentación recoge el alcance completo y los límites técnicos observados. Persisten el hallazgo INT69-TECNICO y límites de RNF; no se presentan como pruebas aprobadas. Bizagi corresponde al Documento 0 y la aceptación formal a una etapa posterior. Videos y exposición son actividades del equipo. Las secciones 13.4–13.11 del informe explican cada brecha.

## Acciones personales del equipo

Revisar los artefactos, registrar conformidad, grabar instalación/funcionalidades/presentación/demo y realizar el envío académico y la exposición. La guía y la presentación incluyen un recorrido para preparar esas grabaciones.

## Archivos complementarios

- [Organización de trabajo](https://docs.google.com/spreadsheets/d/1-0FezDia3gk-SHL6derwYG_BHRRJ_lL2/edit).
- [Presentación de 15 diapositivas](https://docs.google.com/presentation/d/1DLdzazSMJ0nzhHe7oZvh-T7DYXGhJSkl/edit).
- [Guía de instalación y demo](https://docs.google.com/document/d/12jZ0bUIo-CvGxOWItBZTpxfc8v4MWYxy/edit).

La imagen adjunta a la OT 1 de G3 es un archivo ficticio de prueba (captura de login). Permite probar la recepción de evidencia; no acredita una instalación en terreno.

## Registros de esta pasada

- `resultados/shortcut-scrum.json`: 19 tickets del I3, acuerdos de integración y responsables de revisión.
- `diagramas/editables-drawio/`: 234 archivos con textos y primitivas vectoriales editables. Los conectores conservan geometría; cambios estructurales se regeneran desde PlantUML.
- `diagramas/incremento3/proceso-final-incremento3.*`: BPMN 2.0, Draw.io y PNG con flujo de terreno/inventario. Material complementario; el modelo Bizagi pertenece al Documento 0.
- Los ensayos concurrentes usan una misma cuenta QA y base pequeña; no acreditan la matriz completa de RNF-06.

## Revisión del 3 de octubre

Se preservó la versión del equipo del 2 de octubre (21:03 UTC). Pruebas ordenadas por CU y glosario de códigos; árbol y modelo ChartDB con I1 azul, I2 verde e I3 ámbar; cuatro gráficos de alcance; componentes actualizados; CU64 y CU69 como trazabilidad principal. Modelo ChartDB editable y datos de gráficos incluidos en diagramas/incremento3.
