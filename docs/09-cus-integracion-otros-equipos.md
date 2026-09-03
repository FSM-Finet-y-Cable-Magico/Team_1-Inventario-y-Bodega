# CUs restantes con interacción con otros equipos (CRM / Terreno / Web)

> **Propósito:** identificar, dentro de los 50 CUs pendientes (CU-47 a CU-96), cuáles implican
> trabajar con datos o procesos de **otros equipos de trabajo** del proyecto integral
> (equipo CRM, equipo Terreno, equipo Web), para coordinar dependencias antes de implementar.
>
> **Estado actual:** 46/96 CUs implementados (~48%). Meta Incremento 2: llegar a ~80%
> (77/96 → faltan 31 CUs internos, repartidos en el epic "Programación" de Shortcut;
> los 10 cruzados quedan para el cierre del incremento).
>
> **Nota:** `docs/casos-de-uso.json` no nombra a los equipos, por lo que la clasificación es por
> **dominio de datos**: todo lo que toca *clientes* se asocia al equipo **CRM**; todo lo que toca
> *técnicos de terreno, trabajos/órdenes de servicio y cierres de trabajo* se asocia al equipo
> **Terreno**. Cada CU se lista **junto con sus excepciones** (las excepciones NO cuentan como
> CU adicional: son parte del mismo CU).

---

## Resumen

| Equipo | CUs involucrados | Cantidad |
|--------|-----------------|----------|
| **CRM** (dominio: datos del cliente) | CU-48, CU-63, CU-65, CU-66, CU-67, CU-71, CU-73, CU-87 | 8 |
| **Terreno** (dominio: técnicos, trabajos, cierres) | CU-57, CU-58, CU-59, CU-60, CU-61, CU-62, CU-63, CU-64, CU-68, CU-69, CU-70, CU-89, CU-90 | 13 |
| **Web** | — (ningún CU directo, ver §3) | 0 |
| **Total únicos con interacción externa** | (CU-63 se repite en CRM y Terreno) | **20 de 50** |
| CUs puramente internos de Inventario y Bodega | ver §4 | 30 |

**Implicación:** para llegar al 85% (36 CUs más) alcanza de sobra con los 30 CUs internos + 6
cross-team; pero gran parte del valor del incremento 2 está en los flujos de Terreno/CRM.

---

## 1. Equipo CRM — dominio: datos del cliente

Estos CUs crean, editan, consultan o **consumen** la entidad `cliente` (RUT, nombre, dirección,
teléfono, correo, tipo Hogar/Empresa). Si el equipo CRM es dueño de los datos maestros de
clientes, hay que acordar con ellos **quién registra/clientea quién** y con qué formato/integración.

### 1.1 CUs que gestionan cliente directamente (dueño de datos en disputa)

| CU | Nombre | Excepciones (incluidas en el CU) |
|----|--------|----------------------------------|
| **CU-65** | Creando datos del cliente | E1: campos obligatorios inválidos o RUT ya registrado en la misma empresa → errores específicos por campo. |
| **CU-66** | Editando datos del cliente | E1: campos modificados no cumplen validaciones de formato/longitud → errores específicos por campo. |
| **CU-67** | Consultando datos y equipos del cliente | E1: cliente no existe o no tiene equipos → muestra la información disponible e indica si no hay registros de equipos. |

- **CU-65** — Crear cliente: RUT (formato XXXXXXXX-X, único por empresa, con dígito verificador),
  nombre (2–80), dirección principal (5–100), teléfono (8–15 dígitos), correo (opcional),
  tipo (Hogar/Empresa). Audita la creación. Un mismo RUT puede tener varios equipos y direcciones.
- **CU-66** — Editar cliente: búsqueda por RUT (exacto) o nombre (parcial); RUT no editable. Audita.
- **CU-67** — Ficha del cliente + equipos asociados (NS, tipo, dirección de instalación, fecha,
  estado, SRV-YYYY-XXXXX). Búsqueda por RUT exacto o nombre parcial (mín. 3 caracteres,
  insensible a mayúsculas/tildes).

### 1.2 CUs de Inventario que CONSUMEN datos de cliente

