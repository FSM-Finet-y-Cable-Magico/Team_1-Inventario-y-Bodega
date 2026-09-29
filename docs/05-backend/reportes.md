# Backend — Módulo `reportes`

## CU-85: reporte de stock actual

- `GET /api/reportes/stock?id_empresa=&id_bodega=&id_tipo_equipo=`
- Roles: `ADMIN_BODEGA`, `ADMIN`, `SUPERUSUARIO`.
- Los filtros son opcionales. Un usuario que no sea superusuario queda limitado a su empresa; solicitar otra empresa responde `403`.
- El resultado contiene una fila por combinación de tipo de equipo y bodega, con los cuatro estados exactos, `total_activo`, `umbral_minimo` y `bajo_umbral`.
- Para equipos serializados, el stock se obtiene contando `unidad_equipo` por estado y el total activo suma esos cuatro estados.
- Para consumibles, `stock_consumible.cantidad_disponible` se muestra en `en_bodega`; el umbral proviene de `umbral_minimo` y el total activo es esa cantidad.
- El umbral no configurado se entrega como `0`; `bajo_umbral` es verdadero cuando `total_activo < umbral_minimo`.
- Cada generación, incluso sin resultados, registra `GENERAR_REPORTE` en `log_auditoria` con los filtros utilizados.
- Sin resultados, el frontend muestra `No se encontraron datos para los filtros seleccionados.`.

## CU-87: reporte de equipos instalados por cliente

- `GET /api/reportes/equipos-instalados?rut=&nombre=&numero_serie=&id_empresa=`
- Roles: `ADMIN_BODEGA`, `ADMIN`, `SUPERUSUARIO`.
- Requiere al menos un criterio de búsqueda (`rut`, `nombre` o `numero_serie`). De lo contrario responde `400 Bad Request`.
- Si se ingresa `rut`, debe cumplir formato `XXXXXXXX-X` (o responder `400`).
- Si se ingresa `nombre`, debe tener al menos 3 caracteres (o responder `400`). La búsqueda es insensible a mayúsculas y tildes (`normalizeText`).
- Si se ingresa `numero_serie`, la búsqueda es exacta.
- Los usuarios no superusuario quedan limitados a su empresa (`actor.id_empresa`); solicitar otra empresa responde `403 Forbidden`.
- Consulta e integra clientes mediante `ClientesG3Service` hacia el sistema comercial externo G3 (`GET /clientes/rut/{rut}` o `GET /clientes?busqueda=`), con fallback transparente a datos persistidos localmente en `unidad_equipo` si la API externa no está disponible.
- Filtra unidades con estado `'Instalado en cliente'`.
- Respuesta: array de objetos con las 8 columnas requeridas:
  - `numero_servicio`: formato `SRV-YYYY-XXXXX`.
  - `rut_cliente`: formato `XXXXXXXX-X`.
  - `nombre_cliente`: nombre completo del cliente.
  - `direccion_instalacion`: dirección donde se instaló el equipo.
  - `tipo_equipo`: nombre/modelo del tipo de equipo.
  - `numero_serie`: número de serie exacto (`NS`).
  - `fecha_instalacion`: fecha formateada como `DD/MM/YYYY`.
  - `tecnico_instalador`: nombre del técnico que realizó la instalación.
- Cada consulta registra evento `GENERAR_REPORTE` con entidad `reporte_equipos_instalados` en `log_auditoria`.
- Sin coincidencias, responde `200 OK` con `[]` y el frontend muestra el mensaje exacto de E1: `No se encontraron equipos instalados con ese criterio.`.

## CU-89: reporte de inventario actual de técnicos

