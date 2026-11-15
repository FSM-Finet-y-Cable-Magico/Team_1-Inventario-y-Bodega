# Guía del entorno de demostración local

Sistema de Inventario y Bodega (Grupo 1). Entorno local para presentar y probar el sistema completo, incluidas las integraciones con G3 (Terreno/FSM) y G8 (CRM), que aquí se simulan.

## 1. Arquitectura de la demo

```
 Navegador ──► http://localhost:8090 ─► nginx ─┬─► frontend (SvelteKit)
                                               └─► backend (NestJS) ──► PostgreSQL (localhost:15433)
                                                      ▲        │
                         G3/G8 → G1 (webhooks y       │        │  G1 → G3 (OT del día, clientes,
                         consultas con X-API-KEY)     │        ▼  OT cerradas con materiales)
 Navegador ──► http://localhost:8091 ─► simulador de sistemas externos (G3 y G8)
                                        panel con botones + log de integración en vivo
```

- Todo corre en Docker con el prefijo `inventario-demo-`. No toca el entorno de desarrollo, la VPS ni la BD global.
- El simulador responde las consultas que nuestro backend hace a G3. Así funcionan:
  - «Mi jornada» (CU-61);
  - la ubicación del cliente en la ficha de la unidad (CU-48);
  - los reportes de equipos por cliente (CU-87) y de productividad (CU-90).
- Desde su panel se envían a nuestro backend los eventos que en producción mandan G3 y G8.
- Todas las API keys son de desarrollo local, definidas en `docker-compose.demo.yml`:
  - `g3-dev-key`: G3 → G1;
  - `g8-dev-key`: G8 → G1;
  - `g1-a-g3-dev-key`: G1 → G3.

## 2. Levantar, apagar y restaurar

Requisito: Docker Desktop abierto.

```bash
cd codigo/demo
./levantar-demo.sh     # la primera vez construye imágenes, completa los datos de demo y guarda el estado inicial
./reset-demo.sh        # vuelve la base y las OT del simulador al estado inicial (antes de cada ensayo)
./apagar-demo.sh       # detiene los contenedores (conserva los datos)
```

| Servicio | Dirección |
|---|---|
| Aplicación | http://localhost:8090 |
| Panel del simulador G3/G8 | http://localhost:8091 |
| API | http://localhost:8090/api (estado: `/api/health/ping`) |
| PostgreSQL | `localhost:15433`, base `inventario`, usuario y clave `inventario` |

Otros scripts:

- `guardar-estado-demo.sh`: guarda el estado actual como nuevo punto de partida.
- `preparar_datos_demo.py`: completa los datos de demo usando la API; lo llama `levantar-demo.sh` la primera vez.
- `simular-cierre-g3.sh`: lanza el cierre de instalación desde la terminal.
- `ver-estado-cu64.sh`: muestra en la base el efecto del cierre.

## 3. Usuarios

Las credenciales de los usuarios de demo no se publican en este repositorio;
están definidas en el seed (`codigo/backend-inventario/scripts/seed-qa.ts`) y se
comparten por el canal interno del equipo.

## 4. Datos del estado inicial

- **Empresas y bodegas:**
  - Finet: Bodega Finet Central y Bodega Puente Alto.
  - Cable Mágico: Bodega Cable Mágico Central y Bodega San Antonio.
- **Catálogo y unidades:**
  - 11 tipos de equipo, entre equipos con serie y consumibles.
  - 36 unidades en todos los estados: en bodega, asignadas, instaladas, en revisión, en préstamo y dadas de baja.
- **Órdenes de ingreso:** OI-0001 pendiente, OI-0002 parcial, OI-0003 y OI-0004 completas, y **OI-0005 pendiente**, la de la demo de CU-54.
- **Salidas y técnicos:**
  - `tecnico_qa` tiene la ONT `DEMO-ONT-0004`, el decodificador `DEMO-DEC-0001`, `DEMO-DEC-0002` y la ONT `QA-ONT-F-0002`.
  - También tiene en su inventario fibra (25 m), conectores (20) y cable UTP (60 m).
