# Solicitud de endpoints para integración — Inventario y Bodega (T1) → G3 Terreno / G8 CRM

> **Quién pide:** Equipo 1 — Sistema de Inventario y Bodega.
> **Para qué:** implementar los 10 CUs de inventario que consumen datos de otros dominios
> (CU-48, 61, 64, 68, 69, 70, 71, 73, 87, 90).
> **Acuerdo de base:** los 4 sistemas NO comparten tablas. Toda integración es por API REST
> (JSON). No consultaremos directamente su base de datos; pedimos endpoints.

---

## 0. Formato general propuesto

- Respuestas JSON con el formato que ya usamos entre nosotros:
  `{ "success": true, "data": ..., "message": ... }` y errores con código HTTP correcto (400/403/404).
- Autenticación entre sistemas: proponemos un header `X-API-KEY` con una clave por grupo
  (simple y suficiente para el ramo). Si prefieren JWT de servicio, lo coordinamos.
- Todos los endpoints deben filtrar por empresa (`id_empresa`: 1 = Finet, 2 = Cable Mágico)
  cuando aplique.

---

## 1. Solicitudes al Grupo 3 (Terreno / FSM)

### 1.1 — CU-61 (vista móvil del técnico): OTs del día

| Ítem | Detalle |
|------|---------|
| Endpoint | `GET /ordenes` (ya existe; pedimos confirmar los filtros) |
| Query params | `id_tecnico`, `fecha_desde` / `fecha_hasta` (para "hoy"), `estado=PENDIENTE,EN_CURSO` |
| Datos por OT | `id_ot`, `tipo_ot`, `prioridad`, `estado`, `fecha_programada`, `observaciones` |
| Datos anidados | `cliente { id_cliente, rut, nombre_completo }` y `direccion { direccion, comuna, referencia }` |
| Caso sin datos | 200 con lista vacía (el técnico ve "No tiene trabajos asignados para hoy") |

### 1.2 — CU-70 (catálogo de tipos de trabajo): consumir su catálogo de categorías

| Ítem | Detalle |
|------|---------|
| Endpoint | `GET /ordenes/categorias-falla` (ya existe) |
| Datos esperados | `id_categoria`, `nombre`, `descripcion` |
| Pregunta abierta | ¿Ese catálogo cubre también los tipos de **instalación** (nuestro T-01..T-10) o es solo fallas de reparación? Si es solo fallas, necesitamos un `GET /tipos-trabajo` equivalente |

### 1.3 — CU-64 / CU-68 / CU-69 (cierre de instalación y reparación): recibir el cierre

El cierre de la OT lo ejecutan ustedes (`POST /ordenes/:id/cerrar`, ya implementado). La parte
de inventario (mover unidades a "Instalado en cliente", descontar inventario personal del técnico,
generar SRV-YYYY-XXXXX) es nuestra y necesita los datos del cierre.

| Ítem | Detalle |
|------|---------|
| Qué pedimos | Que al confirmar el cierre, su backend notifique a nuestro endpoint (webhook): `POST {API_T1}/api/integraciones/ordenes/{id_ot}/cierre` |
| Alternativa | Si prefieren no llamar nosotros, expongan `GET /ordenes/{id_ot}/cierre` y lo consultamos tras el cierre |

Cuerpo que necesitamos recibir (todas las cifras de inventario dependen de esto):

```json
{
  "id_ot": 123,
  "tipo_ot": "INSTALACION | REPARACION",
  "id_tecnico": 45,
  "fecha_completada": "2026-09-01T14:30:00Z",
  "cliente": { "id_cliente": 10, "rut": "12345678-5", "nombre_completo": "..." },
  "direccion": { "direccion": "...", "comuna": "..." },
  "equipos_instalados": [ { "numero_serie": "NS-001", "id_tipo_equipo": 3 } ],
  "equipos_retirados":  [ { "numero_serie": "NS-002", "id_tipo_equipo": 3 } ],
  "materiales": [ { "id_tipo_equipo": 7, "cantidad": 50.5 } ],
  "potencia_optica_dbm": -18.5,
  "reparacion": {
    "id_categoria_falla": 4,
    "categoria_falla_otro": "...",
    "falla_reportada": "...",
    "solucion_aplicada": "...",
    "resultado": "RESUELTO | PARCIAL | SIN_SOLUCION",
    "resuelto_remotamente": false
  }
}
```

