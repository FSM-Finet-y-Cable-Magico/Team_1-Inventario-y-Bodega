# Módulo `integraciones` — API server-to-server (G3 Terreno/FSM · G8 CRM)

> **Origen:** tickets Shortcut **sc-113** (integración con G3) y **sc-158/sc-159** (acuerdo con
> G8 CRM v1, ratificado el 24-sept-2026); no son CUs del backlog.
> Solicitudes/respuestas: `docs/12-solicitud-endpoints-otros-grupos.md` (§7 = G8), `docs/13`
> §3.1/§5. No hay JWT: la autenticación es **X-API-KEY**.

## 1. Endpoints

| Método | Ruta | Auth | Para qué |
|--------|------|------|----------|
| GET | `/api/integraciones/unidades/:numeroSerie?id_empresa=N` | `X-API-KEY` | G3 valida la serie **antes** de que el técnico cierre la OT; G8 la usa para validar equipo/estado/empresa (sc-158 amplió la respuesta) |
| POST | `/api/integraciones/ordenes/:idOt/cierre` | `X-API-KEY` | Webhook receptor del cierre de OT de G3 (push). Base del procesamiento del CU-64 |
| GET | `/api/integraciones/tipos-equipo?id_empresa=N&categoria=&buscar=&activo=` | `X-API-KEY` | Catálogo S2S para los planes comerciales de G8 (G1-7 · sc-158) |
| POST | `/api/integraciones/activaciones` | `X-API-KEY` | Evento de activación de G8: asocia cliente/servicio/contrato externos a las unidades instaladas (G1-8 · sc-158) |
| GET | `/api/integraciones/equipos?id_empresa=N&id_servicio=S` | `X-API-KEY` | Equipos activos de un servicio para el perfil del servicio en el CRM (G1-9 · sc-159) |
| GET | `/api/integraciones/stock?id_empresa=N&id_tipo_equipo=T` \| `&categoria=C` | `X-API-KEY` | Disponibilidad **informativa** (G1-4 extendido · sc-159). G8 no reserva ni descuenta |

Contrato de errores: `400` falta `id_empresa`/no numérico, payload malformado,
`clave_idempotencia`/`event_id`/`id_contrato`/`id_servicio` ausentes, `id_ot` de ruta ≠ payload,
acción no reconocida · `401` falta header o key inválida · `403` key válida sin scope sobre esa
empresa · `404` serie no encontrada en la empresa pedida · `409` mismo `event_id` reutilizado con
otros datos de activación. Respuestas envueltas `{ success, data }`.

## 2. Autenticación (`guards/api-key.guard.ts`)

- Header `X-API-KEY`. Keys por entorno en la variable **`INTEGRACION_API_KEYS`** (JSON):
  `[{"key":"...","grupo":"G3","empresas":[1,2]}]`.
- Si la variable no está definida o es JSON inválido, ninguna key autentica (sin defaults ocultos).
- La key resuelve `req.integracion = { grupo, empresas }`; el scope de `id_empresa` se valida
  en el service (`validarScope` → 403 fuera de scope).
- En `docker-compose.yml` hay un valor **solo de desarrollo** (`g3-dev-key`); la real se define
  como variable de entorno en Railway. Las keys nunca van commiteadas.

## 3. Lógica (`integraciones.service.ts`)

### 3.1 `consultarUnidadPorSerie` (GET)
- Busca por `numero_serie` + `id_empresa` (aislamiento por empresa; 404 genérico
  `'Número de serie no encontrado.'`). Devuelve serie, estado (literal exacto), empresa, tipo,
  `id_unidad`, `id_tipo_equipo`, `tipo_equipo {nombre, categoria, marca, modelo}`, `mac_address`,
  `id_bodega_actual`, `fecha_adquisicion`, `garantia {fecha_vencimiento, vigente}` y
  `asignacion_actual {id_cliente_externo, id_servicio_externo, id_contrato_externo, id_ot}`
  (sc-158; `null` sin asignación activa).
- `garantia.vigente` = hoy ≤ `fecha_venc_garantia` (misma fuente que CU-38/39).

### 3.2 `consultarTiposEquipo` (GET · sc-158)
- Wrapper S2S de `CatalogService.consultar` (no duplica lógica): filtros `categoria`, `buscar`,
  `activo` (`'true'`/`'false'`, otro valor → 400) e `id_empresa` validado contra el scope.
- Devuelve por ítem `id_tipo_equipo, id_empresa, nombre, categoria, marca, modelo,
  descripcion_tecnica, unidad_medida, garantia_dias, requiere_serie_individual, activo`.

### 3.3 `recibirCierreOt` (webhook G3)
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
- **Correlación G8 (sc-158):** al terminar el cierre se completa por `id_ot` + `id_empresa` la
  activación de G8 que estuviera `PENDIENTE_CIERRE` (crea las asignaciones activas), o se deja un
  registro `PENDIENTE_ACTIVACION` si el cierre declaró `equipos_instalados` y aún no hay activación.