- **Préstamos:** activo, vencido, cerrado y reparación externa.
- **Bajas:** una solicitud pendiente, una aprobada y una rechazada.
- **Donaciones:** una registrada.
- **Equipos en revisión:** 3.
- **Transferencias:** una histórica y una pendiente de aprobación (router DEMO-RTR-0003, de Finet a Cable Mágico).
- **Toma de inventario #1:** confirmada con diferencias en Bodega Cable Mágico Central, con acta PDF.
- **Notificaciones y alertas:** stock bajo umbral (conectores en Finet) y un préstamo vencido. Se generan al abrir la campana o el dashboard.
- **Simulador:**
  - OT 7001 (instalación), 7002 (reparación) y 7003 (retiro por morosidad) de `tecnico_qa`.
  - OT 7101 (instalación) de `tecnico_cable`.
  - OT 101 a 103, cerradas.
  - 5 clientes ficticios.

## 5. Guion principal

### 5.1 CU-54 · Registrando recepción total o parcial de una orden de ingreso

Usuario: `admin_finet`.

1. **Órdenes de ingreso** → **OI-0005** (Distribuidora Andina SpA, FAC20261115). La orden está «Pendiente de recepción», con 5 ONT QA Finet y 2 Router Wi-Fi QA, los dos tipos con serie obligatoria.
2. **Registrar recepción** → 3 ONT: `ONT-FN-2026-0001`, `ONT-FN-2026-0002`, `ONT-FN-2026-0003`. La orden pasa a **«Recepción parcial»**.
3. Excepciones:
   - Repetir `ONT-FN-2026-0001` → «El número de serie [ONT-FN-2026-0001] ya se encuentra registrado en el sistema.»
   - Cantidad 2 con una sola serie → «Debe ingresar 2 número(s) de serie para el ítem "ONT QA Finet". Ingresados: 1.»
4. Registrar el resto. La orden pasa a **«Completada»**:
   - ONT: `ONT-FN-2026-0004`, `ONT-FN-2026-0005`;
   - routers: `RTR-FN-2026-0001`, `RTR-FN-2026-0002`.
5. Mostrar el resultado:
   - **Unidades**, buscar `ONT-FN-2026`: 5 unidades «En bodega» con garantía hasta 14-11-2027.
   - **Auditoría**: evento RECEPCION.

**Explicación técnica:**

- **Vista:** `routes/ordenes-ingreso/[id]` → `POST /api/ordenes-ingreso/:id/recepcion`.
  - Roles permitidos: ADMIN, ADMIN_BODEGA o SUPERUSUARIO.
  - Valida el DTO `RegistrarRecepcionDto`.
- **Servicio:** `OrdenesIngresoService.registrarRecepcion`, en una sola transacción:
  - valida cantidades y series;
  - crea las `unidad_equipo` con su garantía;
  - suma la recepción en `orden_ingreso_detalle`;
  - recalcula el estado de la orden y audita.

### 5.2 CU-57 · Registrando salida de equipos de bodega a técnico

Usuario: `admin_finet`. Se hace después de CU-54 y entrega al técnico los mismos equipos recién recibidos, con lo que se ve el ciclo entrada → salida.

1. **Salidas** → «Técnico destinatario»: Técnico Terreno QA; «Bodega de origen»: Bodega Finet Central.
2. En «Equipo disponible» elegir `ONT-FN-2026-0001` y `RTR-FN-2026-0001`. Cada uno queda marcado «Disponible».
3. Consumibles: Fibra drop QA, cantidad 30 → «Agregar».
4. **Confirmar salida**: la salida queda registrada con 2 equipos y 1 consumible.
5. Mostrar el resultado:
   - la tarjeta «Inventario personal del técnico», al costado;
   - **Unidades** → `ONT-FN-2026-0001`: «Asignado a técnico», con historial «Salida de bodega a técnico»;
   - con `tecnico_qa`, **Mi jornada**.
6. Excepciones que se ven en pantalla:
   - **Stock insuficiente:** Conector SC/APC QA, cantidad 10 (hay 5) → «Confirmar salida» muestra «Stock insuficiente de [Conector SC/APC QA] en [Bodega Finet Central]. Disponible: 5 Unidad.»
   - **Serie no encontrada:** escribir `ONT-FN-2026-9999` en «Buscar por serie». La lista indica «Número de serie no encontrado».
   - «Equipo no disponible» lo valida la API (`El equipo [...] no está disponible en esta bodega`), pero la pantalla no lo permite porque solo ofrece equipos disponibles.

