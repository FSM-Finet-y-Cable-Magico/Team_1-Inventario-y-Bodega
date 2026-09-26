# Guía global de integración por endpoints — los 4 grupos (Finet & Cable Mágico)

> **Objetivo:** instructivo único y trazable de **qué endpoint debe crear, modificar o habilitar
> cada grupo** para que los 4 sistemas funcionen en conjunto, sin duplicar trabajo y sin tocar
> tablas ajenas.
>
> **Fuentes:** JSON de casos de uso de los 4 grupos + código real verificado de G3
> (`fsm/backend`, módulos `clientes/` y `ordenes/`) y G8 (`backend/src`, 15 módulos) + documentos
> internos T1 `docs/10`, `docs/11`, `docs/12`.
>
> **Grupos:** **G1** = Inventario y Bodega (T1, nosotros) · **G2** = Portal Web ·
> **G3** = Terreno/FSM (OTs) · **G8** = CRM.
> **Nota de avance:** G3 trae `estado_implementacion` (17/56 ✅). Los JSON de G2 y G8 no traen
> estado; lo que consta como "ya existe" abajo fue **verificado en su código**, no en su JSON.
>
> **🆕 v2 (05-sept-2026):** incorpora la respuesta de G2 a esta guía (duplicados del portal,
> derivaciones por actor, SmartOLT). Decisiones del jefe de grupo resumidas en §8.0.
>
> **🆕 v3 (23-sept-2026):** incorpora el **acuerdo propuesto por G8 CRM** (borrador 12-sept-2026,
> pendiente de ratificación): G8 solo consulta inventario; T1 expone G1-7/8/9 y amplía G1-2.
> Detalle y respuesta T1: `docs/12` §7 · tickets **sc-158 (P0)** y **sc-159 (P1)**.
> _(24-sept-2026: **G8 aceptó** el acuerdo v1 y **G1 lo ratificó** — contra-preguntas resueltas; la tabla `asignacion_equipo_servicio` es de G1 (la escribe G1, G8 solo la alimenta por evento y la lee por API). Payload de activación con `rut_cliente` e `id_contrato` obligatorio.)_

---

## 1. Principios de integración (acuerdo de base para los 4)

1. **Nada de tablas directas.** Toda comunicación es API REST + JSON. El esquema compartido
   `mere_finet.sql` existe, pero cada grupo **solo escribe sus propias tablas**; lo que pertenece
   a otro dominio se consume por endpoint.
2. **Autenticación entre sistemas:** header `X-API-KEY` con una clave por grupo. Las llamadas
   servidor-a-servidor (webhooks) usan esta clave; los endpoints de uso humano mantienen su JWT.
3. **Formato de respuesta común:** `{ "success": true, "data": ..., "message": ... }` y errores
   con código HTTP correcto (400/403/404).
4. **Filtro por empresa siempre** (`id_empresa`: 1 = Finet, 2 = Cable Mágico) donde aplique.
5. **Webhooks idempotentes:** toda notificación incluye una clave natural (ej. `id_ot` +
   `fecha_completada`); el receptor ignora duplicados. Reintentos con backoff ante 5xx.
6. **Dueños de dominio (quién decide qué):**

| Dominio | Dueño | Todos los demás |
|---------|-------|-----------------|
| `cliente` — alta | **G3** (CU-27 ✅) | Solo lectura por endpoint |
| `cliente` — ciclo de vida / servicios / planes / edición | **G8** | Solo lectura · G2 edita contacto vía `PATCH /clientes/{id}` (G8-5) |
| Credenciales del portal cliente | **G3** (guarda `password_portal_hash`) — pendiente ratificar | G2 consume validación |
| OTs / trabajos / cierres en terreno | **G3** | Consumen eventos |
| Inventario: unidades, estados, stock, bodegas, transferencias, garantías de equipo, préstamos, bajas | **G1 (T1)** | Solo leen / solicitan transiciones |
| Máquina de estados de equipos | **G1 (T1)** — 6 literales exactos con tildes | Nadie actualiza `unidad_equipo` directo |
| Tickets | **G2** crea desde portal y chatbot (CU-71/77) · **G8** gestiona y crea comerciales · G3 recibe/gestiona desde terreno (G3-CU-30). G8-CU-41 y G3-CU-29 desisten como creación (v2) | — |
| Pagos: checkout pasarela (Webpay/Mercado Pago) | **G2** (CU-42/43) | G8 recibe la notificación del pago (G2-1 → G8-3) |
| Pagos: registro financiero, unicidad, recaudación externa, morosidad | **G8** (absorbe G2-CU-44/45/46/47/80 — v2) | G2 muestra en portal |
| SmartOLT — suspensión/reactivación por morosidad | **G8** — **único disparador** (cadena CU-13→CU-30→CU-31) (v2) | G2 consume el estado para el portal; G3 mantiene sus CUs de monitoreo (G3-CU-12..17) |
| Correlativos | Prefijos únicos por dueño: `OT-` (G3), `SRV-` `OI-` `PE-` (G1), ticket (G8), transacción (G2) | Nadie repite prefijos |