| CU | Nombre | Qué consume de CRM | Excepciones |
|----|--------|--------------------|-------------|
| **CU-48** | Consultando ubicación externa de equipo fuera de bodega | Nombre/RUT del cliente cuando el equipo está `Instalado en cliente` (y del técnico si está `Asignado a técnico` → también Terreno). | E1: datos del responsable externo incompletos → muestra campos disponibles e indica cuáles faltan. |
| **CU-63** | Registrando cierre de trabajo de instalación | Valida RUT del cliente; si no existe → **ofrece crear el cliente** (abre CU-65). | E1: RUT inválido → 'RUT inválido. Verifique el formato XXXXXXXX-X.' · E2: saldo insuficiente → 'Saldo insuficiente de [TIPO]: disponible [SALDO] [UNIDAD], declarado [CANTIDAD] [UNIDAD].' · E3: RUT no existe → 'Cliente no encontrado. ¿Desea crear el cliente?' (abre formulario CU-65). |
| **CU-71** | Registrando devolución de equipo desde cliente | Muestra nombre del cliente y dirección de instalación del equipo devuelto. | E1: equipo no está `Instalado en cliente` → 'Transición de estado no permitida para este equipo. Estado actual: [ESTADO].' |
| **CU-73** | Mostrando información de equipo en devolución | Muestra nombre del cliente al que estaba instalado. | E1: datos de la unidad incompletos → muestra campos disponibles e indica cuáles no están registrados. |
| **CU-87** | Generando reporte de equipos instalados por cliente | Búsqueda por RUT del cliente (exacto) y/o nombre (parcial). | E1: sin resultados → 'No se encontraron equipos instalados con ese criterio.' |

---

## 2. Equipo Terreno — dominio: técnicos, trabajos y cierres

Estos CUs giran alrededor del **inventario personal del técnico**, las **salidas de bodega a
técnico** y los **trabajos/cierres de trabajo** (instalación/reparación). Los técnicos ya existen
como usuarios (rol `TECNICO_TERRENO`, CU-04..07), pero las entidades *trabajo*, *cierre* e
*inventario personal* aún no existen en nuestra BDD y son del dominio de Terreno.

### 2.1 Flujo de asignación (salidas de bodega a técnico)

| CU | Nombre | Interacción con Terreno | Excepciones |
|----|--------|------------------------|-------------|
| **CU-57** | Registrando salida de equipos de bodega a técnico | Selección de técnicos activos; cambia equipos a `Asignado a técnico`; alimenta inventario personal. | E1: NS no encontrado → 'Número de serie no encontrado.' · E2: saldo de consumibles insuficiente → muestra saldo disponible e indica error. · E3: equipo no está `En bodega` en esa bodega → 'El equipo [NS] no está disponible en esta bodega. Estado actual: [ESTADO].' |
| **CU-58** | Manteniendo inventario personal del técnico | Entidad compartida: saldo de consumibles y NS asignados por técnico. | E1: operación dejaría saldo negativo → 'Saldo insuficiente. No es posible registrar esta operación.' |
| **CU-59** | Validando número de serie en salida de bodega | Validación automática dentro del flujo de salida. | E1: NS no existe → 'Número de serie no encontrado.' · E2: no disponible en la bodega → 'El equipo [NS] no está disponible en esta bodega. Estado actual: [ESTADO].' |
| **CU-60** | Registrando salida de consumibles a técnico | Ídem CU-57 para consumibles. | E1: cantidad ≤ 0 → 'La cantidad debe ser mayor a cero.' · E2: stock insuficiente → muestra saldo disponible e indica error. |
| **CU-62** | Validando stock disponible en bodega para consumibles | Validación automática que soporta las salidas/asignaciones. | E1: stock insuficiente → 'Stock insuficiente de [TIPO_CONSUMIBLE] en [NOMBRE_BODEGA]. Disponible: [CANTIDAD] [UNIDAD].' |

### 2.2 Trabajos y cierres (el punto de integración más fuerte con Terreno)

| CU | Nombre | Interacción con Terreno | Excepciones |
|----|--------|------------------------|-------------|
| **CU-61** | Consultando vista móvil de trabajos e inventario del técnico | **Los "trabajos del día" (dirección, cliente, tipo Instalación/Reparación, estado Pendiente/En curso/Cerrado) provienen del dominio de Terreno.** Vista móvil para el técnico. | E1: sin trabajos → 'No tiene trabajos asignados para hoy.' |
| **CU-63** | Registrando cierre de trabajo de instalación | Registra el cierre del trabajo que el técnico ejecuta en terreno; genera identificador de servicio. (También CRM por el RUT del cliente, §1.2.) | E1/E2/E3 ver §1.2. |
| **CU-64** | Ejecutando acciones atómicas del cierre de instalación | Transacción todo-o-nada: equipo → `Instalado en cliente`, asocia a cliente/dirección, descuenta consumibles del técnico, genera SRV-YYYY-XXXXX, audita. | E1: falla alguna acción → revierte todo y muestra el error específico. |
| **CU-68** | Verificando saldo de consumibles en cierre | Valida saldo del inventario personal del técnico contra lo declarado en el cierre. | E1: saldo insuficiente → 'Saldo insuficiente de [TIPO_CONSUMIBLE]: disponible [SALDO] [UNIDAD], declarado [CANTIDAD] [UNIDAD].' |
| **CU-69** | Registrando cierre de trabajo de reparación | Cierre con falla reportada, solución, retiro/reemplazo de equipos y resultado (Resuelto/Parcial/Sin solución). | E1: saldo insuficiente o NS inválido/no asignado al técnico → error específico, no permite confirmar. |
| **CU-70** | Seleccionando tipo de trabajo codificado para cierre | Catálogo de códigos T-01..T-10 (Instalación internet, TV cable, Combo, Cambio ONT, etc.) que precompleta el cierre. | E1: ningún código aplica → el actor completa el formulario manualmente sin seleccionar tipo. |