**Explicación técnica:**

- **Vista:** `routes/salidas` → `POST /api/salidas`.
  - Roles permitidos: ADMIN, ADMIN_BODEGA o SUPERUSUARIO.
  - Valida el DTO `CrearSalidaDto`.
- **Servicio:** `SalidasService.registrarSalida`, en una sola transacción:
  - valida el técnico, la bodega y cada serie;
  - pasa las unidades a «Asignado a técnico», con su historial;
  - descuenta `stock_consumible` con bloqueo de fila;
  - suma el `inventario_personal_tecnico`;
  - registra `salida_bodega`, `salida_detalle` y `movimiento_inventario`, y audita.

## 6. Panel del simulador: todos los eventos

| Botón | Qué demuestra | Dónde verlo en la app |
|---|---|---|
| Cierre de instalación OT 7001 | CU-64 y CU-68 | Mi jornada, Unidades, Reportes → Equipos por cliente |
| Reenvío del mismo cierre | Idempotencia del webhook | Respuesta `duplicado: true` |
| Cierre de reparación OT 7002 | CU-69 y CU-71: retira `QA-ONT-F-0003` a revisión e instala `QA-ONT-F-0002` | Unidades → En revisión; ficha de las dos unidades |
| Cierre Cable Mágico OT 7101 | Aislamiento por empresa (`tecnico_cable`) | Con `admin_cable`: Unidades, Mi jornada de `tecnico_cable` |
| Cierre con serie inexistente | Contrato «2xx con discrepancias»: serie desconocida y consumo mayor al saldo | Respuesta `PROCESADO_CON_DISCREPANCIAS` |
| Baja por morosidad | G3 retira `HW-ONT-99001` (OT 7003, solicitud G8 MOR-2026-0001) y G8 consulta la recepción | Respuesta `estado_recepcion: COMPLETA`; unidad «En revisión» |
| Activación G8 / Equipos del servicio | Correlación OT ↔ servicio de G8 | Respuesta de `/integraciones/equipos` |
| Stock / Catálogo / Unidad por serie | Consultas de G3 y G8 a nuestro inventario | Respuestas JSON |

El log de integración muestra cada petición en las dos direcciones: G3/G8 → G1 y G1 → G3. El botón «Cierre con serie inexistente» deja consumos declarados en el reporte de productividad; conviene usar `reset-demo.sh` después.

### 6.1 Opcional · CU-64, cierre de instalación informado por G3

El cierre lo ejecuta G3. Este sistema solo recibe sus efectos, así que no es parte del guion principal. Para mostrar la integración:

1. **Antes:** `tecnico_qa` → **Mi jornada**.
   - Muestra las OT del día que entrega G3: OT 7001 de Ana Torres Fuentes en Puente Alto, 7002 y 7003.
   - También el inventario personal: `DEMO-ONT-0004`, `DEMO-DEC-0001`, fibra 25 m y conectores 20.
   - En el log del panel aparece la consulta `G1 → G3 GET /ordenes?...`.
2. **Cierre en G3:** en el panel, «Cierre de instalación OT 7001». Se ven la petición (JSON) y la respuesta:
   - `PROCESADO`;
   - servicio `SRV-2026-00001`;
   - las 2 unidades: «Asignado a técnico» → «Instalado en cliente»;
   - materiales descontados: fibra 25 → 10 y conectores 20 → 18.
3. **Después:**
   - **Mi jornada** del técnico: la OT 7001 ya no está, los equipos ya no figuran y bajan los saldos.
   - **Unidades** → `DEMO-ONT-0004`: «Instalado en cliente», cliente, dirección, servicio e historial con «Cierre OT #7001 (integración G3)».
4. **Idempotencia:** el botón «Reenvío del mismo cierre» responde `duplicado: true` y no repite nada.
5. **Activación G8 (opcional):** «Activación del servicio de la OT 7001» y luego «Equipos asociados al servicio 50001». Muestra la correlación cierre ↔ activación.