---

## 2. Mapa de dependencias (quién necesita a quién)

```
                    ┌────────────────────── SmartOLT (API externa) ─────────────────────┐
                    │        G3-CU-12..17/53 (monitoreo) · G2-CU-48/50 (corte)          │
                    ▼                                                                   │
  ┌──────────────┐  OTs, cierres,      ┌──────────────┐   cliente (lectura),   ┌──────────────┐
  │   G3 G1      │  materiales, NS,    │   G1 T1      │◄── credenciales ───────│    G2 Web    │
  │  Terreno     │────────────────────►│  Inventario  │    deuda, planes,      │   (Portal)   │
  └──────┬───────┘   eventos de OT     └──────┬───────█    tickets, WiFi    └──────┬───────┘
         │  evento "OT cerrada"               │  estado unidad,                    │
         ▼                                    │  transiciones, stock               │
  ┌──────────────┐                            ▼                                    │
  │    G8 CRM    │◄─────── consumo de TODO el dominio inventario ─────────────────────┤
  │  (clientes,  │  (si acepta no duplicar su módulo "Gestión de Inventario")          │
  │  cobranza)   │──── deuda/contratos/planes/tickets ────────────────────────────────►│
  └──────────────┘                                                                     │
         ▲                                                                             │
         └────────── webhook "pago confirmado" (G2 notifica a G8) ◄────────────────────┘
```

Resumen: **G3 es proveedor de eventos de terreno y del alta de cliente. G1 es proveedor de todo
el dominio inventario. G8 es proveedor comercial (planes, deuda, tickets, ciclo de vida).
G2 es el consumidor final (portal) y dueño de pagos.**

---

## 3. Acciones por grupo — G1 (T1) Inventario y Bodega

### 3.1 CREAR (endpoints nuevos de integración)

| # | Endpoint | Consumido por | Para qué CU | Datos |
|---|----------|---------------|-------------|-------|
| G1-1 | `POST /api/integraciones/ordenes/{id_ot}/cierre` | **G3** (al confirmar su cierre) | T1-CU-64 (acciones atómicas), CU-68 (saldo), CU-69 (reparación) | **✅ Implementado (sc-113)**: autenticación `X-API-KEY`, `clave_idempotencia`, discrepancias por ítem (un serial inválido no tumba el cierre). Payload en `docs/12 §1.3` + `equipos_instalados[]`/`equipos_retirados[]` con `accion` (mapeo acordado 04-sept) y `categoria_falla` (diagnóstico del retiro, acuerdo 08-sept). Pendiente: entregar URL/key/serial QA a G3 |
| G1-2 | `GET /api/integraciones/unidades/{numero_serie}` | **G3** y **G8** | G3-CU-22 (vincular NS), G3-CU-24 (estado ONT), G8-CU-18/20 (validar equipo/estado/empresa), G8-CU-22, G8-CU-59 | **✅ Implementado (sc-113)** versión base: `numero_serie, estado (literal oficial), id_empresa, tipo_equipo`. **Ampliación por acuerdo G8 (P0, sc-158) — ✅ implementada:** `id_unidad`, tipo detallado, `mac_address`, `id_bodega_actual`, `fecha_adquisicion`, `garantia{vencimiento,vigente}`, `asignacion_actual{cliente,servicio,contrato,ot}` externos |
| G1-3 | `POST /api/integraciones/unidades/{numero_serie}/transiciones` | **G3** y **G8** | G3-CU-24 (ONT → Dado de baja), G8-CU-22 (Bloqueado) | Cuerpo: `{estado_destino (literal oficial T1), id_ot/id_servicio_origen, motivo, id_usuario_solicitante}`. T1 valida la máquina de estados y ejecuta; respuesta con resultado o 400 con la transición inválida |
| G1-4 | `GET /api/integraciones/stock?id_tipo_equipo=&id_bodega=` (extensible con `&categoria=`) | **G3** (validar antes de declarar materiales), **G8** (factibilidad comercial, P1) | G3-CU-22, G8-CU-56 | `{id_tipo_equipo, nombre, unidad_medida, saldo, umbral_minimo, alerta_activa}` — informativo: **G8 no reserva ni descuenta stock** |
| G1-5 | `GET /api/integraciones/tecnicos/{id_usuario}/inventario-personal` | **G3**, **G8** | G3-CU-23 (resumen diario), G3-CU-04 (valida materiales del cierre), G8-CU-61 (consumo mensual) | `{tecnico, ns_asignados[], saldos_consumibles[] {id_tipo_equipo, saldo, unidad}}` |
| G1-6 | `GET /api/integraciones/unidades/{numero_serie}/garantia` *(baja prioridad)* | **G8** | G8-CU-85 (garantía de equipo) | `{vigente, fecha_adquisicion, fecha_vencimiento, estado}` — ya viaja dentro de G1-2 ampliado; el endpoint dedicado solo si G8 lo pide |
| G1-7 | `GET /api/integraciones/tipos-equipo?id_empresa=&categoria=&buscar=&activo=` | **G8** (Planes comerciales) | G8-CU de Planes | Catálogo S2S (wrapper del catálogo humano): `id_tipo_equipo, id_empresa, nombre, categoria, marca, modelo, descripcion_tecnica, unidad_medida, garantia_dias, requiere_serie_individual, activo` · **✅ Implementado (sc-158, acuerdo G8 P0)** |
| G1-8 | `POST /api/integraciones/activaciones` | **G8** (tras crear cliente/servicio) | G8-CU-07/59 | `{event_id, trace_id, id_empresa, id_ot, id_cliente, rut_cliente, id_servicio, id_contrato, equipos[{numero_serie}]}` → cabecera `event_id` UNIQUE + `UNIQUE(event_id, id_unidad)`, tolera ambos órdenes cierre/activación (`PENDIENTE_CIERRE`/`PENDIENTE_ACTIVACION`/`COMPLETO`/`CON_DISCREPANCIAS`) · **✅ Implementado (sc-158, acuerdo G8 v1 P0 ratificado)** |
| G1-9 | `GET /api/integraciones/equipos?id_empresa=&id_servicio=` | **G8** (perfil del servicio) | G8-CU-59 | Asignaciones activas `{id_unidad, numero_serie, estado, tipo_equipo, fecha_instalacion, id_ot}` desde `asignacion_equipo_servicio` · **acuerdo G8 P1 (sc-159)** |