- `GET /api/reportes/tecnicos/inventario?id_empresa=&id_usuario=`
- Roles: `ADMIN_BODEGA`, `ADMIN`, `SUPERUSUARIO`.
- El filtro `id_usuario` es opcional; vacío devuelve todos los técnicos activos con rol `TECNICO_TERRENO`.
- Los usuarios no superusuario quedan limitados a su empresa; solicitar otra empresa responde `403`.
- Los equipos individualizables se leen desde `unidad_equipo` en estado `Asignado a técnico`.
- `fecha_asignacion` usa la última transición a `Asignado a técnico` en `historial_estado_equipo` para ese técnico; si no existe historial, se entrega `null`.
- Los consumibles se leen desde `inventario_personal_tecnico`, solo con saldo positivo y tipos no serializados; la unidad proviene de `tipo_equipo.unidad_medida`.
- `dias_transcurridos` se calcula en PostgreSQL con `CURRENT_DATE - fecha_asignacion`.
- Cada generación registra `GENERAR_REPORTE` con entidad `reporte_inventario_tecnicos`.
- Un técnico sin ambos tipos de ítems conserva su tarjeta y muestra `Este técnico no tiene ítems en su inventario personal.`.

## CU-91: reporte de consumo de consumibles

- `GET /api/reportes/consumo?id_empresa=&id_tipo_equipo=&fecha_desde=&fecha_hasta=`
- Roles: `ADMIN_BODEGA`, `ADMIN`, `SUPERUSUARIO`; el aislamiento sigue el patrón de CU-85.
- El rango de fechas admite como máximo 365 días y reutiliza `El rango de fechas no puede superar los 365 días.`.
- Los ingresos se leen de `orden_ingreso_detalle` y sus órdenes de ingreso cuando las tablas de CU-52/54 están desplegadas.
- Las entregas se leen de `salida_detalle` + `salida_bodega`, solo para consumibles y dentro del rango.
- Las devoluciones se leen de `prestamo_retorno` cuando CU-82 está desplegado. Si las fuentes futuras aún no existen, se consideran cero sin romper el reporte.
- `cantidad_usada_en_cierres` queda en `0` hasta implementar CU-64/68; al cruzar esos casos se debe reemplazar esta fuente y revalidar el desvío.
- La diferencia es `ingresada - entregada + devuelta`; `desvio` es verdadero cuando `abs(diferencia) > 15% * ingresada` y el ingreso es mayor que cero.
- Cada generación registra `GENERAR_REPORTE` con entidad `reporte_consumo`.
- Sin resultados, el frontend muestra `No se encontraron consumibles con los filtros seleccionados.`.

## CU-90: reporte de productividad de técnicos

- `GET /api/reportes/tecnicos/productividad?id_empresa=&id_tecnico=&fecha_desde=&fecha_hasta=`
- Roles: `ADMIN`, `SUPERUSUARIO`.
- Filtros:
  - `id_empresa`: opcional para superusuario; los administradores no superusuario quedan restringidos a su propia empresa (`actor.id_empresa`). Solicitar otra empresa responde `403 Forbidden`.
  - `id_tecnico`: opcional; si se omite, calcula la productividad de todos los técnicos activos (`TECNICO_TERRENO`) de la empresa.
  - `fecha_desde` y `fecha_hasta`: obligatorios en formato `YYYY-MM-DD`. La fecha de inicio debe ser anterior o igual a la de fin.
  - Validación de rango (E1): el rango entre fechas no puede superar los 90 días. Si supera 90 días (e.g. 91 días), responde `400 Bad Request` con el mensaje exacto: `El rango de fechas para este reporte no puede superar los 90 días.`.
- Integración de cierres:
  - Consulta órdenes cerradas a G3 mediante `OrdenesG3Service` (`GET /ordenes?estado=CERRADA...`).
  - Fallback a consulta individual `GET /ordenes/{id}?include=materiales` o registros locales en `integracion_cierre` recibidos vía webhook cuando G3 no incluye materiales en el listado general (docs/12 §6, ítem 4).
- Clasificación de consumibles:
  - Metros de fibra óptica: consumibles con categoría `'Consumible fibra óptica'` o que contengan `'fibra'` en su nombre.
  - Unidades de conectores: consumibles con categoría `'Consumible conector'` o que contengan `'conector'` en su nombre.
  - Otros consumibles: agrupados por tipo con su cantidad y unidad de medida.
- Columnas de salida por técnico:
  - `id_tecnico`, `nombre_completo`, `id_empresa`, `empresa`.
  - `instalaciones_cerradas`: cantidad de órdenes de instalación cerradas.
  - `reparaciones_cerradas`: cantidad de órdenes de reparación cerradas.
  - `metros_fibra_optica`: total de metros de fibra utilizados.
  - `unidades_conectores`: total de conectores utilizados.
  - `otros_consumibles`: arreglo de consumibles agrupados.
  - `otros_consumibles_resumen`: cadena de texto resumen de otros consumibles utilizados.