Si se prefiere la terminal, `./simular-cierre-g3.sh` envía el mismo cierre y `./ver-estado-cu64.sh` muestra el efecto en la base.

**Explicación técnica:**

- **Entrada:** G3 → `POST /api/integraciones/ordenes/:idOt/cierre`, con `X-API-KEY`. `ApiKeyGuard` valida la key y las empresas.
- **Servicio:** `IntegracionesService.recibirCierreOt`, en una sola transacción:
  - reclama la `clave_idempotencia` en `integracion_cierre`;
  - genera el SRV en `secuencia_srv`;
  - resuelve el técnico;
  - instala cada serie, con su historial y los datos del cliente;
  - descuenta `inventario_personal_tecnico`;
  - guarda acciones y discrepancias.
  - Si algo falla, se revierte todo.

## 7. Revisión del resto de los CU

| Módulo (menú) | CU | Qué probar | Usuario |
|---|---|---|---|
| Login / sesión | 01–03, 10–12 | Login, error genérico, bloqueo por intentos, cierre de sesión | cualquiera |
| Usuarios | 04–07 | Crear, listar, editar y desactivar | superusuario |
| Auditoría | 08–09 | Log con filtros por empresa, acción y entidad | superusuario |
| Dashboard | 13–16, 94 | Consolidado por empresa y alertas activas | superusuario |
| Transferencias | 20–23 | Solicitar, aprobar y rechazar (ver §8) | admin_finet / superusuario |
| Catálogo | 24–31 | Crear, editar y desactivar tipos; ficha técnica PDF | admin_finet |
| Unidades | 32–40, 47–48, 95 | Registrar, ficha, cambio de estado, historial, garantía, ubicación externa | admin_finet |
| Bodegas | 41–46 | Crear y editar bodegas, stock, umbral mínimo | admin_finet |
| Proveedores | 49–51, 98 | CRUD; desactivar y reactivar (con órdenes pendientes da error) | admin_finet |
| Órdenes de ingreso | 52–56 | Crear y recibir (§5.1) | admin_finet |
| Salidas | 57–60, 62 | Salida de equipos y consumibles a técnico | admin_finet |
| Mi jornada | 58, 61, 70 | OT del día (simulador), inventario personal, borrador de cierre | tecnico_qa |
| Devoluciones / En revisión | 71–77 | Revisión, reacondicionar, reparación externa | admin_finet |
| Bajas | 78–80 | Aprobar o rechazar la solicitud pendiente; donación | superusuario |
| Préstamos | 81–84 | Préstamo vencido, registrar retorno | admin_finet |
| Reportes | 85–93 | Stock, movimientos, garantías, técnicos, consumo, equipos por cliente (G3), productividad (G3); Excel y PDF | admin_finet |
| Notificaciones | 96 | Campana: stock bajo umbral y préstamo vencido | admin_finet |
| Toma de inventario | 97, 99 | Ver la toma #1 y su acta PDF; abrir una nueva en Bodega Puente Alto | admin_finet / admin_cable |

CU-63, CU-65, CU-66 y CU-67 los implementa G3; en la demo se ven a través del panel del simulador.

## 8. Problemas conocidos

- **Listado de transferencias (CU-23):** corregido en la PR #113. La transferencia pendiente se ve «Pendiente, 1 unidad» y se puede aprobar como `superusuario`.
- **Mi jornada en la VPS:** si G3 no responde, muestra el aviso «G3 no responde o no está configurado». En la demo no ocurre porque responde el simulador.

## 9. Si algo falla

- **Error 502 en la app:** `./reset-demo.sh` (recarga nginx), o `docker exec inventario-demo-nginx nginx -s reload`.
- **Logs:**
  ```bash
  docker compose -p inventario-demo -f ../docker-compose.yml -f docker-compose.demo.yml logs backend simulador
  ```
- **Empezar de cero:**
  ```bash
  docker compose -p inventario-demo down -v
  rm estado-inicial-demo.dump
  ./levantar-demo.sh
  ```
- **«error getting credentials» al construir:** abre Docker Desktop, inicia sesión y vuelve a intentar.
