# Trazabilidad entre equipos — Inventario y Bodega (T1) vs CRM (G8) vs Terreno (G3) vs Web (G2)

> **Propósito:** cruzar los 4 conjuntos de casos de uso para detectar CUs y funcionalidades en
> común, evitar duplicación de trabajo y organizar el camino a la meta de avance acordada
> (Incremento 2: ~80%, ver `docs/08-roadmap.md`).
>
> **Fuentes:** los JSON de cada equipo (las copias de G2/G3/G8 están en [`docs/anexos/`](./anexos/README.md)). Los porcentajes
> de avance de G2 y G8 **están pendientes de que el jefe los confirme**; G3 declara 17/56 (≈30%)
> en su propio JSON, aunque nos indican que todos avanzan ~a nuestra altura (48%).

---

## 1. Panorama de los 4 equipos

| Equipo | Sistema | CUs | Avance conocido | Dominio |
|--------|---------|-----|-----------------|---------|
| **Team 1 (nosotros)** | Sistema de Gestión Integral — Inventario y Bodega | 96 | **46/96 (48%)** | Catálogo, unidades, bodegas, stock, transferencias, recepción, asignación a técnicos, bajas, préstamos, reportes, alertas |
| **Grupo 3** | FSM de Gestión de Instalaciones y Monitoreo Técnico ("Terreno") | 56 | 17/56 (30%) según su JSON | OTs, monitoreo ONT, planta externa (topología), materiales en OT, clientes (vista técnica), técnicos en terreno (web móvil) |
| **Grupo 8** | Sistema de Gestión Integral — CRM ("CRM") | 86 | por confirmar | Prospectos/ventas, clientes CRM, instalaciones, tickets, cobranza, WhatsApp, portal cliente/TV IP, **módulo "Gestión de Inventario"** |
| **Grupo 2** | Portal Web y Sistema de Gestión ("Web") | 80 | por confirmar | Portal público, portal cliente, pagos (Webpay/Mercado Pago), morosidad/SmartOLT, chatbot, tickets, SEO |

**Stack común:** SvelteKit + Tailwind (vista) / NestJS + TypeScript (controlador) / PostgreSQL
(G3 usa Prisma, nosotros TypeORM). G3 menciona un **esquema compartido `mere_finet.sql`**.

---

## 2. Mapa de entidades compartidas (dónde nos cruzamos)

| Entidad / concepto | T1 (nosotros) | G3 Terreno | G8 CRM | G2 Web | Dueño natural |
|--------------------|---------------|------------|--------|--------|---------------|
| `usuario` / `rol` / `usuario_rol` | ✅ implementado | ✅ (login, cuentas; 38/39/42 implementados) | ✅ (CU-43..46) | ✅ (portal cliente) | Compartido / unificar criterios |
| `empresa` (Finet / Cable Mágico) | ✅ constante `EMPRESAS` | ✅ (CU-33 implementado: cambio de vista) | ✅ (CU-45 alterna vistas) | ✅ (portal por empresa) | Compartido |
| **`cliente`** | ⚠ pendiente (CU-65/66/67) | ✅ **YA implementado** (CU-27/28/06/54) | ✅ (módulo CRM: CU-08/11/14/15/64..) | ✅ (portal cliente, deuda por RUT) | ⚠ **CONFLICTO: 3 equipos lo implementan** |
| `orden_trabajo` / cierre de trabajo | ⚠ pendiente (CU-61..70) | ✅ **YA implementado** (CU-01..04, 11) | ⚠ (CU-17 orden instalación, CU-76 código OT) | — | ⚠ **CONFLICTO: G3 vive de esto; nuestro bloque 61..70 se solapa** |
| `unidad_equipo` + `historial_estado_equipo` | ✅ implementado (máquina de estados) | ⚠ (CU-24 estado ONT: planificado) | ⚠ (CU-54 estado lógico: su módulo inventario) | — | **Nosotros** (ya está hecho y con reglas estrictas) |
| `tipo_equipo` (catálogo) | ✅ implementado | ✅ consume (CU-22) | ⚠ (clasificación CU-72) | — | **Nosotros** |
| `stock_consumible` + umbral | ✅ implementado (CU-45/46) | ✅ consume (CU-04/22 descuentan stock) | ⚠ (CU-56/57: su módulo inventario) | — | **Nosotros** |
| `movimiento_inventario` | ✅ implementado (transferencias) | ✅ consume (CU-22 lo escribe) | ⚠ (CU-53 movimientos) | — | **Nosotros** |
| Transferencias inter-empresa | ✅ implementado (CU-20..23) | — | ⚠ (CU-58 duplica) | — | **Nosotros** |
| Garantías | ✅ implementado (CU-38/39) | — | ⚠ (CU-85 duplica) | — | **Nosotros** |
| `proveedor` / orden de ingreso | ⚠ pendiente (CU-49..56) | — | — (solo nombran proveedor en garantías) | — | **Nosotros (exclusivo)** |
| Préstamos externos | ⚠ pendiente (CU-81..84) | — | — | — | **Nosotros (exclusivo)** |
| Baja definitiva / donación | ⚠ pendiente (CU-78..80) | ⚠ (CU-25 baja de servicio ≈ retiro) | ⚠ (CU-22 bloqueo, CU-84 retiro servicio) | — | Mixto: el *servicio* lo retiran ellos; el *equipo* se da de baja acá |
| `ticket` | — | ✅ (CU-29/30/32) | ✅ (CU-23..26, 75) | ✅ (CU-30, 71, 77, 78) | Ellos (no lo tocamos) |
| `monitoreo_ont` / `caja_nap` / topología | — (solo columnas `numero_poste`, `id_caja_nap`) | ✅ dueño | ⚠ (CU-18/19 poste/caja NAP) | — | G3 |
| Pagos / morosidad / SmartOLT | — | ⚠ lista negra (CU-35/36) | ✅ cobranza | ✅ motor de pago | G2/G8 |
| Notificaciones / alertas | ⚠ pendiente (CU-94..96, propias de stock/préstamos) | ✅ (CU-48..53) | ✅ (WhatsApp) | ✅ (chatbot/WhatsApp) | Cada dominio las suyas |