> **Acuerdo G8 (borrador 12-sept-2026, pendiente de ratificación del jefe):** agrega además la
> tabla histórica **`asignacion_equipo_servicio`** (equipo ↔ servicio/cliente/contrato; IDs de G8
> como referencias externas **sin FK**, conservando `unidad_equipo.id_cliente_instalado` por
> compatibilidad). El estado físico de la unidad lo define **siempre** el cierre (máquina T1).
> Respuestas de T1 a las 10 preguntas de G8: `docs/12` §7.

### 3.2 MODIFICAR

| # | Qué | Por qué |
|---|-----|---------|
| G1-M1 | `AuthGuard`: aceptar además `X-API-KEY` de servicio en los endpoints `/api/integraciones/*` | Los webhooks son servidor-a-servidor (no hay JWT de usuario) |
| G1-M2 | Máquina de estados: ratificar mapeo de estados externos (`BAJA_DEFINITIVA`→`Dado de baja`, `Disponible`→`En bodega`) y **decidir** si `Bloqueado` (G8-CU-22) entra como 7º estado o se rechaza | Los otros grupos usan otros literales; sin mapeo no hay integración (`docs/12 §3`) |
| G1-M3 | Nada más: los endpoints internos (CU-28 valida NS, CU-33 ficha, CU-45 stock, CU-35/36 transiciones, CU-38 garantía) ya existen y los wrappers G1-* solo los reutilizan | — |

### 3.3 CONSUME de otros (lo que T1 necesita — detalle en `docs/12`)

`GET /ordenes` (G3) para CU-61/90 · `GET /ordenes/categorias-falla` (G3) para CU-70 ·
webhook de cierre emitido por G3 para CU-64/68/69 · `GET /clientes/rut/{rut}` y
`GET /clientes?busqueda=` (G3) para CU-48/71/73/87.
**Desistidos (los tomó G3):** CU-65/66/67 → `docs/11`.

---

## 4. Acciones por grupo — G3 (Terreno / FSM)

### 4.1 CREAR

| # | Endpoint / acción | Consumido por | Para qué CU | Datos |
|---|--------------------|---------------|-------------|-------|
| G3-1 | **Fan-out del cierre:** al confirmar `POST /ordenes/:id/cerrar`, notificar a (a) webhook T1 `POST {API_G1}/api/integraciones/ordenes/{id_ot}/cierre` y (b) `POST {API_G8}/integraciones/ot-cerrada` | G1 y G8 | T1-CU-64/68/69 · **G8-CU-07** (activa cliente tras instalación) | El payload de T1 (`docs/12 §1.3`); a G8: `{id_ot, rut_cliente, resultado, fecha_completada}` |
| G3-2 | `GET /ordenes/{id_ot}/cierre` *(alternativa al webhook si prefieren polling)* | G1 | T1-CU-64/68/69 | Mismo payload que G3-1 |
| G3-3 | `GET /tipos-trabajo` *(solo si su `categorias-falla` no cubre instalaciones)* | G1 | T1-CU-70 (catálogo T-01..T-10) | `{id, codigo, nombre, aplica_a: INSTALACION/REPARACION}` |
| G3-4 | `POST /portal/auth/validar-credenciales` | **G2** | G2-CU-01/03/10/11 (login y password del portal cliente) | Entrada `{rut, password}` → `{valido, id_cliente, id_empresa, debe_cambiar_password}`. G3 es dueño del hash (`password_portal_hash`) — **pendiente ratificar si el dueño es G3 o G8** |

