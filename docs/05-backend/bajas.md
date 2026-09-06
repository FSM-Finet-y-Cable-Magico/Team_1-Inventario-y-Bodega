# Backend — Módulo `bajas`

**Carpeta:** `codigo/backend-inventario/src/bajas/` · **CU-78** y **CU-79**

## 1. Endpoints

Controller-level: `@UseGuards(AuthGuard('jwt'), RolesGuard)`. **No usa `CompanyIsolationGuard`**:
el aislamiento es manual en el service (patrón de `transferencias`/`bodegas`).

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| POST | `/api/bajas` | `ADMIN`, `SUPERUSUARIO`, `ADMIN_BODEGA`, `TECNICO_TERRENO` | CU-78: registrar baja definitiva. El flujo depende del rol (ver §2). |
| GET | `/api/bajas` | todos los roles | CU-78: bandeja de solicitudes, filtro `?estado=`. |
| POST | `/api/bajas/:id/aprobar` | `ADMIN`, `SUPERUSUARIO` | CU-78: aprobar la solicitud → ejecuta la baja real. |
| POST | `/api/bajas/:id/rechazar` | `ADMIN`, `SUPERUSUARIO` | CU-78: rechazar (motivo obligatorio, máx. 200). |

## 2. Concepto clave: el flujo depende del rol del actor

| Rol del actor | Qué ocurre en `POST /api/bajas` |
|---------------|--------------------------------|
| `ADMIN`, `SUPERUSUARIO`, `ADMIN_BODEGA` | La baja se aplica **directamente**: la unidad pasa a `Dado de baja` (irreversible). No se crea fila en `solicitud_baja`. |
| `TECNICO_TERRENO` | Se crea una fila en `solicitud_baja` con estado `Pendiente de aprobación`. **La unidad NO cambia de estado.** |

`ADMIN_BODEGA` aplica la baja directa porque ya podía ejecutar la transición a `Dado de baja`
por el flujo de cambio de estado (CU-35); el caso de uso solo exige aprobación para el técnico.

La respuesta trae `requiere_aprobacion: true|false` para que el frontend muestre el mensaje correcto.

## 3. La baja real reutiliza la máquina de estados

`BajasService.ejecutarBaja()` llama a `UnitsService.transicionarEstado(id, 'Dado de baja', ...)`
pasando el motivo. Con esto la baja hereda, en la misma transacción (CU-79 A y D):

- validación de la transición (`En bodega` / `En revisión` → `Dado de baja`),
- escritura en `historial_estado_equipo` con `Baja definitiva. Motivo: <motivo>`,
- persistencia de `unidad_equipo.motivo_baja` / `motivo_baja_detalle`,
- auditoría con acción **`BAJA_DEFINITIVA`** (número de serie, motivo, empresa, usuario y fecha).

**No dupliques esa lógica**: cualquier baja nueva debe pasar por `transicionarEstado`.

## 4. Motivos (lista cerrada)

`Pérdida no recuperable` · `Robo confirmado` · `Falla irreparable` · `Obsolescencia` ·
`Donación a institución` · `Otro`

`Donación a institución` es el motivo que alimenta **CU-80** (donación de equipos dados de baja).
La constante vive en `bajas.service.ts` (`MOTIVOS_BAJA`) y se replica en el frontend
(`src/lib/types/index.ts`).

## 5. Excepciones (mensajes exactos del CU)

| # | Condición | Respuesta |
|---|-----------|-----------|
| 1 | El estado actual no permite la baja (p. ej. `Instalado en cliente`) | `400` — `Transición de estado no permitida para este equipo.` |
| 2 | El equipo tiene garantía vigente | **No bloquea el backend**: el aviso y el "continuar/cancelar" son del frontend (`/unidades/[id]`), que ya recibe `garantia.garantia_vigente` en la ficha (CU-38/39). |
| 3 | Motivo `Otro` sin descripción de 5–200 caracteres | `400` — `Debe ingresar una descripción cuando selecciona Otro.` |
| — | Motivo fuera de la lista cerrada | `400` — `El motivo de baja seleccionado no es válido. Opciones permitidas: ...` |
| — | Ya existe una solicitud pendiente para esa unidad | `409` |
| — | Solicitud ya resuelta al aprobar/rechazar | `409` |

## 6. Auditoría

| Acción | Cuándo |
|--------|--------|
| `SOLICITAR_BAJA` | El técnico crea la solicitud. |
| `APROBAR_BAJA` | Se aprueba la solicitud (además de `BAJA_DEFINITIVA` de la transición). |
| `RECHAZAR_BAJA` | Se rechaza la solicitud (guarda `motivo_rechazo`). |
| `BAJA_DEFINITIVA` | Toda transición a `Dado de baja` (la registra `UnitsService`). |

## 7. Notificación (campana)

`CompaniesService.getMiDashboard()` expone `bajas_pendientes` (solo para `ADMIN`/`SUPERUSUARIO`;
el Superusuario ve ambas empresas). El `Header.svelte` lo suma al badge junto a las alertas de
stock (CU-46) y las transferencias pendientes (CU-20).