- **CU-64 (acciones atómicas · sc-142), dentro de la misma transacción:**
  - **(B) cliente/dirección:** al instalar una unidad se persisten `cliente_rut`, `cliente_nombre`,
    `direccion_instalacion`, `comuna_instalacion` y el `srv` en `unidad_equipo` (base de CU-48/71/73/87;
    G3 identifica por RUT).
  - **(C) materiales:** `materiales[]` se descuenta del inventario personal del técnico
    (`InventarioPersonalService.descontarHasta`, bloqueo de fila). Técnico = `payload.id_tecnico`
    o, si no viene, el `id_tecnico_asignado` de las unidades del cierre.
  - **(D) SRV:** para `tipo_ot = INSTALACION` se genera `SRV-YYYY-XXXXX` con secuencia atómica por
    empresa/año (`secuencia_srv`); un re-cierre de la misma OT conserva el SRV original. Viaja en
    `data.srv` de la respuesta 2xx.
  - **(E) trazabilidad:** `integracion_cierre` guarda `srv`, `id_tecnico`, `materiales_aplicados`
    (`{descontados, ajustes}`), `acciones_aplicadas` y `discrepancias`.
  - **E1 (fallo):** rollback total del `QueryRunner` y error específico (5xx → G3 reintenta);
    los problemas por ítem siguen siendo discrepancias con 2xx.
- **CU-68 (saldo de consumibles · sc-146):**
  - `InventarioPersonalService.validarSaldo(...)` (pre-check, mensaje exacto de E1) bloquea el flujo
    humano de confirmación; `detectarInsuficientes(...)` reporta todos los consumibles faltantes.
  - En el **webhook** el saldo insuficiente **nunca rechaza**: se descuenta lo disponible, el
    faltante queda en `materiales.ajustes` y como discrepancia `SALDO_INSUFICIENTE_AJUSTADO`
    (acuerdo Opción A con G3). `cantidad <= 0` es payload inválido (400).
- **Respuesta 2xx del cierre (sc-142):** `data = {duplicado, id_ot, clave_idempotencia,
  estado_proceso, srv, id_tecnico, acciones_aplicadas, discrepancias, materiales{descontados,ajustes}}`
  (el antiguo flag `materiales_pendientes_descuento` fue retirado).
- Sin `log_auditoria` en el procesamiento (no hay usuario actor); la trazabilidad vive en
  `integracion_cierre`/`integracion_activacion` (payload + discrepancias + acciones) y en el
  historial de estados.

### 3.4 `registrarActivacion` (POST G8 · sc-158)
- Payload v1: `{event_id, trace_id, id_empresa, id_ot, id_cliente, rut_cliente, id_servicio,
  id_contrato, equipos[{numero_serie}]}`. `id_contrato` (acuerdo v1) e `id_servicio` obligatorios.
- **Idempotencia multi-equipo:** `event_id` UNIQUE en la cabecera `integracion_activacion` y
  `UNIQUE(event_id, id_unidad)` en las filas. Mismo `event_id` con los mismos datos → 2xx con
  `duplicado: true` y una sola asignación; con otros datos → 409.
- **Ambos órdenes cierre/activación** (correlación por `id_ot` + `id_empresa`):
  - activación sin cierre → `PENDIENTE_CIERRE` (no se inventa estado físico);
  - cierre sin activación (con `equipos_instalados`) → registro `PENDIENTE_ACTIVACION`;
  - ambos eventos → se crean las asignaciones activas (unidad existente; el estado físico
    lo define SIEMPRE el cierre) y queda `COMPLETO`; problemas por ítem → `CON_DISCREPANCIAS`
    (`SERIE_NO_EXISTE`, `SERIE_DUPLICADA_EN_EVENTO`, `SERIE_INVALIDA`), nunca 4xx.
- **Reemplazos:** las asignaciones activas previas del mismo `id_servicio` pasan a
  `activa=false` + `fecha_retiro`; una unidad mantiene una sola asignación activa a la vez.
- `fecha_instalacion` = `fecha_completada` del cierre (fallback: ahora). La asignación activa
  también se refleja en `unidad_equipo.id_cliente_instalado` cuando G8 informa `id_cliente`.
- Respuesta: `{success, data: {event_id, id_servicio, equipos_asociados, duplicado}}`.

### 3.5 `consultarEquiposPorServicio` (GET G8 · sc-159)
- Desde `asignacion_equipo_servicio` con `activa=true` para `(id_empresa, id_servicio_externo)`;
  `id_servicio` numérico obligatorio (400 si falta).
- Por ítem: `{id_unidad, numero_serie, estado, tipo_equipo {id_tipo_equipo, nombre, categoria},
  fecha_instalacion, id_ot}`. Servicio sin equipos → 200 con `[]` (no 404).