### 4.2 MODIFICAR

| # | Qué | Por qué |
|---|-----|---------|
| G3-M1 | `cerrar-ot.dto`: agregar `equipos_instalados[]` y `equipos_retirados[]` (hoy solo hay `numero_serie` opcional dentro de materiales) | Sin esos arreglos T1 no puede mover unidades a `Instalado en cliente` (CU-64) ni registrar retiros (CU-69) |
| G3-M2 | `GET /ordenes` (listarOT): incluir `materiales[] {id_tipo_equipo, cantidad}` en la respuesta (hoy el include solo trae cliente/tecnico/dirección) | T1-CU-90 necesita materiales por OT sin consultar OT por OT (rango ≤ 90 días) |
| G3-M3 | **Dejar de actualizar `unidad_equipo`/historial directamente** (hoy G3-CU-24 marca `BAJA_DEFINITIVA` sobre tablas de inventario): reemplazar por `POST` de transición al endpoint G1-3 | T1 es dueño de la máquina de estados; `mere_finet.sql` compartido NO autoriza escribir tablas ajenas |
| G3-M4 | **Descuento de stock — decidir (recomendado: Opción A):** G3 deja de descontar stock y solo **declara** materiales en el cierre; T1 valida saldo (CU-68) y descuenta una sola vez (CU-58). Opción B: G3 descuenta y T1 solo recibe el registro | Su spec dice "Inventario descontado" (G3-CU-04/22) y T1 descontaría de nuevo → doble descuento (`docs/12 §4`) |

### 4.3 HABILITAR (ya existen — verificado en su código; solo conceder acceso)

| # | Endpoint | Consumido por | Para qué CU |
|---|----------|---------------|-------------|
| G3-H1 | `GET /ordenes` (filtros `id_tecnico`, `fecha_desde/hasta`, estado; trae cliente/tecnico/dirección anidados) | G1 | T1-CU-61 (trabajos del día), T1-CU-90 |
| G3-H2 | `GET /ordenes/categorias-falla` | G1 | T1-CU-70 |
| G3-H3 | `GET /clientes/rut/{rut}` (ya incluye `direcciones[]`) | G1, G2 | T1-CU-48/71/73/64 · G2-CU-01 (datos del cliente en portal) |
| G3-H4 | `GET /clientes?busqueda=` (parcial) | G1 | T1-CU-87 |

---

## 5. Acciones por grupo — G8 (CRM)

### 5.1 CREAR

| # | Endpoint | Consumido por | Para qué CU | Datos |
|---|----------|---------------|-------------|-------|
| G8-1 | `GET /deuda?rut= \| ?codigo_abonado=` (módulo cobranza — **aún no existe en su backend**) | **G2** | G2-CU-23..28, 39..41 (deuda/estado contrato en portal y chatbot G2-CU-64) | `{rut, codigo_abonado, contratos[] {plan, estado, fecha_vencimiento}, saldo_total, deuda_vencida, al_dia}` |
| G8-2 | `POST /integraciones/wifi-cambio` (su CU-40, no implementado) | **G2** | G2-CU-32 (cambio de clave WiFi solicitado desde portal; ejecuta G8) | `{rut, nueva_clave}` → valida complejidad y ejecuta en router/SmartOLT |
| G8-3 | `POST /webhooks/pagos-confirmados` (receptor) | **G2** | G2-CU-42/43 notifican el pago → G8-CU-31/78 (reactivar servicio, estado comercial) | `{rut, codigo_abonado, monto, medio (WEBPAY/MERCADO_PAGO), id_transaccion (único, ahora G8-CU-45), fecha}` |
| G8-4 | `GET /contratos?rut=` (lectura de servicios activos) | **G2** | G2-CU-23/25/26 (plan vigente, múltiples planes) | `{contratos[] {id, plan, estado, fecha_inicio}}` |
| G8-5 | `PATCH /clientes/{id}` — teléfono y correo desde el portal *(pedido G2)* | **G2** | G2-CU-08/09 (actualización de contacto) | `{telefono, email}` |
| G8-6 | `POST /leads` — botón "Contratar ahora" *(pedido G2)* | **G2** | G2-CU-18 (prospecto comercial) | datos del lead |
| G8-7 | `GET /pagos/{id}/comprobante` — PDF *(pedido G2)* | **G2** | G2-CU-52/53 (descarga y presentación del comprobante) | PDF binario |
| G8-8 | **Endpoints de lista** para polling diario *(acordado v2: G2 consulta en vez de webhooks CRM→G2)* | **G2** | G2-CU-67 (contratos que vencen en 3 días), CU-68 (morosos que cruzaron umbral hoy), CU-69 (pagos nuevos de recaudación externa) | `GET /contratos?vencen_en=N` · `GET /contratos?morosos_desde=<fecha>` · `GET /pagos?desde=<fecha>` |

### 5.2 MODIFICAR (redirigir su dominio inventario hacia G1)