- Auditoría: cada generación registra `GENERAR_REPORTE` con entidad `reporte_productividad_tecnicos` en `log_auditoria`.

## CU-92: exportación de reportes a Excel

- `GET /api/reportes/exportar/excel?tipo=&...` y `GET /api/reportes/:tipo/exportar/excel?...`
- Roles: `ADMIN_BODEGA`, `ADMIN`, `SUPERUSUARIO`.
  - *Nota*: Para el reporte de `productividad` (CU-90), solo se autoriza a `ADMIN` y `SUPERUSUARIO`. `ADMIN_BODEGA` recibe `403 Forbidden`.
  - Los usuarios no superusuario quedan restringidos a su empresa (`actor.id_empresa`).
- Tipos de reporte soportados:
  - `stock`: Reporte de stock actual (CU-85). Columnas: Tipo de equipo, Categoría, Requiere NS, Bodega, Empresa, En bodega, Asignado a técnico, Instalado en cliente, En revisión, Total activo, Umbral mínimo, Bajo umbral.
  - `movimientos`: Reporte de movimientos de inventario (CU-86). Columnas: ID, Fecha, Tipo movimiento, Tipo equipo, Cantidad, Origen, Destino, Usuario, Observación.
  - `equipos-instalados`: Reporte de equipos por cliente (CU-87). Columnas: N° Servicio, RUT Cliente, Nombre Cliente, Dirección Instalación, Tipo Equipo, Número de Serie, Fecha Instalación, Técnico Instalador.
  - `garantias`: Reporte de garantías (CU-88). Columnas: N° Serie, Tipo Equipo, Bodega/Ubicación, Proveedor, Fecha Adquisición, Días Garantía, Fin Garantía, Estado Garantía.
  - `inventario-tecnicos`: Reporte de inventario de técnicos (CU-89). Columnas: Técnico, Empresa, Tipo Ítem, Identificador / Modelo, Categoría, Estado / Cantidad, Fecha Asignación, Días Asignado.
  - `productividad`: Reporte de productividad de técnicos (CU-90). Columnas: ID Técnico, Técnico, Empresa, Instalaciones Cerradas, Reparaciones Cerradas, Metros Fibra Óptica, Unidades Conectores, Otros Consumibles.
  - `consumo`: Reporte de consumo de consumibles (CU-91). Columnas: Consumible, Unidad Medida, Empresa, Cantidad Ingresada, Cantidad Entregada, Cantidad Devuelta, Cantidad en Cierres, Diferencia Neta, Desvío Significativo (>15%).
- Estructura y formato del archivo `.xlsx`:
  - Generado mediante `ExcelExportService` utilizando OpenXML estándar (formato comprimido zip con `zlib` integrado en Node.js, sin dependencias externas pesadas).
  - Cada columna del reporte corresponde a una columna de la hoja de cálculo.
  - La primera fila contiene los encabezados con estilo en negrita (`<b/>`).
  - La hoja se nombra con el tipo de reporte sanitizado más la fecha de generación `YYYYMMDD` (ej. `Stock20260926`, máximo 31 caracteres).
  - Se calcula el ancho de columnas automáticamente con base en la longitud del contenido.
  - Nombre del archivo de descarga: `reporte-[tipo]-[YYYYMMDD].xlsx` (enviado mediante cabecera `Content-Disposition: attachment; filename="..."`).
  - Mime type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
- Control de timeout (E1):
  - Límite de 15 segundos para la generación del archivo mediante `Promise.race` en el backend y `AbortController` en el cliente frontend.
  - Si el proceso supera los 15 segundos, responde `408 Request Timeout` con el mensaje exacto:
    `"La generación del archivo superó los 15 segundos sin completarse. Por favor intente nuevamente."`
- Auditoría:
  - Registra evento con acción `EXPORTAR_REPORTE_EXCEL` en `log_auditoria` con la entidad afectada (`reporte_stock`, `reporte_movimientos`, etc.), el usuario responsable y los metadatos de la exportación (filtros, filas, nombre de archivo).