---

## 3. Matriz detallada: nuestros CU-47..96 vs CUs de ellos

Leyenda: ✅ su CU ya está implementado · ⚠ su CU está planificado · — sin equivalente.
"CUBRE" = su CU ya cubre funcionalidad que nuestro CU necesitaría → riesgo de duplicar.

### 3.1 Clientes (nuestro bloque CRM-interno)

| Nuestro CU | Equivalente G3 (Terreno) | Equivalente G8 (CRM) | Equivalente G2 (Web) | Situación |
|------------|--------------------------|----------------------|----------------------|-----------|
| CU-65 Crear cliente | **G3-CU-27 ✅** (ya implementa alta de cliente con dirección) | G8-CU-11 (importación masiva), CU-14, CU-15 (valida RUT DV) | G2-CU-04 (cuenta portal) | ⚠ **Duplicado en G3 YA implementado** |
| CU-66 Editar cliente | **G3-CU-28 ✅** (ficha + edición con auditoría) | G8-CU-08, 71, 73 (ciclo de vida/obs.) | G2-CU-08/09 (teléfono/correo) | ⚠ Duplicado en G3 ✅ |
| CU-67 Consultar cliente + equipos | G3-CU-06 ✅ / CU-07 ⚠ (historial por RUT/dirección) | G8-CU-14 ⚠ (historial completo) | G2-CU-23..26 (portal) | ⚠ Su "historial" es de OTs; los **equipos instalados** solo los sabemos nosotros |
| CU-63 Cierre instalación (valida RUT cliente) | **G3-CU-04 ✅** (cierre OT en terreno) | G8-CU-07 ⚠ (activa cliente post-instalación), CU-17 ⚠ | — | ⚠ **Solapamiento fuerte** |
| CU-71 Devolución desde cliente | G3-CU-25 ⚠ (baja de servicio → genera OT de retiro) | G8-CU-84 ⚠ (solicitud retiro) | — | El *retiro* lo disparan ellos; la *recepción del equipo* es nuestra |
| CU-73 Info del equipo en devolución | — (G3-CU-24 ⚠ toca estados ONT) | G8-CU-55 ⚠ (diagnóstico equipo devuelto) | — | El diagnóstico detallado ya lo tenemos (CU-40 ✅) |
| CU-87 Reporte equipos por cliente | G3-CU-06 ✅ (historial cliente) | G8-CU-14 ⚠ | — | Reporte nuestro; consumimos `cliente` |
| CU-48 Ubicación externa | — | G8-CU-59 ⚠ (vincula equipo a cliente/servicio) | — | Nuestro (los datos vienen de nuestros estados) |

### 3.2 Asignación a técnicos y cierres (nuestro bloque Terreno-interno) — el cruce más crítico