| # | Qué | Por qué |
|---|-----|---------|
| G8-M1 | CU-18/20 (poste/router): reemplazar la precondición "figura en el inventario con estado **Disponible**" por consumo de `GET {API_G1}/api/integraciones/unidades/{ns}` (G1-2) y usar el literal oficial `En bodega` | Ese estado literal no existe en T1; la validez del equipo la da G1 |
| G8-M2 | CU-22 (bloqueo por uso malicioso): no cambiar estado lógico internamente; llamar `POST` de transición G1-3 | La máquina de estados es de G1; `Bloqueado` requiere decisión como 7º estado (`docs/12 §3`) |
| G8-M3 | CU-59 (vincular equipo↔cliente): consumir estado de G1 / registrar la vinculación vía transición `Instalado en cliente` | La vinculación real la hace T1-CU-64; no duplicar |
| G8-M4 | CU-55 (diagnóstico de equipo devuelto): reutilizar T1-CU-40 (ya implementado) en vez de re-implementar | Ya existe con auditoría e historial |

### 5.3 DESISTIR (propuesta formal al jefe de grupo — evitar duplicar dominios ajenos)

**(a) Módulo "Gestión de Inventario" (13 CUs)** duplica funcionalidad que **T1 ya tiene implementada
y andando**. Se propone cancelarlos y consumir G1 en su lugar:

> **23-sept-2026:** G8 envió un borrador de acuerdo en esta misma línea (solo consulta, no
> administra inventario; ver `docs/12` §7). **Ratificado por G1 el 24-sept-2026.**

| SU CU (G8) | Equivalente en T1 (ya implementado) |
|------------|-------------------------------------|
| CU-53 movimientos de equipo | T1 CU-86 (reporte movimientos) + `movimiento_inventario` propio |
| CU-54 estado lógico del equipo | T1 CU-35/36 (máquina de estados + historial) |
| CU-55 diagnóstico devuelto | T1 CU-40 |
| CU-56 / CU-57 stock + umbral | T1 CU-45/46 (+ alertas CU-94) |
| CU-58 transferencias entre empresas | T1 CU-20..23 (aprobación por SUPERUSUARIO) |
| CU-61 consumo mensual de materiales | T1 CU-91 (reporte consumo) sobre CU-58 |
| CU-62 filtrar inventario por empresa | T1 CU-16..19 (aislamiento por empresa) |
| CU-72 clasificación modalidad equipo | T1 CU-31 + catálogo |
| CU-85 garantía (equipo) | T1 CU-38/39 (G8 conserva la parte comercial/servicio si la hay) |
| CU-60 evidencia multimedia instalación | G3-CU-05 (fotos del cierre, ya implementado) |
| **CU-38** Autenticando cliente en portal web con RUT | **G2-CU-01** (portal login) — módulo "Portal del Cliente y TV IP" desiste (v2) |
| **CU-39** Visualizando plan contratado en el portal | **G2-CU-25** — ídem |
| **CU-40** Cambiando contraseña de Wi-Fi desde el portal | **G2-CU-32** (portal) + ejecución G8 vía G8-2 — ídem |
| **CU-41** Generando ticket de soporte desde el portal del cliente | **G2-CU-71** — ídem |

Si el jefe aprueba, los G8-M1..M4 ni siquiera hacen falta como modificaciones: G8 consume los
endpoints G1-2/3/4/5 para todo.

**(b) Módulo "Portal del Cliente y TV IP" (CU-38..42) — decisión v2:** G8 **desiste de CU-38/39/40/41**
(actor `Cliente`, mismas pantallas del portal que G2 ya construye: login, plan, WiFi, ticket).
G8 **conserva CU-42** (credenciales TV IP, actor `Módulo CRM`). Verificados contra su JSON.

### 5.4 HABILITAR (ya existen — verificado en su código; solo conceder acceso)

| # | Endpoint | Consumido por | Para qué CU |
|---|----------|---------------|-------------|
| G8-H1 | `POST /tickets` (módulo tickets, existe) | **G2** | G2-CU-71/77 (ticket desde portal y chatbot) |
| G8-H2 | `GET /plans` | **G2** | G2-CU-15/17 (catálogo de planes del sitio público) |
| G8-H3 | `GET /services` | **G2** | G2-CU-23..26 (servicios/plan del cliente) |
| G8-H4 | `GET /customers` + `GET /customers/search` | G2 (portal), G3 (si necesita) | Ficha y ciclo de vida del cliente |

---

## 6. Acciones por grupo — G2 (Portal Web)

### 6.1 CREAR

| # | Endpoint / acción | Consumido por | Para qué CU | Datos |
|---|--------------------|---------------|-------------|-------|
| G2-1 | **Llamada saliente** `POST {API_G8}/webhooks/pagos-confirmados` tras confirmar Webpay/Mercado Pago (checkout G2-CU-42/43) | G8 | G8-CU-31/78 (reactivación/estado comercial) | `{rut, codigo_abonado, monto, medio, id_transaccion, fecha}` |
| G2-2 | *(Opcional)* receptor `POST /webhooks/estado-servicio` para que G8 empuje avisos de corte/reconexión al portal | G8 | G2-CU-49/50/51 (avisos de suspensión en portal) | `{rut, estado (SUSPENDIDO/REACTIVADO), motivo, fecha}` |

