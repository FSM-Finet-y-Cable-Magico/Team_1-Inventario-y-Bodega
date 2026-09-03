# Roadmap — Avance de casos de uso (CU-01 a CU-96)

> Seguimiento del estado de los casos de uso del sistema.
> Fuente de los casos de uso: [`docs/casos-de-uso.json`](./casos-de-uso.json) (solo lectura).

## Regla de actualización (obligatoria)

**Cada vez que un desarrollador implemente (o avance) un caso de uso, debe actualizar este
archivo**: cambiar el estado del CU de "Pendiente" a "En progreso" o "Implementado" y, si
corresponde, indicar la rama/PR y quién lo trabaja. No se considera "hecho" un CU cuyo estado
no esté reflejado aquí.

## Resumen

- **Total de casos de uso:** 96
- **Implementados:** 48 (CU-01 a CU-46, CU-85, CU-86)
- **Pendientes:** 48 (CU-47 a CU-84, CU-87 a CU-96)

## Leyenda

| Estado | Significado |
|--------|-------------|
| `[x]` Implementado | Caso de uso completo (backend + frontend + BDD + docs + diagramas + PR). |
| `[~]` En progreso | En desarrollo en una rama (indicar rama/PR en la columna Notas). |
| `[ ]` Pendiente | Sin empezar. |

## Mapa de casos de uso por módulo

### Autenticación y gestión de usuarios

| CU | Nombre | Estado | Notas |
|----|--------|--------|-------|
| CU-01 | Iniciando sesión en el sistema | [x] Implementado | |
| CU-02 | Verificando permisos del rol al acceder a una funcionalidad | [x] Implementado | |
| CU-03 | Bloqueando acceso a recursos no autorizados | [x] Implementado | |
| CU-04 | Creando cuenta de usuario | [x] Implementado | |
| CU-05 | Consultando listado de usuarios | [x] Implementado | |
| CU-06 | Editando cuenta de usuario | [x] Implementado | |
| CU-07 | Desactivando cuenta de usuario | [x] Implementado | |
| CU-08 | Registrando eventos en el log de auditoría | [x] Implementado | |
| CU-09 | Consultando el log de auditoría | [x] Implementado | |
| CU-10 | Restableciendo contraseña de usuario | [x] Implementado | |
| CU-11 | Cerrando sesión automáticamente por inactividad | [x] Implementado | |
| CU-12 | Cerrando sesión del sistema | [x] Implementado | |

### Gestión multiempresa

| CU | Nombre | Estado | Notas |
|----|--------|--------|-------|
| CU-13 | Cargando contexto de empresa Finet al iniciar sesión | [x] Implementado | |
| CU-14 | Cargando contexto de empresa Cable Mágico al iniciar sesión | [x] Implementado | |
| CU-15 | Consultando dashboard consolidado de ambas empresas | [x] Implementado | |
| CU-16 | Consultando datos aislados por empresa | [x] Implementado | |
| CU-17 | Creando registro con aislamiento de empresa | [x] Implementado | |
| CU-18 | Editando registro con aislamiento de empresa | [x] Implementado | |
| CU-19 | Eliminando o desactivando registro con aislamiento de empresa | [x] Implementado | |
| CU-20 | Registrando solicitud de transferencia inter-empresa | [x] Implementado | |
| CU-21 | Aprobando transferencia inter-empresa | [x] Implementado | |
| CU-22 | Rechazando transferencia inter-empresa | [x] Implementado | |
| CU-23 | Consultando transferencias inter-empresa | [x] Implementado | |

### Catálogo de tipos de equipos

| CU | Nombre | Estado | Notas |
|----|--------|--------|-------|
| CU-24 | Creando tipo de equipo en el catálogo | [x] Implementado | |
| CU-25 | Consultando catálogo de tipos de equipo | [x] Implementado | |
| CU-26 | Editando tipo de equipo existente | [x] Implementado | |
| CU-27 | Desactivando tipo de equipo del catálogo | [x] Implementado | |
| CU-28 | Validando número de serie de equipo | [x] Implementado | |
| CU-29 | Adjuntando ficha técnica PDF a tipo de equipo | [x] Implementado | |
| CU-30 | Descargando ficha técnica de tipo de equipo | [x] Implementado | |
| CU-31 | Distinguiendo equipo individualizable de consumible | [x] Implementado | |

### Gestión de unidades de equipo

| CU | Nombre | Estado | Notas |
|----|--------|--------|-------|
| CU-32 | Registrando unidad de equipo individualizable | [x] Implementado | |
| CU-33 | Consultando ficha de detalle de unidad de equipo | [x] Implementado | |
| CU-34 | Editando datos de unidad de equipo | [x] Implementado | |
| CU-35 | Gestionando transiciones de estado de equipo | [x] Implementado | |
| CU-36 | Registrando automáticamente cambio de estado de equipo | [x] Implementado | |
| CU-37 | Consultando historial completo de estados de equipo | [x] Implementado | |
| CU-38 | Calculando fecha de vencimiento de garantía | [x] Implementado | |
| CU-39 | Mostrando indicador visual de garantía vigente | [x] Implementado | |
| CU-40 | Registrando diagnóstico técnico al enviar a revisión | [x] Implementado | |

### Gestión de bodegas y stock

| CU | Nombre | Estado | Notas |
|----|--------|--------|-------|
| CU-41 | Creando bodega | [x] Implementado | |
| CU-42 | Editando bodega | [x] Implementado | |
| CU-43 | Desactivando bodega | [x] Implementado | |
| CU-44 | Consultando listado de bodegas | [x] Implementado | |
| CU-45 | Consultando stock de bodega | [x] Implementado | |
| CU-46 | Configurando umbral de stock mínimo | [x] Implementado | |
| CU-47 | Registrando ubicación física de equipo en bodega | [ ] Pendiente | |
| CU-48 | Consultando ubicación externa de equipo fuera de bodega | [ ] Pendiente | |