| Nuestro CU | Equivalente G3 | Equivalente G8 | Situación |
|------------|----------------|----------------|-----------|
| CU-57 Salida de equipos a técnico | G3-CU-22 ✅ (usa/vincula materiales y NS, descuenta stock) | G8-CU-53 ⚠ (movimientos) | ⚠ **G3 ya descuenta stock y vincula NS en OTs** → nuestro CU-57 debe ser la *salida de bodega* previa (inventario personal), G3 consume de ahí |
| CU-58 Inventario personal técnico | G3-CU-23 ⚠ (resumen diario de materiales) | G8-CU-61 ⚠ (consumo mensual) | ⚠ Nosotros debemos ser dueños del *saldo*; G3/G8 reportan sobre él |
| CU-59 Validar NS en salida | (dentro de G3-CU-22 ✅) | — | Nuestro (ya existe validación NS CU-28 ✅) |
| CU-60 Salida de consumibles | G3-CU-22 ✅ | G8-CU-56 ⚠ | ⚠ Coordinar para no descontar stock dos veces |
| CU-61 Vista móvil técnico | **G3-CU-11 ✅ (OT del día en celular)** | — | ⚠ **Duplicado funcional**: su hoja de ruta ya existe; nuestra vista móvil debería mostrar *inventario personal* y enlazar a sus OTs |
| CU-62 Validar stock en bodega | (G3 lo invoca al descontar) | G8-CU-56 ⚠ | Nuestro (ya hay base en CU-45/46 ✅) |
| CU-63/64 Cierre instalación atómico | **G3-CU-04 ✅ (cierra OT con materiales, potencia, fotos)** | G8-CU-07/17/76 ⚠ | ⚠⚠ **Conflicto central**: el cierre de instalación/reparación YA lo hace G3 desde la OT. Nuestro aporte: atomicidad sobre *estados de equipo, instalación-en-cliente y SRV* |
| CU-68 Saldo consumibles en cierre | G3-CU-04 ✅ / CU-22 ✅ | G8-CU-56 ⚠ | ⚠ Validar saldo contra NUESTRO inventario personal |
| CU-69 Cierre de reparación | G3-CU-04 ✅ + CU-55/56 ⚠ (categoría falla / modalidad resolución) | G8-CU-21 ⚠ (diagnóstico visita) | ⚠ Mismo conflicto que CU-63 |
| CU-70 Tipo trabajo codificado T-01..T-10 | G3-CU-55/56 ⚠ (categorías de falla/resolución) | G8-CU-24 ⚠ (clasificación tickets) | Coordinar catálogo de códigos |

### 3.3 Inventario puro (G8 tiene un módulo que duplica el nuestro)

| Nuestro CU | Equivalente G8 ("Gestión de Inventario") | Situación |
|------------|------------------------------------------|-----------|
| CU-35/36 Estados automáticos ✅ | G8-CU-54 ⚠ (estado lógico según movimiento) | Ya implementado por nosotros |
| CU-45/46 Stock + umbral ✅ | G8-CU-56/57 ⚠ (control stock + alerta umbral) | Ya implementado por nosotros |
| CU-20..23 Transferencias ✅ | G8-CU-58 ⚠ (transfiere entre empresas) | Ya implementado por nosotros |
| CU-38/39 Garantía ✅ | G8-CU-85 ⚠ (garantía cliente/servicio/equipo) | Nuestro cubre equipo; el suyo extiende a servicio |
| CU-47 Ubicación física en bodega | — | Exclusivo nuestro |
| CU-72/74 Resultado de revisión | G8-CU-55 ⚠ (diagnostica equipo devuelto) | Ya lo tenemos (CU-40 ✅); CU-72 agrega destinos |
| CU-77 Listado en revisión | — | Exclusivo nuestro |
| CU-91 Reporte consumo consumibles | G8-CU-61 ⚠ (consumo mensual) | Mismo reporte, dominio nuestro |
| CU-16..19 Aislamiento empresa ✅ | G8-CU-62 ⚠ (filtra inventario por empresa) | Ya implementado |
| (recepción proveedor CU-49..56) | — | Exclusivo nuestro |
| (préstamos externos CU-81..84) | — | Exclusivo nuestro |
| (bajas/donación CU-78..80) | G8-CU-22 ⚠ (bloqueo equipo retirado) | Complementario, no igual |

### 3.4 Alertas y notificaciones

