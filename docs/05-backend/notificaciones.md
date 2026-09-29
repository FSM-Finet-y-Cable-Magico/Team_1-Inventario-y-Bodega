# Backend — Módulo `notificaciones`

**Carpeta:** `codigo/backend-inventario/src/notificaciones/` · **CU-96** (RF-70, módulo 7.3.14
Alertas y notificaciones).

## 1. Endpoints

Controller-level: `@UseGuards(AuthGuard('jwt'), RolesGuard)`. Aislamiento por empresa manual en el
service (patrón de `prestamos`/`companies`/`alertas`).

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| GET | `/api/notificaciones` | `ADMIN_BODEGA`, `ADMIN`, `SUPERUSUARIO` | Genera las pendientes (dedupe diario) y devuelve `{ contador, notificaciones }` de las **no leídas**. |
| PATCH | `/api/notificaciones/:id/leer` | idem | Marca una notificación como leída. 404 genérico si no existe o es de otra empresa. |
| PATCH | `/api/notificaciones/leer-todas` | idem | Marca como leídas todas las no leídas visibles para el actor, en un solo `UPDATE`. |

- `TECNICO_TERRENO` no es actor del CU: `RolesGuard` responde 403 (el frontend ni siquiera llama
  al endpoint para ese rol, igual que en `alertas`).
- `PATCH .../leer` y `PATCH .../leer-todas` auditan `ACTUALIZAR` sobre `entidad_afectada: 'notificacion'`
  (la de "todas" usa `id_entidad_afectada: 0` como marca de operación en lote, mismo criterio que
  `reportes.service.ts`). El `GET` no audita: es una consulta (dispara generación, pero eso no es
  una mutación decidida por el actor).

## 2. Persistencia y deduplicación

A diferencia de `alertas` (CU-94, calculada al vuelo sin tabla propia), CU-96 **persiste** cada
notificación en `notificacion` (ver `03-base-de-datos.md`) para poder marcarla como leída y
conservar un historial de 30 días.

| Tipo (literal exacto, comparte string con CU-94) | Regla | Fuente reutilizada | Clave de deduplicación |
|---------------------------------------------------|-------|---------------------|--------------------------|
| **`Stock bajo umbral`** | Igual que CU-94 (A): stock activo de un tipo en una bodega `<` umbral configurado. | `CompaniesService.getAlertasStockMinimo(idEmpresa)` (CU-46), extendido con `id_bodega`/`id_tipo_equipo` | `Stock bajo umbral:{id_bodega}-{id_tipo_equipo}:{YYYY-MM-DD}` |
| **`Préstamo vencido`** | Igual que CU-94 (C): préstamo `PRESTAMO_EXTERNO` `ACTIVO` con `dias_restantes < 0`. Máximo 1 por préstamo por día. | `PrestamosService.listar({ estado: 'ACTIVO' }, actorSistema)` (CU-83) | `Préstamo vencido:{id_prestamo}:{YYYY-MM-DD}` |

`TIPO_STOCK_BAJO_UMBRAL` y `TIPO_PRESTAMO_VENCIDO` se **importan directamente desde
`alertas.service.ts`** (no se duplica el string): es una dependencia a nivel de TypeScript, no un
`import` del `AlertasModule` de Nest — no hay ciclo de inyección de dependencias.

**Generación (`generarPendientes`, privado):**
1. Recorre **ambas empresas** (Finet y Cable Mágico), no solo la del actor que dispara el `GET` —
   así una notificación existe para cuando otro usuario abra su propia campana, sin depender de
   que un Superusuario haya navegado antes. Para el préstamo vencido se usa un actor interno
   `{ roles: ['SUPERUSUARIO'] }` (nunca expuesto al cliente) para traer los préstamos de ambas
   empresas en una sola llamada a `PrestamosService.listar`.
2. Por cada candidata calcula `clave_dedupe` y hace `findOne` por esa clave; si ya existe, la
   ignora. El `UNIQUE` de la columna es la garantía real (no una condición de carrera resuelta en
   memoria): si dos requests concurrentes generan la misma clave, el segundo `INSERT` fallaría por
   duplicado — en la práctica esto no ocurre porque el `findOne` previo ya la encuentra.
3. Purga (`DELETE`) las notificaciones `leida=true` con `fecha_generacion` de más de 30 días.

Este método se ejecuta **on-demand**, al principio de cada `GET /api/notificaciones` (nota del CU:
"evaluación on-demand con dedupe diario" en vez de un cron/job separado — no hay infraestructura
de scheduler en el proyecto).

## 3. Respuesta de `GET /api/notificaciones`

```json
{
  "contador": 2,
  "notificaciones": [
    {
      "id_notificacion": 7,
      "tipo": "Préstamo vencido",
      "empresa": "Finet",
      "descripcion": "Préstamo PE-00002 a Juan Pérez: vencido hace 5 días.",
      "fecha_hora": "2026-09-28T05:14:29.488Z"
    }
  ]
}
```

- Solo incluye **no leídas** (`leida = false`); no hay endpoint de historial en este CU.
- `descripcion`: máximo 100 caracteres (recortada con `...`, mismo criterio que CU-94).
- Orden: más recientes primero (`fecha_generacion DESC`).
- **Excepción 1:** sin notificaciones pendientes, `contador: 0` y `notificaciones: []`. El
  frontend muestra `No tiene notificaciones pendientes.` (mensaje exacto del CU).

## 4. Aislamiento por empresa

- **Generación:** siempre evalúa ambas empresas (ver §2.1) — es responsabilidad del sistema, no
  del actor que casualmente dispara el `GET`.
- **Listado y "marcar todas":** Superusuario ve/marca las de ambas empresas; Administrador y
  Administrador de bodega, solo las de su `id_empresa`.
- **"Marcar una" (`:id/leer`):** si la notificación no existe o es de otra empresa, `404` genérico
  (`'Notificación no encontrada'`) — mismo criterio cross-empresa que el resto del sistema.

## 5. Cambios en otros módulos (solo para reutilizar)

| Módulo | Cambio |
|--------|--------|
| `companies` | `AlertaStockMinimo` (y `getAlertasStockMinimo`) suma `id_bodega`/`id_tipo_equipo` — campos nuevos, no rompen el contrato que ya usan `alertas`/CU-94. |
| `prestamos` | Sin cambios: `PrestamosModule` ya exportaba `PrestamosService` desde CU-94. |
| `alertas` | Sin cambios: solo se importan los dos strings de tipo (`TIPO_STOCK_BAJO_UMBRAL`, `TIPO_PRESTAMO_VENCIDO`), ya exportados. |

## 6. Frontend: dónde vive la campana

`Header.svelte` ya tenía una campana "ad-hoc" (CU-46 stock + CU-20 transferencias pendientes +
CU-78 bajas pendientes, sin estado leída/no leída, recalculada en cada apertura). CU-96 **agrega**
una sección nueva y separada dentro del mismo panel — "Notificaciones del sistema" — con su propio
contador, su propio vacío (`No tiene notificaciones pendientes.`) y las acciones de marcar una o
todas. No se tocó ni reordenó el bloque existente: el badge de la campana ahora suma
`totalAdHoc + contadorNotificaciones`. Ver `04-frontend/rutas.md` → `Header`.

## 7. CU cubiertos

CU-96 (flujo normal + Excepción 1). Diagramas: `diagramas/diagramas-secuencia/CU96/`.