> **v2 — Webhooks CRM→G2:** G2 aceptó **polling** en vez de webhooks entrantes. Los 3 eventos
> (vencimiento próximo, morosidad alcanzada, pago de recaudación externa) se resuelven con los
> endpoints de lista **G8-8** (`GET /contratos?vencen_en=`, `GET /contratos?morosos_desde=`,
> `GET /pagos?desde=`), una consulta diaria de G2. El único webhook saliente de G2 es G2-1.

### 6.2 MODIFICAR
- Nada estructural. Solo asegurar que el login del portal (CU-01) **no valide contraseñas
  contra una copia local**: delegar en `POST /portal/auth/validar-credenciales` de G3 (G3-4).

### 6.3 CONSUME (lista completa de sus dependencias)

| SU CU (G2) | De quién | Endpoint |
|------------|----------|----------|
| CU-01/03/04/10/11 login y password | G3 | G3-4 validar credenciales |
| CU-15/17 catálogo de planes | G8 | G8-H2 `GET /plans` |
| CU-23..28, 39..41 deuda y estado de contrato | G8 | G8-1 `GET /deuda`, G8-4 `GET /contratos` |
| CU-30/71/77/78 tickets | G8 | G8-H1 `POST /tickets` |
| CU-32 cambio de clave WiFi (solicitud portal) | G8 | G8-2 (ejecuta G8 con su CU-40) |
| CU-42/43 checkout pago | G8 | G2-1 notifica webhook |
| CU-48/50/51 suspensión/reactivación/bitácora | G8 | **disparador único G8** (CU-30/31 + SmartOLT); G2 consume estado (G8-8 listas o G2-2 receptor) |
| CU-63..69 chatbot | G8 | mismos endpoints de deuda/tickets + G8-5/6/7/8 |
| CU-59..61 factibilidad/mapa | (opcional) G3 | topología/planta externa si G3 la expone — hoy no está definido |

### 6.4 DERIVAR (decisión v2 — los CUs de G2 que pasan a otro grupo por criterio de actor)

**15 → G8** (actores `Sistema/Administrador`, dominio comercial/cobranza): CU-06 (IPs bloqueadas),
CU-44 (registro de pago), CU-45 (unicidad transacción), CU-46 (recaudación externa),
CU-47 (morosos diarios), CU-54 (vencimiento fijo), CU-55 (cartera vencida), CU-56 (seguimiento),
CU-57/58 (reporte financiero + descarga), CU-79 (auditoría chatbot), CU-80 (parámetros morosidad)
**+ la cadena completa de suspensión: CU-48/50/51** (G2 los tenía anotados tanto para CRM como
para Terreno; se resuelven al **dueño único del disparador SmartOLT**: G8 los absorbe con sus
CU-30/31 existentes; G3 mantiene por su cuenta G3-CU-36, el desbloqueo físico en terreno).

**3 → G3** (actores `Técnico/Sistema`, dominio terreno): CU-33 (cambio clave WiFi por técnico),
CU-36 (evaluación de red), CU-78 (cierre de ticket por técnico; G8-CU-26 conserva la gestión
comercial del ciclo de vida del ticket).

**4 compartidos (no derivados):** CU-49 (recargo: G8 aplica, G2 muestra desglosado) ·
CU-52 (comprobante: G8 genera vía G8-7, G2 expone) · CU-70 (bot deriva a operador: G3 atiende) ·
CU-77 (ticket al escalar: G2 genera evento, G3/G8 lo reciben).

Fuente: respuesta de G2 del 04-sept-2026 (verificada contra los JSON de los 4 grupos;
copia en `local/respuesta-g2-original.md`).

---

## 7. Matriz maestra de trazabilidad (todas las dependencias cruzadas)

