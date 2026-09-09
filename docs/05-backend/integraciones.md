# Módulo `integraciones` — API server-to-server (G3 Terreno/FSM)

> **Origen:** ticket Shortcut **sc-113** (integración con G3, no es un CU del backlog).
> Solicitud nuestra: `docs/12-solicitud-endpoints-otros-grupos.md`; respuesta de G3: 03-sept-2026
> (copia local en `local/respuesta-g3-original.md`). No hay JWT: la autenticación es **X-API-KEY**.

## 1. Endpoints

| Método | Ruta | Auth | Para qué |
|--------|------|------|----------|
| GET | `/api/integraciones/unidades/:numeroSerie?id_empresa=N` | `X-API-KEY` | G3 valida la serie **antes** de que el técnico cierre la OT (deadline acordado: 13-sept-2026) |
| POST | `/api/integraciones/ordenes/:idOt/cierre` | `X-API-KEY` | Webhook receptor del cierre de OT de G3 (push). Base del procesamiento del CU-64 |

Contrato de errores: `400` falta `id_empresa`/no numérico, payload malformado, `clave_idempotencia`
ausente, `id_ot` de ruta ≠ payload, acción no reconocida · `401` falta header o key inválida ·
`403` key válida sin scope sobre esa empresa · `404` serie no encontrada en la empresa pedida.
Respuestas envueltas `{ success, data }`.

## 2. Autenticación (`guards/api-key.guard.ts`)

- Header `X-API-KEY`. Keys por entorno en la variable **`INTEGRACION_API_KEYS`** (JSON):
  `[{"key":"...","grupo":"G3","empresas":[1,2]}]`.
- Si la variable no está definida o es JSON inválido, ninguna key autentica (sin defaults ocultos).
- La key resuelva `req.integracion = { grupo, empresas }`; el scope de `id_empresa` se valida
  en el service (`validarScope` → 403 fuera de scope).
- En `docker-compose.yml` hay un valor **solo de desarrollo** (`g3-dev-key`); la real se define
  como variable de entorno en Railway. Las keys nunca van commiteadas.

## 3. Lógica (`integraciones.service.ts`)

### 3.1 `consultarUnidadPorSerie` (GET)
- Busca por `numero_serie` + `id_empresa` (aislamiento por empresa; 404 genérico
  `'Número de serie no encontrado.'`). Devuelve serie, estado (literal exacto), empresa y tipo.

### 3.2 `recibirCierreOt` (webhook)
- **Idempotencia:** dedup por `clave_idempotencia` (`{id_ot}:{fecha_completada ISO}`) con
  UNIQUE en `integracion_cierre`; mismo id_ot con clave distinta = re-cierre (evento nuevo).
  Ante carrera de inserciones (SQLSTATE `23505`) responde el registro ganador (2xx).
- **Regla acordada:** payload válido → **2xx siempre**, registrando **discrepancias por ítem**
  (`SERIE_NO_EXISTE`, `TRANSICION_INVALIDA`); un serial mal tecleado no invalida el cierre.
- **Mapeo de acciones G3 → literales T1** (constante `ACCIONES_G3`):
  - `INSTALADO_EN_CLIENTE` → `Instalado en cliente` (desde `Asignado a técnico`)
  - `RETIRADO_A_BODEGA` → `En bodega` (desde `Asignado a técnico`, `En revisión`, `En préstamo externo`)
  - `RETIRADO_PARA_DIAGNOSTICO` → `En revisión` (desde `Asignado a técnico`, `Instalado en cliente`)
  - `BAJA_EN_TERRENO` → `Dado de baja` (desde `En bodega`, `En revisión`)
- Aplica las mismas reglas de la máquina de estados que `UnitsService.transicionarEstado`
  (al salir de bodega limpia bodega/ubicación; al reingresar la ubicación queda vacía).
- **Diagnóstico en `En revisión` (acuerdo G3 del 08-sept):** el diagnóstico registrado es la
  `categoria_falla` del payload del cierre — tolerante a formato: string raíz, `{nombre}` raíz
  o `reparacion.categoria_falla_otro` (contrato doc-12 §1.3); si no viene nada,
  queda `'Causa desconocida'` (`DIAGNOSTICO_FALLBACK_G3`). El motivo del historial incluye
  `Categoría de falla: ...` cuando existe.
- Cada transición escribe en `historial_estado_equipo` con `id_usuario: null` y motivo
  `Cierre OT #N (integración G3). Acción: X.` + motivo/observación del ítem.
- **Materiales:** quedan registrados en el payload (`materiales_pendientes_descuento: true`);
  la validación de saldo (CU-68) y el descuento del inventario personal (CU-58) se implementan
  con esos CUs — acuerdo Opción A con G3 (saldo insuficiente = ajuste, nunca rechazo del cierre).
- Sin `log_auditoria` en el procesamiento (no hay usuario actor); la trazabilidad vive en
  `integracion_cierre` (payload completo + discrepancias + acciones) y en el historial de estados.

## 4. Entidad / tabla

- `integracion_cierre` (`entities/cierre-integracion.entity.ts`): `id_cierre`,
  `clave_idempotencia` (UNIQUE), `id_ot`, `id_empresa`, `tipo_ot`, `payload` (JSONB, crudo),
  `estado_proceso` (`PROCESADO` | `PROCESADO_CON_DISCREPANCIAS`), `discrepancias` (JSONB),
  `acciones_aplicadas` (JSONB), `fecha_proceso`.
- Declarada en `scripts/migrar.ts` (`CREATE TABLE IF NOT EXISTS`) y `database/init.sql`.

## 5. Pendientes

- [x] Diagnóstico en `RETIRADO_PARA_DIAGNOSTICO`: acordado con G3 (08-sept) — `categoria_falla` del cierre.
- [ ] Descuento/validación de materiales (CU-58/CU-68).
- [ ] `GET /tecnicos/{id}/inventario-personal` (después de CU-58).
- [x] Al mergear: definir la key real en Railway y enviar a G3 la URL pública del backend
      (key **T1→G3**, distinta de la `fd2e2646...` que G3 nos dio para consumir sus endpoints).