- `equipos_instalados` y `materiales` sirven para CU-64 (acciones atómicas) y CU-68 (validar
  saldo del inventario personal).
- `equipos_retirados` y el bloque `reparacion` sirven para CU-69 (cierre de reparación).

> **Nota verificada en su código:** el `cerrar-ot.dto` actual de G3 ya incluye `materiales[]`,
> `fotos[]`, `potencia_optica_dbm`, `id_categoria_falla` y `resuelto_remotamente`, pero **NO**
> incluye `equipos_instalados[]` ni `equipos_retirados[]` (solo un `numero_serie` opcional dentro
> de cada material). **Hay que extender ese DTO** con los dos arreglos de números de serie, o no
> podremos mover las unidades de estado en CU-64 ni registrar el retiro en CU-69.

### 1.4 — CU-90 (reporte de productividad de técnicos): cierres por rango

| Ítem | Detalle |
|------|---------|
| Endpoint | `GET /ordenes` con filtros `estado=CERRADA`, `id_tecnico`, `tipo_ot`, `fecha_desde`, `fecha_hasta` (rango máx. 90 días) |
| Dato extra pedido | Que la respuesta incluya los materiales usados por OT (`materiales[] { id_tipo_equipo, cantidad }`) para no consultar OT por OT. Si el listado no puede incluirlos, nos sirve un `GET /ordenes/{id}?include=materiales` |
| Datos por OT | `id_ot`, `tipo_ot`, `id_tecnico`, `fecha_completada`, `id_categoria_falla`, `materiales[]` |

---

## 2. Solicitudes al Grupo 3 / Grupo 8 (dueño de `cliente`)

El alta/edición/consulta de clientes ya está implementada en G3 (módulo `clientes/`). Solo
necesitamos **leer** cliente. Los 4 CUs beneficiarios: CU-48, CU-71, CU-73 y CU-87.

### 2.1 — Cliente por RUT (CU-48, CU-71, CU-73, y también CU-64)

| Ítem | Detalle |
|------|---------|
| Endpoint | `GET /clientes/rut/{rut}` (ya existe en G3; pedimos acceso) |
| Datos de respuesta | `id_cliente`, `rut`, `nombre_completo`, `telefono`, `email`, `estado`, `id_empresa` |
| Dato extra pedido | Incluir `direcciones[] { id_direccion, direccion, comuna, referencia }` (su `direccion_servicio`): la dirección de instalación del equipo es necesaria en las fichas de devolución (CU-71/73) |
| Caso no encontrado | 404 con mensaje claro |

### 2.2 — Búsqueda de cliente por nombre/RUT (CU-87)

| Ítem | Detalle |
|------|---------|
| Endpoint | `GET /clientes?busqueda={texto}` (ya existe en G3; pedimos acceso) |
| Comportamiento pedido | Búsqueda parcial por nombre (mín. 3 caracteres, insensible a mayúsculas/tildes) o RUT exacto |
| Datos de respuesta | Mismos campos que 2.1 |

---

## 3. Tabla de equivalencias de estados (acuerdo necesario)

Nuestro sistema maneja una **máquina de estados de 6 literales exactos (con tildes)** que debe
coincidir carácter por carácter entre front y back. Los otros grupos usan otros nombres; si van a
consultar/consumir estado de equipos nuestros, este es el mapeo oficial:

| Literal oficial T1 | Lo que usan ellos | Quién lo usa | Observación |
|--------------------|-------------------|--------------|-------------|
| `En bodega` | `Disponible` | G8-CU-18/20 (precondición) | Renombrar en su spec o mapear al integrar |
| `Asignado a técnico` | `Asignado` / `EN_USO` (por confirmar) | G3 | Confirmar literal exacto |
| `Instalado en cliente` | `INSTALADO` / equipo asociado a cliente | G3-CU-04, G8-CU-59 | Confirmar literal exacto |
| `En revisión` | `EN_REVISION` (por confirmar) | G8-CU-55 | Confirmar literal exacto |
| `En préstamo externo` | — (nadie lo usa) | Solo T1 (CU-81..84) | Sin conflicto |
| `Dado de baja` | `BAJA_DEFINITIVA` | G3-CU-24 | ⚠ G3 marca baja desde su sistema — ver §4 |
| — (no existe en T1) | `Bloqueado` | G8-CU-22 | ⚠ Sería un 7º estado: decidir si lo agregamos o se mapea a `Dado de baja`. **Decisión del jefe de grupo** |