### Recepción de equipos desde proveedor

| CU | Nombre | Estado | Notas |
|----|--------|--------|-------|
| CU-49 | Creando proveedor | [ ] Pendiente | |
| CU-50 | Editando proveedor | [ ] Pendiente | |
| CU-51 | Consultando listado de proveedores | [ ] Pendiente | |
| CU-52 | Registrando orden de ingreso desde proveedor | [ ] Pendiente | |
| CU-53 | Consultando órdenes de ingreso | [ ] Pendiente | |
| CU-54 | Registrando recepción total o parcial de orden de ingreso | [ ] Pendiente | |
| CU-55 | Ingresando números de serie en recepción de equipos | [ ] Pendiente | |
| CU-56 | Registrando fecha de adquisición real en recepción | [ ] Pendiente | |

### Asignación de equipos a técnicos

| CU | Nombre | Estado | Notas |
|----|--------|--------|-------|
| CU-57 | Registrando salida de equipos de bodega a técnico | [ ] Pendiente | |
| CU-58 | Manteniendo inventario personal del técnico | [ ] Pendiente | |
| CU-59 | Validando número de serie en salida de bodega | [ ] Pendiente | |
| CU-60 | Registrando salida de consumibles de bodega a técnico | [ ] Pendiente | |
| CU-61 | Consultando vista móvil de trabajos e inventario del técnico | [ ] Pendiente | |
| CU-62 | Validando stock disponible en bodega para consumibles | [ ] Pendiente | |

### Cierre de trabajo e instalación en cliente

| CU | Nombre | Estado | Notas |
|----|--------|--------|-------|
| CU-63 | Registrando cierre de trabajo de instalación | [ ] Pendiente | |
| CU-64 | Ejecutando acciones atómicas del cierre de instalación | [ ] Pendiente | |
| CU-65 | Creando datos del cliente | [ ] Pendiente | |
| CU-66 | Editando datos del cliente | [ ] Pendiente | |
| CU-67 | Consultando datos y equipos del cliente | [ ] Pendiente | |
| CU-68 | Verificando saldo de consumibles en cierre | [ ] Pendiente | |
| CU-69 | Registrando cierre de trabajo de reparación | [ ] Pendiente | |
| CU-70 | Seleccionando tipo de trabajo codificado para cierre | [ ] Pendiente | |

### Devolución de equipos desde clientes

| CU | Nombre | Estado | Notas |
|----|--------|--------|-------|
| CU-71 | Registrando devolución de equipo desde cliente | [ ] Pendiente | |
| CU-72 | Registrando resultado de revisión de equipo | [ ] Pendiente | |
| CU-73 | Mostrando información de equipo en devolución | [ ] Pendiente | |

### Reacondicionamiento y equipos defectuosos

| CU | Nombre | Estado | Notas |
|----|--------|--------|-------|
| CU-74 | Reacondicionando equipo operativo desde revisión a bodega | [ ] Pendiente | |
| CU-75 | Enviando equipo a reparación externa | [ ] Pendiente | |
| CU-76 | Reingresando equipo desde reparación externa | [ ] Pendiente | |
| CU-77 | Consultando listado de equipos en revisión | [ ] Pendiente | |

### Baja definitiva de equipos

| CU | Nombre | Estado | Notas |
|----|--------|--------|-------|
| CU-78 | Registrando baja definitiva de equipo | [ ] Pendiente | |
| CU-79 | Ejecutando acciones posteriores a baja definitiva | [ ] Pendiente | |
| CU-80 | Registrando donación de equipos dados de baja | [ ] Pendiente | |

### Préstamos a externos

| CU | Nombre | Estado | Notas |
|----|--------|--------|-------|
| CU-81 | Registrando préstamo externo de equipos | [ ] Pendiente | |
| CU-82 | Registrando retorno de préstamo externo | [ ] Pendiente | |
| CU-83 | Consultando tabla de préstamos externos activos | [ ] Pendiente | |
| CU-84 | Validando trazabilidad de devolución de préstamo externo | [ ] Pendiente | |

### Reportes y estadísticas

| CU | Nombre | Estado | Notas |
|----|--------|--------|-------|
| CU-85 | Generando reporte de stock actual | [x] Implementado | Grupo 5 · RF-60 · `/reportes/stock` · filtros, estados, umbral y auditoría |
| CU-86 | Generando reporte de movimientos de inventario | [x] Implementado | Grupo 5 · RF-61 · `/reportes` · filtros, rango máximo 365 días, aislamiento y auditoría |
| CU-87 | Generando reporte de equipos instalados por cliente | [ ] Pendiente | |
| CU-88 | Generando reporte de garantías | [ ] Pendiente | |
| CU-89 | Generando reporte de inventario actual de técnicos | [ ] Pendiente | |
| CU-90 | Generando reporte de productividad de técnicos | [ ] Pendiente | |
| CU-91 | Generando reporte de consumo de consumibles | [ ] Pendiente | |
| CU-92 | Exportando reporte a Excel | [ ] Pendiente | |
| CU-93 | Exportando reporte a PDF | [ ] Pendiente | |

### Alertas y notificaciones

| CU | Nombre | Estado | Notas |
|----|--------|--------|-------|
| CU-94 | Consultando alertas activas en el dashboard | [ ] Pendiente | |
| CU-95 | Mostrando aviso de garantía vigente al cambiar estado | [ ] Pendiente | |
| CU-96 | Recibiendo notificaciones visuales en la campana del sistema | [ ] Pendiente | |
