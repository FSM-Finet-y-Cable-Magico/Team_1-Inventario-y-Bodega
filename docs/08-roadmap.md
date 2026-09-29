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
- **Implementados por T1:** 83 (CU-01 a CU-48, CU-49 a CU-62, CU-64, CU-68, CU-72, CU-74 a CU-84, CU-85, CU-86, CU-88, CU-89, CU-91, CU-94, CU-96) — incluye CU-47, CU-48, CU-57..62, CU-61, CU-64 y CU-68; en `dev` (hasta CU-68) y en la rama `feat/javier-cus` (CU-48 y CU-61)
- **Tomados por G3 (no los implementa T1):** 4 (CU-63, CU-65, CU-66, CU-67) — verificados contra `Team-3-FSM` (26-sept-2026), evidencia en `docs/11` §6
- **Pendientes (Incremento 3):** 9 (CU-69, CU-70, CU-71, CU-73, CU-87, CU-90, CU-92, CU-93, CU-95) — tickets **sc-147 a sc-157** con responsable asignado (ver columna Notas)
- **Integración con otros grupos (fuera del conteo de 96):** **sc-158/sc-159** (G8 CRM, acuerdo v1 ratificado 24-sept-2026 · Javier) — sc-158 (P0) y sc-159 (P1) implementados en `feat/javier-cus`; pendiente solo la API key de G8. **sc-113** (G3, implementado)

## Leyenda