| # | CU consumidor | Grupo | Necesita | Proveedor | Acción del proveedor | Estado |
|---|---------------|-------|----------|-----------|----------------------|--------|
| 1 | CU-61 | G1 | OTs del día con cliente/dirección | G3 | G3-H1 habilitar | ✅ existe |
| 2 | CU-70 | G1 | catálogo tipos de trabajo | G3 | G3-H2 habilitar / G3-3 si falta instalaciones | ✅ existe / ⚠ confirmar |
| 3 | CU-64/68/69 | G1 | datos del cierre de OT | G3 | G3-M1 extender DTO + G3-1 fan-out | ⚠ **por construir** |
| 4 | CU-90 | G1 | cierres 90 días con materiales | G3 | G3-M2 include materiales | ⚠ ajuste menor |
| 5 | CU-48/71/73/64 | G1 | cliente por RUT con direcciones | G3 | G3-H3 habilitar | ✅ existe |
| 6 | CU-87 | G1 | búsqueda de cliente | G3 | G3-H4 habilitar | ✅ existe |
| 7 | CU-65/66/67 | G1 | CRUD cliente | G3 | **desistido** → `docs/11` | ✅ tomado por G3 |
| 8 | G3-CU-22/04 | G3 | validar NS y stock / descuento único | G1 | G1-2, G1-4 + acuerdo §4 descuento | ⚠ acuerdo pendiente |
| 9 | G3-CU-24 | G3 | transición de estado de ONT | G1 | G1-3 transiciones | ⚠ crear + mapeo estados |
| 10 | G3-CU-23/26 | G3 | inventario personal / consumo | G1 | G1-5 | ⚠ crear (tras CU-58 T1) |
| 11 | G8-CU-18/20 | G8 | existencia/estado del equipo | G1 | G1-2 + G8-M1 | ⚠ crear + cambiar precondición |
| 12 | G8-CU-22 | G8 | bloquear equipo | G1 | G1-3 + decisión 7º estado | ⚠ crear + decisión |
| 13 | G8-CU-59 | G8 | vincular equipo↔cliente | G1 | G1-2/3 + G8-M3 | ⚠ coordinar con T1-CU-64 |
| 14 | G8-CU-53..63/72/85 | G8 | módulo inventario completo | G1 | **desistir** → consumir G1 | ⚠ decisión del jefe |
| 15 | G8-CU-07 | G8 | evento "OT cerrada" | G3 | G3-1 fan-out (rama b) | ⚠ por construir |
| 16 | G8-CU-75 | G8 | derivar ticket → OT | G3 | usar `POST /ordenes` de G3 | ✅ existe |
| 17 | G2-CU-01/03/04/10/11 | G2 | credenciales portal cliente | G3 | G3-4 | ⚠ por construir + ratificar dueño |
| 18 | G2-CU-15/17 | G2 | planes | G8 | G8-H2 | ✅ existe |
| 19 | G2-CU-23..28/39..41/64 | G2 | deuda/contratos/servicios | G8 | G8-1, G8-4 | ⚠ por construir (cobranza no implementada) |
| 20 | G2-CU-30/71/77/78 | G2 | tickets | G8 | G8-H1 | ✅ existe |
| 21 | G2-CU-32 (solicitud portal) · G2-CU-33 | G2 | cambio WiFi | G8 / G3 | CU-32: G8-2 (ejecuta G8, su CU-40) · CU-33 derivada a G3 (v2) | ⚠ por construir |
| 22 | G2-CU-42/43 | G2 | notificar pago | G8 | G8-3 receptor + G2-1 llamada | ⚠ por construir (ambos lados) |
| 23 | G8-CU-30/31 · G2 consume | G8 (disparador único) / G2 | suspensión/reactivación por morosidad | SmartOLT | **decidido v2: G8 dispara (cadena CU-13→30→31); G2 consume estado** | ✅ decisión tomada / ⚠ G8 por implementar |
| 24 | G2-CU-67/68/69 | G2 | listas para polling (vencimientos, morosos, pagos externos) | G8 | G8-8 endpoints de lista | ⚠ por construir |
| 25 | G2-CU-08/09 · CU-18 · CU-52/53 | G2 | editar contacto, leads, comprobante | G8 | G8-5/6/7 | ⚠ por construir |
| 26 | G2-CU-38..41 · G8-CU-38..41 | G2/G8 | pantallas del portal duplicadas | — | **decidido v2: G8 desiste de CU-38..41** (G2 es el portal; G8 conserva CU-42) | ✅ decisión tomada |
| 27 | G8 (Planes comerciales) | G8 | catálogo de tipos de equipo por empresa | G1 | G1-7 `GET /integraciones/tipos-equipo` | ⚠ crear (acuerdo G8 P0, sc-158) |
| 28 | G8-CU-07/59 | G8 | asociar equipo ↔ servicio/cliente/contrato | G1 | G1-8 `POST /integraciones/activaciones` + tabla `asignacion_equipo_servicio` | ⚠ crear (acuerdo G8 P0, sc-158) |
| 29 | G8 (perfil del servicio) | G8 | equipos instalados de un servicio | G1 | G1-9 `GET /integraciones/equipos?id_servicio=` | ⚠ crear (acuerdo G8 P1, sc-159) |
| 30 | G8 (venta/factibilidad) | G8 | disponibilidad de stock (informativa, sin reserva) | G1 | G1-4 extendido con `categoria` | ✅ existe / ⚠ extender |

---

## 8. Acuerdos globales pendientes (bloquean lo de arriba)

### 8.0 Decisiones tomadas (v2 — 05-sept-2026, del jefe de grupo con base en la respuesta de G2)

1. **Duplicados del portal:** G8 desiste de CU-38..41 (portal de clientes); G2 es el dueño del
   portal. G8 conserva CU-42 (TV IP, actor `Módulo CRM`).
2. **CU-71 (ticket desde portal):** dueño G2; G8-CU-41 y G3-CU-29 desisten como creación —
   G3 mantiene G3-CU-30 (recibir/gestionar desde terreno).