### 3.6 `consultarStock` (GET G8 · sc-159)
- Filtros `id_tipo_equipo` o `categoria` (ambos opcionales; sin filtro devuelve los tipos activos
  de la empresa). `id_tipo_equipo` inexistente en la empresa → 404; no numérico → 400.
- **Individualizables:** `disponible` = unidades `En bodega`; `reservado` = unidades
  `Asignado a técnico`; `total` = suma.
- **Consumibles:** `disponible` = Σ `stock_consumible.cantidad_disponible` (todas las bodegas);
  `reservado` = 0 (el modelo no reserva y G8 tampoco reserva ni descuenta).
- Respuesta **informativa** por tipo: `{id_tipo_equipo, id_empresa, nombre, categoria,
  unidad_medida, requiere_serie_individual, disponible, reservado, total}`.
- Garantía (G8-G / G1-6): ya viaja dentro de la consulta de unidad ampliada (sc-158); el endpoint
  dedicado `GET /unidades/:serie/garantia` queda **solo si G8 lo pide expresamente** (prioridad baja).

## 4. Entidades / tablas

- `integracion_cierre` (`entities/cierre-integracion.entity.ts`): `id_cierre`,
  `clave_idempotencia` (UNIQUE), `id_ot`, `id_empresa`, `tipo_ot`, `payload` (JSONB, crudo),
  `estado_proceso` (`PROCESADO` | `PROCESADO_CON_DISCREPANCIAS`), `discrepancias` (JSONB),
  `acciones_aplicadas` (JSONB), `fecha_proceso`.
- `integracion_activacion` (sc-158): cabecera del evento de G8 — `event_id` (UNIQUE, nulo en el
  registro `PENDIENTE_ACTIVACION` de un cierre sin activación), `trace_id`, `id_empresa`, `id_ot`,
  `id_cliente_externo`, `rut_cliente`, `id_servicio_externo`, `id_contrato_externo`, `payload`
  (JSONB), `estado_proceso` (`PENDIENTE_CIERRE` | `PENDIENTE_ACTIVACION` | `COMPLETO` |
  `CON_DISCREPANCIAS`), `equipos_asociados` (JSONB), `discrepancias` (JSONB), `fecha_proceso`.
- `asignacion_equipo_servicio` (sc-158): tabla histórica de G1 — `id_asignacion`, `id_unidad`
  (FK interna a `unidad_equipo`), `id_empresa`, `event_id`, `id_cliente_externo`, `rut_cliente`,
  `id_servicio_externo`, `id_contrato_externo`, `id_ot`, `fecha_instalacion`, `fecha_retiro`,
  `activa`, `origen` (`ACTIVACION_G8`), `trace_id`. Los IDs de G8 son referencias externas
  **sin FK**. Índices: `UNIQUE(event_id, id_unidad)` + `(id_empresa, id_servicio_externo, activa)`.
- `secuencia_srv` (CU-64): contador por `(id_empresa, anio)` del identificador `SRV-YYYY-XXXXX`.
- `unidad_equipo` (CU-64): columnas `cliente_rut`, `cliente_nombre`, `direccion_instalacion`,
  `comuna_instalacion`, `srv` con la ubicación vigente cuando la unidad está instalada.
- Las tablas anteriores se declaran en `scripts/migrar.ts` (`CREATE TABLE IF NOT EXISTS` /
  `ADD COLUMN IF NOT EXISTS`) y `database/init.sql`.
- Auditoría de integración: la trazabilidad vive en las tablas de eventos (patrón
  `integracion_cierre`), no en `log_auditoria` (no hay usuario JWT en el flujo S2S).

## 5. Pendientes

- [x] Diagnóstico en `RETIRADO_PARA_DIAGNOSTICO`: acordado con G3 (08-sept) — `categoria_falla` del cierre.
- [x] Descuento/validación de materiales (CU-64/CU-68 · sc-142/sc-146).
- [ ] Coordinar con G3 que el payload incluya `id_tecnico` (hoy se infiere de las unidades; sin
      unidades ni `id_tecnico`, los materiales quedan como discrepancia `TECNICO_NO_IDENTIFICADO`).
- [ ] `GET /tecnicos/{id}/inventario-personal` (después de CU-58).
- [x] Al mergear: definir la key real en Railway y enviar a G3 la URL pública del backend.
      (La key **T1→G3** es el mismo valor `fd2e2646...` que G3 nos dio para consumir sus
      endpoints — así se acordó con ellos; si se rota, avisar a ambos lados el mismo día).
- [ ] **G8 (sc-158):** key real de G8 por canal aparte y envío de URL pública al cerrar el lote.
- [x] **G8 (sc-159, P1):** `GET /integraciones/equipos?id_servicio=` y `GET /integraciones/stock`
      (informativo) implementados; garantía dedicada descartada por ahora (ya viaja en la unidad).