| Estado | Significado |
|--------|-------------|
| `[x]` Implementado | Caso de uso completo (backend + frontend + BDD + docs + diagramas + PR). |
| `[x]` Implementado por G3 | CU que **no implementa T1**: lo cubre G3 y T1 solo consume sus endpoints. Evidencia en `docs/11`. |
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
| CU-47 | Registrando ubicación física de equipo en bodega | [x] Implementado | Mergeado a `dev` (PR #39 · Javier) |
| CU-48 | Consultando ubicación externa de equipo fuera de bodega | [x] Implementado | Incremento 3 · sc-139 (Javier) — rama `feat/javier-cus` (pendiente PR). `ubicacion_externa` en la ficha + sección UI con E1 y enriquecimiento G3 opcional |

### Recepción de equipos desde proveedor

| CU | Nombre | Estado | Notas |
|----|--------|--------|-------|
| CU-49 | Creando proveedor | [x] Implementado | Módulo `proveedores` (back + front + BDD) |
| CU-50 | Editando proveedor | [x] Implementado | Módulo `proveedores` (PATCH + modal edición) |
| CU-51 | Consultando listado de proveedores | [x] Implementado | GET con ADMIN_BODEGA + búsqueda + EmptyState |
| CU-52 | Registrando orden de ingreso desde proveedor | [x] Implementado | Módulo `ordenes-ingreso` (back + front + BDD + docs + diagramas). Rama `feat/CU-49-crear-proveedor` (Javier) — pendiente render PNG de los `.puml` y capturas en `Casos de uso/CU-52/` |
| CU-53 | Consultando órdenes de ingreso | [x] Implementado | Filtros (estado, proveedor, rango de fechas, empresa) + ficha `/ordenes-ingreso/[id]`. Rama `feat/CU-49-crear-proveedor` (Javier) — pendiente render PNG de los `.puml` y capturas en `Casos de uso/CU-53/` |
| CU-54 | Registrando recepción total o parcial de orden de ingreso | [x] Implementado | `POST /ordenes-ingreso/:id/recepcion` + modal en la ficha. Rama `feat/CU-49-crear-proveedor` (Javier) — pendiente render PNG de los `.puml` y capturas en `Casos de uso/CU-54/` |
| CU-55 | Ingresando números de serie en recepción de equipos | [x] Implementado | NS por unidad en la recepción, reusa la validación de CU-28 y crea `unidad_equipo` 'En bodega'. Rama `feat/CU-49-crear-proveedor` (Javier) — pendiente render PNG de los `.puml` y capturas en `Casos de uso/CU-55/` |
| CU-56 | Registrando fecha de adquisición real en recepción | [x] Implementado | `fecha_recepcion` obligatoria en la recepción; base de `fecha_adquisicion` y de la garantía (CU-38/39). Rama `feat/CU-49-crear-proveedor` (Javier) — pendiente render PNG de los `.puml` y capturas en `Casos de uso/CU-56/` |

### Asignación de equipos a técnicos

| CU | Nombre | Estado | Notas |
|----|--------|--------|-------|
| CU-57 | Registrando salida de equipos de bodega a técnico | [x] Implementado | Mergeado a `dev` |
| CU-58 | Manteniendo inventario personal del técnico | [x] Implementado | Mergeado a `dev` |
| CU-59 | Validando número de serie en salida de bodega | [x] Implementado | Mergeado a `dev` |
| CU-60 | Registrando salida de consumibles de bodega a técnico | [x] Implementado | Mergeado a `dev` |
| CU-61 | Consultando vista móvil de trabajos e inventario del técnico | [x] Implementado | Incremento 3 · sc-140 (Javier) — rama `feat/javier-cus` (pendiente PR). `GET /tecnicos/me/jornada` (trabajos G3 + inventario CU-58) y página `/jornada` |
| CU-62 | Validando stock disponible en bodega para consumibles | [x] Implementado | Mergeado a `dev` |

### Cierre de trabajo e instalación en cliente

| CU | Nombre | Estado | Notas |
|----|--------|--------|-------|
| CU-63 | Registrando cierre de trabajo de instalación | [x] Implementado por G3 | Tomado por **G3-CU-04** (`POST /ordenes/:id/cerrar` + fan-out del webhook). T1 solo consume el cierre (CU-64/68). Verificado 26-sept-2026 (`Team-3-FSM` origin/main) — ver `docs/11` §6 |
| CU-64 | Ejecutando acciones atómicas del cierre de instalación | [x] Implementado | Incremento 3 · sc-142 (Javier) — rama `feat/javier-cus` (pendiente PR). Webhook G3 extendido: cliente/dirección, descuento de materiales, `data.srv` (SRV-YYYY-XXXXX) y trazabilidad en `integracion_cierre` |
| CU-65 | Creando datos del cliente | [x] Implementado por G3 | Tomado por **G3-CU-27** (`POST /clientes`, DV + RUT duplicado 409). Verificado 26-sept-2026 — ver `docs/11` §6 |
| CU-66 | Editando datos del cliente | [x] Implementado por G3 | Tomado por **G3-CU-28** (`PATCH /clientes/:id`). Verificado 26-sept-2026 — ver `docs/11` §6 |
| CU-67 | Consultando datos y equipos del cliente | [x] Implementado por G3 | Tomado por **G3-CU-06/28** (`GET /clientes` + `GET /clientes/rut/:rut`, también S2S). Verificado 26-sept-2026 — ver `docs/11` §6 |
| CU-68 | Verificando saldo de consumibles en cierre | [x] Implementado | Incremento 3 · sc-146 (Javier) — rama `feat/javier-cus` (pendiente PR). `validarSaldo`/`detectarInsuficientes` + ajuste en el webhook (nunca rechazo) |
| CU-69 | Registrando cierre de trabajo de reparación | [ ] Pendiente | Incremento 3 · sc-147 (Tomás) |
| CU-70 | Seleccionando tipo de trabajo codificado para cierre | [ ] Pendiente | Incremento 3 · sc-148 (Tomás) |

### Devolución de equipos desde clientes

| CU | Nombre | Estado | Notas |
|----|--------|--------|-------|
| CU-71 | Registrando devolución de equipo desde cliente | [ ] Pendiente | Incremento 3 · sc-149 (Javiera) |
| CU-72 | Registrando resultado de revisión de equipo | [x] Implementado | |
| CU-73 | Mostrando información de equipo en devolución | [ ] Pendiente | Incremento 3 · sc-150 (Javiera) |

### Reacondicionamiento y equipos defectuosos

| CU | Nombre | Estado | Notas |
|----|--------|--------|-------|
| CU-74 | Reacondicionando equipo operativo desde revisión a bodega | [x] Implementado | |
| CU-75 | Enviando equipo a reparación externa | [x] Implementado | |
| CU-76 | Reingresando equipo desde reparación externa | [x] Implementado | |
| CU-77 | Consultando listado de equipos en revisión | [x] Implementado | |

### Baja definitiva de equipos

| CU | Nombre | Estado | Notas |
|----|--------|--------|-------|
| CU-78 | Registrando baja definitiva de equipo | [x] Implementado | Rama `tomas`. Módulo backend `bajas` + `/bajas` y `/unidades/[id]`. |
| CU-79 | Ejecutando acciones posteriores a baja definitiva | [x] Implementado | Rama `tomas`. Sin endpoint nuevo: exclusión del inventario activo en `bodegas`/`companies` + fix de `id_bodega_actual`. Checklist en `05-backend/bajas.md` §10. |
| CU-80 | Registrando donación de equipos dados de baja | [x] Implementado | Rama `tomas`. Módulo backend `donaciones` (+ PDF sin dependencias) y pestaña Donaciones en `/bajas`. |

### Préstamos a externos

| CU | Nombre | Estado | Notas |
|----|--------|--------|-------|
| CU-81 | Registrando préstamo externo de equipos | [x] Implementado | Rama `tomas`. Módulo backend `prestamos` (tabla compartida con CU-75 de G3) y página `/prestamos`. |
| CU-82 | Registrando retorno de préstamo externo | [x] Implementado | Rama `tomas`. Retorno total/parcial en `prestamos`. Incluye la **transición ampliada** `En préstamo externo → En revisión` (ratificada). |
| CU-83 | Consultando tabla de préstamos externos activos | [x] Implementado | Rama `tomas`. Días restantes server-side, filtros por estado/empresa y badge por tipo en `/prestamos`. |
| CU-84 | Validando trazabilidad de devolución de préstamo externo | [x] Implementado | Rama `tomas`. Validaciones (A)(B)(C) del retorno en `prestamos` + 7 tests en `prestamos.service.spec.ts`. |

### Reportes y estadísticas

| CU | Nombre | Estado | Notas |
|----|--------|--------|-------|
| CU-85 | Generando reporte de stock actual | [x] Implementado | Grupo 5 · RF-60 · `/reportes/stock` · filtros, estados, umbral y auditoría |
| CU-86 | Generando reporte de movimientos de inventario | [x] Implementado | Grupo 5 · RF-61 · `/reportes` · filtros, rango máximo 365 días, aislamiento y auditoría |
| CU-87 | Generando reporte de equipos instalados por cliente | [ ] Pendiente | Incremento 3 · sc-151 (Kevin) |
| CU-88 | Generando reporte de garantías | [x] Implementado | Grupo 5 · RF-63 · `/api/reportes/garantias` · filtro por empresa, tipo y período, empty state y auditoría |
| CU-89 | Generando reporte de inventario actual de técnicos | [x] Implementado | Grupo 5 · RF-64 · endpoint `/api/reportes/tecnicos/inventario` y pestaña en `/reportes` |
| CU-90 | Generando reporte de productividad de técnicos | [ ] Pendiente | Incremento 3 · sc-152 (Kevin) |
| CU-91 | Generando reporte de consumo de consumibles | [x] Implementado | Grupo 5 · RF-66 · endpoint `/api/reportes/consumo` y pestaña Consumo de consumibles |
| CU-92 | Exportando reporte a Excel | [ ] Pendiente | Incremento 3 · sc-153 (Kevin) |
| CU-93 | Exportando reporte a PDF | [ ] Pendiente | Incremento 3 · sc-154 (Tomás) |

### Alertas y notificaciones

| CU | Nombre | Estado | Notas |
|----|--------|--------|-------|
| CU-94 | Consultando alertas activas en el dashboard | [x] Implementado | Incremento 3 · sc-155 (Uriel) — PR #61 (`feat/runa`) |
| CU-95 | Mostrando aviso de garantía vigente al cambiar estado | [ ] Pendiente | Incremento 3 · sc-156 (Javiera) |
| CU-96 | Recibiendo notificaciones visuales en la campana del sistema | [x] Implementado | Incremento 3 · sc-157 (Uriel) — PR #61 (`feat/runa`) |