## 8. Deuda conocida

- `aprobar()` ejecuta la baja y luego cierra la solicitud **sin compartir transacción**: si fallara
  el segundo paso, la unidad quedaría de baja y la solicitud pendiente (al reintentar aparecería la
  Excepción 1). Marcado con un comentario `ponytail:` en el código.

## 9. CU-79 — Acciones automáticas posteriores a la baja

CU-79 no agrega endpoints: son las garantías que deja la transacción de baja y el filtrado
posterior de las consultas.

| Acción | Dónde está implementada |
|--------|-------------------------|
| **(A)** Estado `Dado de baja` permanente e irreversible | `UnitsService.transicionarEstado`: `transicionesPermitidas['Dado de baja'] = []`. Ningún otro service escribe `estado` (transferencias solo cambia empresa/bodega y exige `En bodega`). |
| **(B)** Exclusión de conteos de stock activo y listas de selección | `BodegasService.findAll` y `getStock` filtran `estado <> 'Dado de baja'`; `CompaniesService` descuenta las bajas de `total_unidades`; al salir de bodega la unidad pierde `id_bodega_actual`. |
| **(C)** Registro e historial accesibles | `verFichaDetalle` y `verHistorialEstados` **no** filtran por estado: la ficha y el historial de una unidad dada de baja siguen consultándose por NS. |
| **(D)** Auditoría completa | Acción `BAJA_DEFINITIVA` con `numero_serie`, `motivo_baja`, `id_empresa`, `id_usuario` y `fecha_hora` (ver §6). |
| **Excepción 1** (error al registrar) | La transacción con reintentos de `transicionarEstado` (3 intentos) revierte todo y devuelve `400 'Error al registrar el cambio en el historial...'`; la unidad conserva estado y bodega. |

### 9.1 Bug de raíz corregido con CU-79

`transicionarEstado` limpiaba la bodega con `unidad.id_bodega_actual = undefined`, y **TypeORM
ignora las propiedades `undefined` al guardar**: la columna nunca se vaciaba. Toda unidad que salía
de bodega (dada de baja, instalada en cliente, en préstamo…) seguía asociada a su bodega y **se
contaba en el stock**. Ahora se limpia con `null` explícito (`id_bodega_actual`, `numero_poste`).

Las filas anteriores al fix conservan su `id_bodega_actual`; por eso el filtro por estado en los
conteos es la defensa principal y no se hizo un UPDATE masivo de datos históricos.

## 10. Checklist CU-79 — endpoints que listan o cuentan unidades

| Endpoint / consulta | Service | ¿Excluye `Dado de baja`? | Motivo |
|---------------------|---------|--------------------------|--------|
| `GET /api/bodegas` (`resumen_stock_total`) | `BodegasService.findAll` | **Sí** (CU-79) | Stock activo de la bodega. |
| `GET /api/bodegas/:id/stock` | `BodegasService.getStock` | **Sí** (CU-79) | Stock activo por tipo. |
| `GET /api/empresas/dashboard` y `/mi-dashboard` | `CompaniesService.getEstadisticasEmpresa` | **Sí** en `total_unidades` (nuevo campo `unidades_dadas_de_baja`); `unidades_por_estado` las conserva | (B) para el total, (C) para el histórico. |
| Alertas de umbral mínimo (CU-46) | `CompaniesService` | **Sí** (implícito: cuenta solo `En bodega`) | Stock activo. |
| `POST /api/transferencias` | `TransferenciasService.registrarTransferencia` | **Sí** (exige `En bodega`) | No se transfiere lo dado de baja. |
| `POST /api/bajas` | `BajasService.registrar` | **Sí** (exige `En bodega`/`En revisión`) | Evita doble baja. |
| `PATCH /api/unidades/:id/cambiar-estado` | `UnitsService.transicionarEstado` | **Sí** (estado terminal, sin transiciones de salida) | (A). |
| `GET /api/unidades` | `UnitsService.listarUnidades` | **No, a propósito** | Listado general con filtro por estado; permite encontrar las unidades de baja (C). |
| `GET /api/unidades/:id/ficha` | `UnitsService.verFichaDetalle` | **No, a propósito** | (C) registro accesible. |
| `GET /api/unidades/:serial/historial` | `UnitsService.verHistorialEstados` | **No, a propósito** | (C) historial accesible. |
| Conteos de unidades por tipo (CU-26/CU-27) | `CatalogService` (3 consultas) | **No, a propósito** | Integridad referencial: cuentan unidades registradas en cualquier estado. |
| Select de unidades de `/transferencias` (frontend) | `+page.svelte` | **Sí** (filtra `estado === 'En bodega'`) | Única lista de selección de unidades del sistema hoy. |

## 11. Pruebas

`src/bajas/bajas.service.spec.ts` cubre: baja directa de Administrador, solicitud del técnico,
Excepción 1, Excepción 3, motivo fuera de lista, aprobación y rechazo. Correr con:

```bash
cd codigo/backend-inventario && npx jest src/bajas
```