3. **WiFi:** G2-CU-32 es la solicitud del portal (queda en G2); la ejecución la hace G8 (G8-2,
   su CU-40). G2-CU-33 (actor Técnico) deriva a G3.
4. **SmartOLT:** **G8 es el disparador único** por morosidad (cadena CU-13→CU-30→CU-31).
   G2 consume el estado; G3 mantiene sus CUs de monitoreo (G3-CU-12..17). La fila "Pagos /
   pasarelas / SmartOLT → G2" de §1 se corrige: G2 es dueño solo del **checkout**.
5. **Derivaciones de G2:** 15 CUs → G8 (motor de pago, morosidad, reportes, auditoría chatbot +
   cadena CU-48/50/51), 3 → G3 (CU-33/36/78), 4 compartidos con el corte indicado en §6.4.
6. **Webhooks CRM→G2:** reemplazados por **polling con endpoints de lista** (G8-8); G2 consulta
   una vez al día. El único webhook saliente de G2 sigue siendo G2-1 (pago confirmado → G8).
7. G2 coordina **directo con G8 y G3** los endpoints que le faltan (G8-5/6/7/8), copiando al jefe.

Sigue pendiente de ratificar: **credenciales del portal cliente** (dueño G3 vs G8 — afecta G3-4).

### 8.1 Pendientes que no cambian

1. **Máquina de estados (dueño G1):** ratificar tabla de equivalencias de `docs/12 §3` y decidir
   si `Bloqueado` (G8-CU-22) es un 7º estado.
2. **Descuento único de stock:** Opción A (T1 descuenta, G3 solo declara) — **ya aceptada por G3**.
3. **Credenciales del portal cliente:** dueño G3 (guarda el hash) vs G8. Afecta fila 17.
4. **Módulo inventario de G8:** G8 envió borrador de acuerdo (12-sept-2026) donde acepta
   **no administrar inventario** y consumir G1 (`docs/12` §7) — **ratificado por el jefe de grupo
   (24-sept-2026)**. Afecta filas 11–14 y 27–30.
5. **Claves `X-API-KEY`:** generar una por grupo y compartirlas por canal seguro.
6. **Regla de oro de la BDD compartida:** `mere_finet.sql` contiene tablas de todos; cada grupo
   solo escribe las suyas. Todo lo demás, endpoint.
7. **Acuerdo G8 (P0/P1):** **acuerdo v1 aceptado por G8 y ratificado por G1 (24-sept-2026)**
   (contra-preguntas resueltas, `docs/12` §7.3; tabla `asignacion_equipo_servicio` de G1).
   **P0 (sc-158) ✅ implementado** en la rama `feat/javier-cus` (endpoints G1-7/G1-8 + ampliación
   G1-2 + tabla `asignacion_equipo_servicio`); **P1 (sc-159) pendiente**. Único pendiente
   operativo: API key de G8 (canal aparte).

---

## 9. Checklist ejecutivo (carga de trabajo por grupo)

| Grupo | Crear | Modificar | Habilitar (solo acceso) | Desistir / absorber |
|-------|-------|-----------|--------------------------|----------------------|
| **G1 T1** | 9 endpoints de integración (G1-1..9): **sc-113 ya implementó G1-1/G1-2 (base)**; por acuerdo G8: **G1-7/G1-8 + ampliación G1-2 ✅ implementados (sc-158 P0, rama `feat/javier-cus`)** · G1-9 + extensión G1-4 + garantía dedicada = **sc-159 P1 pendiente** | Auth API-KEY + mapeo estados + tabla `asignacion_equipo_servicio` (refs externas sin FK) ✅ | — | CU-65/66/67 (ya tomados por G3) |
| **G3 Terreno** | 4 (G3-1..4; G3-2 y G3-3 condicionales) | 4 (DTO cierre, materiales en listado, no tocar unidad_equipo, descuento — **descuento ya resuelto Opción A**) | 4 endpoints ya existentes | CU-29 como creación (v2) · **absorbe 3 CUs de G2 (CU-33/36/78)** |
| **G8 CRM** | 8 (deuda, WiFi, webhook pagos, contratos + G8-5/6/7/8 pedidos por G2) | 4 (redirigir inventario a G1) | 4 endpoints ya existentes | **desiste: 10 CUs inventario + 4 CUs portal (CU-38..41) · absorbe 15 CUs de G2** |
| **G2 Web** | 1 llamada saliente (G2-1) + 1 receptor opcional (G2-2) | login delegado a G3 | — | **deriva 18 CUs (15→G8, 3→G3)** |

> **Ruta crítica sugerida:** (1) acuerdos §8.1 y §8.2 → (2) G3-M1 + G3-1 y G1-1 (el cierre
> completo: G8-CU-07, T1-CU-64/68/69) → (3) G3-4 (portal login) → (4) G8-1 (deuda para portal) →
> (5) el resto, sin bloqueos entre sí.
