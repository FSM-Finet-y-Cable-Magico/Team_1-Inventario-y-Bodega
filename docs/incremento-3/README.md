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
- [Shortcut: revisión sin asignar](https://app.shortcut.com/ing-de-software/story/160).
- [PR 67: documentación, modelos y corrección de inicialización](https://github.com/FSM-Finet-y-Cable-Magico/Team_1-Inventario-y-Bodega/pull/67).

El documento mantiene la plantilla del Incremento 2 e incluye los 19 casos extendidos, requerimientos, Scrum++, vistas 4+1, secuencias, pantallas, pruebas, retrospectiva y anexos. El informe final tiene 187 páginas, 87 figuras y 155 tablas; incluye 24 vistas actuales explicadas. Los índices se contrastaron con el PDF y no hay páginas vacías. Las capturas se completaron el 1 de octubre de 2026.

Las tareas se titulan «Revisar» y permanecen sin asignación. No se inventan actas, horas históricas ni aprobaciones del equipo.

## Evidencias

`evidencias/` contiene capturas realizadas en el navegador sobre las instancias locales. `resultados/` conserva respuestas HTTP, comprobaciones SQL, fechas y archivos descargados. Los datos son ficticios y no incluyen JWT, sesiones ni credenciales de producción.

| Conjunto | Escenarios | Resultado |
|---|---:|---|
| `pruebas-api.json` | 47 | 47 cumplen la expectativa registrada |
| `pruebas-g3.json` | 10 | 10 cumplen; G3 real |
| `pruebas-extra.json` | 5 | 5 cumplen; devolución y límite de exportación |

El total de **62 escenarios** no equivale a 62 CU ni a una repetición exhaustiva de todos los caminos de los 96 CU. Las capturas históricas de `Casos de uso/` se identifican por separado en el informe.

### Pruebas de integración

- CU-61: servidor local controlado como doble de G3 para jornada normal, vacía e indisponible; T1 ejecuta código real de dev.
- CU-63/65/66/67: backend real de G3 con PostgreSQL local.
- Cierre real de G3 OT 1: T1 registra `PROCESADO`, `SRV-2026-00003`.
- CU-64: rollback provocado mediante trigger temporal exclusivamente en QA. El trigger y su función se eliminaron después de comprobar unidad, saldo y ausencia de cierre persistido.
- CU-92/93: bloqueo temporal de tabla en QA; HTTP 408 a los 15 segundos. La transacción de bloqueo se libera al terminar.

### Calidad técnica

- Backend Jest: **128/137** pruebas y **14/23** suites correctas. Nueve suites fallan por dependencias/mocks del andamiaje; detalle en `unitarios.log`.
- Frontend con `npm ci` en checkout QA: **0 errores y 2 advertencias** en `svelte-check`; build correcto. El error inicial de tipos Node era del entorno de dependencias.
- El reporte de lint previo registra deuda técnica; no se declara el repositorio completamente libre de errores estáticos.
- Revisar diferencias de contrato de G3, cantidades declaradas frente a consumos aplicados y presentación de fechas de garantía.

## Modelos de datos

- MERE: `diagramas/diagrama_mere/` (fuente conceptual conservada).
- MR y físico general: `diagramas/diagrama_modelo_fisico/`.
- Físico por área, ME, estados y FNs: `diagramas/incremento3/`.
- Diccionario observado: `resultados/esquema.json` y anexo del informe.

Las FNs describen dependencias y descomposición de cabecera/detalle. No se afirma 3FN universal: existen instantáneas de datos de cliente y JSONB de integración/auditoría. La lectura de notificaciones se persiste por registro y empresa, no por usuario individual.

## Acciones personales del equipo

Revisar los artefactos, registrar conformidad, grabar instalación/funcionalidades/presentación/demo y realizar el envío académico y la exposición. La guía y la presentación incluyen un recorrido para preparar esas grabaciones.

## Archivos complementarios

- [Organización de trabajo](https://docs.google.com/spreadsheets/d/1-0FezDia3gk-SHL6derwYG_BHRRJ_lL2/edit).
- [Presentación de 13 diapositivas](https://docs.google.com/presentation/d/1DLdzazSMJ0nzhHe7oZvh-T7DYXGhJSkl/edit).
- [Guía de instalación y demo](https://docs.google.com/document/d/12jZ0bUIo-CvGxOWItBZTpxfc8v4MWYxy/edit).
- [Informe PDF](https://drive.google.com/file/d/1F41RrChmofTdiQcT7jU8LOqx1N5hG2-0/view).

La imagen adjunta a la OT 1 de G3 es un archivo ficticio de prueba (captura de login). Permite probar la recepción de evidencia; no acredita una instalación en terreno.