> Regla práctica: T1 es el **dueño de la máquina de estados**. Los otros grupos pueden *leer*
> el estado (vía nuestros endpoints) y *solicitar* transiciones, pero el cambio se ejecuta y
> valida siempre en T1. Nadie actualiza `unidad_equipo` directamente.

## 4. Regla de descuento único de stock (acuerdo necesario)

Su especificación declara que **G3 descuenta el stock al registrar materiales** (G3-CU-22:
"descuentan las cantidades del stock de inventario"; G3-CU-04 poscondición: "Inventario
descontado"). Nuestros CU-57/60/68 también descontarían (salida a técnico → cierre).

**Riesgo: doble descuento del mismo material.** Se propone al jefe de grupo y a G3 una de dos:

- **Opción A (recomendada):** G3 deja de descontar y solo **declara** los materiales en su cierre
  (el webhook del §1.3 ya los trae). T1 valida saldo (CU-68) y descuenta del inventario personal
  del técnico (CU-58) — una sola vez, con auditoría nuestra.
- **Opción B:** G3 descuenta y T1 solo recibe el registro para reportes. En ese caso T1 renuncia
  al descuento en CU-58/68 y nos quedamos con la trazabilidad/auditoría.

En cualquiera de las dos, el webhook del §1.3 es el mismo; solo cambia quién ejecuta el UPDATE
de stock. Debe quedar decidido **antes** de implementar CU-57..69.

---

## 5. Lo que T1 ofrece a cambio (endpoints nuestros disponibles)

Para los flujos recíprocos (ellos ya nos lo pedirán formalmente), dejamos constancia de que
expondremos: estado y ubicación de una unidad por `numero_serie`, saldo del inventario personal
de un técnico, y consumo de stock por OT. El detalle va en otro documento cuando lo soliciten.

---

## 6. Resumen de lo que pedimos (checklist para los otros grupos)

| # | Grupo | Endpoint | Estado actual | Para nuestro CU |
|---|-------|----------|---------------|-----------------|
| 1 | G3 | `GET /ordenes` con filtros técnico/fecha/estado + cliente y dirección anidados | ✅ Verificado en su código: trae cliente/tecnico/dirección y filtra `id_tecnico`/`fecha_desde`/`fecha_hasta` | CU-61 |
| 2 | G3 | `GET /ordenes/categorias-falla` | ✅ Existe | CU-70 |
| 3 | G3 | Webhook `POST /api/integraciones/ordenes/{id_ot}/cierre` (llamado por su cierre) o `GET /ordenes/{id}/cierre` | ✅ **Webhook construido por T1** (sc-113, autenticación `X-API-KEY`, idempotencia y discrepancias por ítem). G3 confirmó (09-sept) que su app **sí envía los equipos en el cierre** (`equipos_instalados[]`/`equipos_retirados[]` con la acción acordada). Pendiente: entregar a G3 la URL, la key y un serial de prueba (seed QA `QA-ONT-*-000x`) | CU-64, CU-68, CU-69 |
| 4 | G3 | `GET /ordenes` rango ≤ 90 días con `materiales[]` incluidos | Existe el listado; su include NO trae materiales → falta agregarlos | CU-90 |
| 5 | G3 | `GET /clientes/rut/{rut}` con direcciones incluidas | ✅ Verificado en su código: su service ya hace `include: { direcciones }` | CU-48, CU-71, CU-73 |
| 6 | G3 | `GET /clientes?busqueda=` parcial insensible | Existe; solo confirmar insensibilidad a tildes | CU-87 |
| 7 | Todos | Tabla de equivalencias de estados (§3) + regla de descuento único (§4) | **Acuerdos pendientes** | CU-24/64/69/78 y todo el flujo de salidas |

> **Prioridad:** los ítems 3 y 7 son los bloqueantes más serios (CU-64 es el corazón del
> incremento y sin el acuerdo de estados/descuento no se puede implementar el cierre completo).
> Los ítems 1, 2, 5, 6 ya están cumplidos por G3 según su código; solo falta el acceso/confirmación
> formal. El ítem 4 es un ajuste menor a su listado.