| Nuestro CU | Equivalentes | Situación |
|------------|--------------|-----------|
| CU-94 Alertas dashboard (stock bajo, garantía con defecto, préstamo vencido, revisión >30d) | G3-CU-12..17 ⚠ (monitoreo), G8-CU-09/47 ⚠ | Nuestros 4 tipos son de inventario: exclusivos |
| CU-95 Aviso garantía al cambiar estado | — | Exclusivo (extiende CU-39 ✅) |
| CU-96 Campana notificaciones | G3-CU-48..50 ⚠ (plantillas/masivas) | El canal campana ya existe en nuestro Header (CU-20 ✅ notifica transferencias) |

### 3.5 Reportes / exportación

| Nuestro CU | Equivalentes |
|------------|--------------|
| CU-85..91 (7 reportes) | G3-CU-26/45/46 ⚠, G8-CU-33/47/48/68 ⚠, G2-CU-57/58 (financieros) — cada uno reportea su dominio; los 7 nuestros son de inventario |
| CU-92/93 Export Excel/PDF | Patrón repetido en G3-CU-46, G8-CU-33, G2-CU-57/58 → conviene un componente/utilidad común por equipo |

---

## 4. Conflictos críticos (resumen ejecutivo)

1. **⚠⚠ `cliente` triplicado.** G3 YA implementó alta/edición/consulta de cliente (G3-CU-27/28/06/54)
   y G8 tiene todo el módulo CRM de clientes. Nuestros CU-65/66/67 tal como están escritos
   **duplican** lo ya construido. Opciones: (a) implementarlos igual (sistemas separados por
   diseño del ramo), (b) consumir la entidad/tabla compartida (`mere_finet.sql` menciona G3),
   (c) reducirlos a lo mínimo que necesitan nuestros flujos (RUT → crear si no existe, CU-63 E3).
   **Decisión del jefe de grupo.**
2. **⚠⚠ Cierre de instalación/reparación vs OT de G3.** G3-CU-04 ya cierra la OT en terreno con
   materiales y fotos (implementado). Nuestros CU-63/64/69 son el mismo momento del negocio visto
   desde inventario. Coordinar: quién mueve `unidad_equipo` de `Asignado a técnico` →
   `Instalado en cliente`, quién genera SRV-YYYY-XXXXX, y que el descuento de consumibles se haga
   **una sola vez** (ideal: contra nuestro inventario personal del técnico).
3. **⚠ G8 tiene un módulo "Gestión de Inventario" (13 CUs) que duplica nuestro dominio ya
   implementado** (estados, stock, umbral, transferencias, garantías, aislamiento por empresa).
   Somos el dueño natural con 46 CUs andando; proponerse como proveedor de esa funcionalidad
   para G8 en lugar de que la re-implementen.
4. **⚠ Autenticación/usuarios repetido en los 4 sistemas.** Cada grupo tiene su login/roles.
   Si el esquema `mere_finet.sql` es compartido, definir si `usuario` es tabla única (sincronizar
   semilla de usuarios/roles) o cada quien la suya.
5. **Identificadores de negocio a unificar:** OT (G3-CU-76 genera código propio), SRV-YYYY-XXXXX
   (nuestro CU-64), PE-XXXXX (nuestro CU-81), OI-0001 (nuestro CU-52) — que ningún equipo genere
   el mismo tipo de correlativo con distinto significado.

---

## 5. Qué es 100% nuestro (sin ningún equivalente en G2/G3/G8)

CU-47, CU-49, CU-50, CU-51, CU-52, CU-53, CU-54, CU-55, CU-56 (recepción proveedor completa),
CU-74, CU-75, CU-76 (reacondicionamiento), CU-78, CU-79, CU-80 (bajas/donación),
CU-81, CU-82, CU-83, CU-84 (préstamos externos), CU-85, CU-86, CU-88, CU-89, CU-90, CU-91
(reportes de inventario), CU-92, CU-93 (export), CU-94, CU-95 (alertas de inventario).

→ **28 CUs exclusivos + 22 con cruce.** Con los 28 exclusivos + 8 cruzados llegamos a 82/96 (85%).

---

## 6. Pendiente de datos del jefe

- [ ] % y cantidad de CUs funcionales de **G2** y **G8** (los JSON no traen estado).
- [ ] Confirmar si el avance de G3 es 17/56 (su JSON) o ~48% (como se nos indicó).
- [ ] ¿Los 4 sistemas comparten una sola BDD (`mere_finet.sql`) o bases separadas?
- [ ] Decisión sobre conflicto `cliente` (§4.1) y cierre vs OT (§4.2).