### 2.3 Reportes sobre técnicos

| CU | Nombre | Interacción con Terreno | Excepciones |
|----|--------|------------------------|-------------|
| **CU-89** | Generando reporte de inventario actual de técnicos | Reporte del inventario personal (NS asignados + saldos de consumibles) por técnico. | E1: técnico sin ítems → 'Este técnico no tiene ítems en su inventario personal.' |
| **CU-90** | Generando reporte de productividad de técnicos | Nº de instalaciones/reparaciones cerradas, metros de fibra, conectores y otros consumibles por técnico (requiere cierres ya registrados). | E1: rango > 90 días → 'El rango de fechas para este reporte no puede superar los 90 días.' |

---

## 3. Equipo Web

**No hay ningún CU del JSON (47–96) que referencie directamente un sitio/portal web.** Lo más
cercano:

- **CU-61** (vista móvil): si el equipo Web es responsable de la experiencia móvil/portal,
  conviene coordinar con ellos el diseño de esa vista.
- **CU-92/CU-93** (export Excel/PDF) y **CU-80** (PDF de donación): generan documentos
  descargables, no hay integración web.
- Si el portal Web del ISP necesita consultar stock/disponibilidad de equipos, sería una
  integración futura a definir con el jefe de grupo (no está en los 96 CUs).

---

## 4. CUs restantes PURAMENTE internos (sin dependencia de otros equipos)

| Módulo | CUs |
|--------|-----|
| Bodegas y stock | CU-47, CU-48* |
| Recepción desde proveedor | CU-49, CU-50, CU-51, CU-52, CU-53, CU-54, CU-55, CU-56 |
| Devoluciones (proceso interno) | CU-72, CU-73* |
| Reacondicionamiento | CU-74, CU-75, CU-76, CU-77 |
| Baja definitiva | CU-78, CU-79, CU-80 |
| Préstamos a externos | CU-81, CU-82, CU-83, CU-84 |
| Reportes | CU-85, CU-86, CU-88, CU-91* |
| Alertas y notificaciones | CU-94, CU-95, CU-96 |

\* CU-48 y CU-73 consumen datos de cliente/ubicación externa (ver §1.2) y CU-91 depende de que
existan salidas y cierres registrados (§2), pero su lógica es de Inventario.

**Nota de dependencia interna:** los reportes CU-85/86/89/90/91 y las alertas CU-94/96 solo tienen
datos interesantes una vez implementadas recepciones (CU-52..56), salidas (CU-57..62) y cierres
(CU-63..70).

---

## 5. Entidades nuevas que estos CUs introducen (para coordinar propiedad)

| Entidad/ concepto | CUs que la crean | Posible dueño |
|-------------------|------------------|---------------|
| `cliente` (RUT, nombre, dirección, teléfono, correo, tipo) | CU-65/66/67 | **Definir con CRM** |
| `trabajo` / orden de servicio del día (instalación/reparación) | (no se crea aquí; se consume en CU-61 y se cierra en CU-63/69) | **Definir con Terreno** |
| `cierre de trabajo` + identificador SRV-YYYY-XXXXX | CU-63, CU-64, CU-69, CU-70 | Terreno/Inventario (compartido) |
| Inventario personal del técnico (saldo de consumibles + NS asignados) | CU-57/58/60/62/68 | Inventario (afecta a Terreno) |
| Tipo de trabajo codificado T-01..T-10 | CU-70 | Terreno/Inventario (catálogo compartido) |

> **Recomendación:** antes de implementar el bloque CU-57..CU-70, confirmar con el jefe de grupo
> y los otros equipos: (a) quién es dueño del CRUD de clientes, (b) de dónde vienen los "trabajos
> del día" (¿otro sistema o se registran aquí?), (c) formato de los identificadores SRV/PE/OI.
