# CUs que NO nos corresponden — tomados por otros grupos

> **Propósito:** dejar constancia documental de los casos de uso de nuestro backlog (CU-47..96)
> que **no serán implementados por Inventario y Bodega (T1)** porque corresponden al pilar de
> otro grupo y **ya están implementados por ellos**. Nuestro alcance frente a esos flujos se
> limita a **consumir sus endpoints** (integración por API, no acceso directo a sus tablas).
>
> **Fecha:** 2026-09-01 · Verificado contra el código real de los repos de los otros grupos.

---

## 1. Los 4 CUs que se retiran de nuestra cola

| Nuestro CU | Nombre | Lo implementó | Evidencia en su backend |
|------------|--------|---------------|-------------------------|
| **CU-65** | Creando datos del cliente | **G3-CU-27** ✅ (pilar: clientes) | `POST /clientes` — `Team-3-FSM/fsm/backend/src/clientes/` |
| **CU-66** | Editando datos del cliente | **G3-CU-28** ✅ (pilar: clientes) | `PATCH /clientes/:id` — mismo módulo |
| **CU-67** | Consultando datos del cliente | **G3-CU-06 / CU-28** ✅ (pilar: clientes) | `GET /clientes` + `GET /clientes/rut/:rut` — mismo módulo |
| **CU-63** | Registrando cierre de trabajo de instalación | **G3-CU-04** ✅ (pilar: OTs/cierres) | `POST /ordenes/:id/cerrar` — `Team-3-FSM/fsm/backend/src/ordenes/` (materiales, fotos, potencia) |

> G8 (CRM) también tiene módulo de clientes (`customers/` en `Team_8---CRM`), pero el dueño
> **ya funcionando** es G3, que es quien los crea/consulta desde el terreno.

---

## 2. Por qué no son nuestros

- **Cliente (CU-65/66/67):** el CRUD de `cliente` pertenece a los grupos que gestionan clientes.
  Nosotros somos **inventario**: solo necesitamos *leer* cliente (RUT, nombre, dirección) para
  fichas, devoluciones y reportes. No registramos ni editamos clientes.
- **Cierre de instalación (CU-63):** el acto de cerrar el trabajo es del dominio de
  **Terreno (OTs)**. La parte de inventario de ese momento del negocio ya está cubierta por
  nuestro **CU-64** (acciones atómicas sobre `unidad_equipo`), que se dispara al momento del cierre.

---

## 3. Qué hacemos nosotros en esos flujos

| Flujo | Lo que consume T1 (endpoint del otro grupo) | Lo que sigue siendo nuestro |
|-------|---------------------------------------------|------------------------------|
| Alta/edición/consulta de cliente | `GET /clientes/rut/:rut` (validar RUT), `GET /clientes` (buscar) | Solo lectura para CU-48/71/73/87 y CU-64 |
| Cierre de instalación | `POST /ordenes/:id/cerrar` (lo ejecuta G3) | **CU-64**: transacción atómica — unidad → `Instalado en cliente`, generar SRV-YYYY-XXXXX, descontar inventario personal, auditar |

---

## 4. Impacto en el roadmap

- Los 4 CUs quedan fuera de la cola efectiva de Incremento 2 (no se marcan "Implementado"
  en `08-roadmap.md`, se registran aquí como **"Tomado por G3"**).
- Cola efectiva propia: **36 CUs internos + 10 cruzados = 46 CUs** (en lugar de 50).
- La meta de avance del Incremento 2 (~80%, 31 CUs internos en este incremento) considera
  estos 4 como cubiertos por el grupo dueño (G3).

---

## 5. Verificación 26-sept-2026 (Incremento 3 — sc-141/143/144/145)

Re-verificación contra `Team-3-FSM` **`origin/main`** (último commit revisado: `5ca1fbb`).
Tickets de solo documentación: **no se generó código en T1**.

| Nuestro CU | Endpoint de G3 (código verificado) | Evidencia / observaciones |
|------------|-------------------------------------|---------------------------|
| CU-63 | `POST /ordenes/:id/cerrar` (`fsm/backend/src/ordenes/ordenes.controller.ts`) | `CerrarOtDto` incluye `materiales[]`, `equipos_instalados[]`/`equipos_retirados[]` (`numero_serie` + `accion` + `diagnostico`), `potencia_optica_dbm`, `resultado_llamada`. El fan-out `WebhookFanOut` postea `PayloadCierre` a `CIERRE_WEBHOOK_G1_URL` (URL con `{id_ot}`), 3 reintentos backoff y **lee `data.srv` de nuestra respuesta**. ⚠️ El payload **no incluye `id_tecnico`**: nuestro CU-64 infiere el técnico desde `unidad_equipo.id_tecnico_asignado` (o registra `TECNICO_NO_IDENTIFICADO` en CU-68). |
| CU-65 | `POST /clientes` (`clientes.controller.ts` + `clientes.service.ts`) | Valida DV con `validarRut` (`RUT inválido...`) y RUT duplicado → `409 ConflictException`. Diferencias con nuestra spec: su `rut` es único **global** (no por empresa) y `nombre_completo` admite hasta 120 (nuestra spec 2–80). Sin impacto para T1 (solo lectura). |
| CU-66 | `PATCH /clientes/:id` (`editarFicha`) + `EditarClienteDto` | Existe y edita la ficha del cliente. |
| CU-67 | `GET /clientes`, `GET /clientes/rut/:rut` (humanos) y S2S `GET /integraciones/clientes/rut/:rut`, `GET /integraciones/clientes?busqueda=` | Devuelve `id_cliente, rut, nombre_completo, telefono, estado` + `direcciones[]` (S2S). Es la fuente que consume T1 (CU-48/64/71/73/87). |
| CU-61 (apoyo) | S2S `GET /integraciones/ordenes?id_empresa&estado&id_tecnico&desde&hasta&page&limit` | Incluye `cliente{rut, nombre_completo, telefono}` y `direccion{direccion_completa, comuna}` — exactamente lo que consume nuestro CU-61. |

**Conclusión:** los 4 CUs están cubiertos por G3 y nuestra parte de inventario queda en
CU-64/CU-68 (webhook del cierre) — verificado end-to-end con el mock del contrato y pruebas
manuales en `docs/05-backend/integraciones.md`.

### 5.1 Qué consumimos nosotros (confirmado)

- Cierre de instalación: G3 ejecuta `POST /ordenes/:id/cerrar` y notifica por webhook; T1 aplica
  las acciones atómicas de inventario (CU-64) y valida saldo (CU-68).
- Cliente: solo lectura por API (`GET /integraciones/clientes/rut/:rut`) para CU-48 (y los
  CUs cruzados de otros compañeros). No creamos ni editamos clientes.

---

## 6. Referencias

- `docs/10-trazabilidad-entre-equipos.md` — matriz cruzada completa de los 4 grupos (§4 conflictos).
- `docs/09-cus-integracion-otros-equipos.md` — clasificación original por dominio de datos.
- Repos de los otros grupos (organización `FSM-Finet-y-Cable-Magico` en GitHub):
  - G3 Terreno: `Team-3-FSM` (backend NestJS + Prisma, módulos `clientes/` y `ordenes/`)
  - G8 CRM: `Team_8---CRM` (backend NestJS, módulo `inventory/` duplica nuestro dominio — ver §2 de doc 10)
