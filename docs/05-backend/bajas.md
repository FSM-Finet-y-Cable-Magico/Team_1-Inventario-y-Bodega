# Backend — Módulo `bajas`

**Carpeta:** `codigo/backend-inventario/src/bajas/` · **CU-78** (y acciones A/D de CU-79)

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

## 9. Pruebas

`src/bajas/bajas.service.spec.ts` cubre: baja directa de Administrador, solicitud del técnico,
Excepción 1, Excepción 3, motivo fuera de lista, aprobación y rechazo. Correr con:

```bash
cd codigo/backend-inventario && npx jest src/bajas
```
