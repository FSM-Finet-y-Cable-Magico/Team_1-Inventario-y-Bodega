# Casos de uso — Estado de implementación (CU-01 a CU-47)

> **Contexto:** el proyecto tiene **96 casos de uso totales**. En el **Incremento 1** se implementaron
> **46** (CU-01 a CU-46), superando el 30% mínimo exigido por la rúbrica. Los restantes (50) se
> implementarán en incrementos siguientes siguiendo el flujo de `01-flujo-de-trabajo.md`.
>
> **La fuente de información de los CUs** es el archivo `docs/casos-de-uso.json` (solo lectura).
> Cada CU se trabaja con sus restricciones/excepciones. El estado de avance de los 96 CUs se
> sigue en `docs/08-roadmap.md`.

## 1. Dónde vive la evidencia de cada CU implementado

| Recurso | Ruta | Contenido |
|---------|------|-----------|
| Especificación de flujos | `diagramas/diagramas-secuencia/CUXX/*.puml` (+ PNG) | Flujo normal + excepciones con endpoints, servicios, SQL y códigos HTTP. **La fuente técnica de verdad.** |
| Evidencia visual | `Casos de uso/CU-XX/Correcto*.png` y `Excepcion*.png` | Capturas de pantalla de cada flujo funcionando. |
| Código | `codigo/` (backend + frontend) | Implementación real (ver mapa por módulo abajo). |

## 2. Mapa CU → Módulos (backend) y Páginas (frontend)

| CU | Nombre (resumen) | Backend (módulo) | Frontend (ruta) |
|----|------------------|------------------|-----------------|
| 01 | Iniciar sesión (con bloqueo por intentos) | `auth` | `/login` |
| 02 | Autenticación JWT | `auth` (JwtStrategy/guards) | `+layout`, `stores/auth` |
| 03 | Autorización por rol | `auth` (RolesGuard) | `Sidebar`, acciones por rol |
| 04 | Crear usuario | `usuarios` | `/usuarios` |
| 05 | Listar/filtrar usuarios | `usuarios` | `/usuarios` |
| 06 | Editar usuario (roles/empresa) | `usuarios`, `companies` | `/usuarios/[id]` |
| 07 | Desactivar usuario | `usuarios` | `/usuarios`, `/usuarios/[id]` |
| 08 | Ver log de auditoría | `auditoria` | `/auditoria` |
| 09 | Filtrar auditoría | `auditoria` | `/auditoria` |
| 10 | Cambio/restablecimiento de contraseña | `auth` | `/login`, `/usuarios/[id]` |
| 11 | Cierre de sesión manual | `auth` | `+layout`, `Sidebar` |
| 12 | Cierre por inactividad | `auth` | `+layout` |
| 13 | Contexto de empresa (multiempresa) | `auth`, guards | `+layout`, `stores/auth` |
| 14 | Empresa sin asignación (restricción) | `auth` (login), `CompanyIsolationGuard` | — |
| 15 | Dashboard consolidado (superusuario) | `companies` | `/dashboard` |
| 16 | Mi dashboard por empresa | `companies` | `/dashboard` |
| 17 | Crear registro con aislamiento de empresa | `inventario` (`CompanyIsolationGuard`) | `/catalogo` |
| 18 | Editar registro con aislamiento de empresa | `inventario` (`CompanyIsolationGuard`) | `/catalogo/[id]` |
| 19 | Eliminar/desactivar registro con aislamiento | `inventario` (`CompanyIsolationGuard`) | `/catalogo` |
| 20 | Solicitar transferencia + notificación | `transferencias`, `companies`, `bodegas` | `/transferencias`, `Header` (campana) |
| 21 | Aprobar transferencia + detalle | `transferencias` | `/transferencias` |
| 22 | Rechazar transferencia (motivo obligatorio) | `transferencias` | `/transferencias` |
| 23 | Listar/filtrar transferencias | `transferencias` | `/transferencias` |
| 24 | Crear tipo de equipo en catálogo | `inventario/catalog` | `/catalogo` |
| 25 | Consultar catálogo | `inventario/catalog` | `/catalogo` |
| 26 | Editar tipo de equipo | `inventario/catalog` | `/catalogo/[id]` |
| 27 | Desactivar/eliminar tipo (físico) | `inventario/catalog` | `/catalogo` |
| 28 | Registro de unidades/consumibles | `inventario/catalog` + `units` | `/unidades` |
| 29 | Adjuntar ficha técnica (PDF) | `inventario/catalog` | `/catalogo/[id]` |
| 30 | Descargar ficha técnica | `inventario/catalog` | `/catalogo`, `/catalogo/[id]` |
| 31 | Ingreso de consumibles por cantidad | `inventario/units` | `/unidades` |
| 32 | Registrar unidad individualizada | `inventario/units` | `/unidades` |
| 33 | Ver ficha de unidad | `inventario/units` | `/unidades/[id]` |
| 34 | Editar datos de unidad | `inventario/units` | `/unidades/[id]` |
| 35 | Cambio de estado (máquina de transiciones) | `inventario/units` | `/unidades/[id]` |
| 36 | Historial de estados + observaciones | `inventario/units` | `/unidades/[id]` |
| 37 | Historial con usuario/empresa | `inventario/units` | `/unidades/[id]` |
| 38 | Garantía (fecha de vencimiento) | `inventario/units` | `/unidades/[id]` |
| 39 | Alerta de garantía | `inventario/units` | `/unidades/[id]` |
| 40 | Diagnóstico técnico (En revisión) | `inventario/units` | `/unidades/[id]` |
| 41 | Crear bodega | `bodegas` | `/bodegas` |
| 42 | Editar bodega | `bodegas` | `/bodegas/[id]` |
| 43 | Desactivar bodega (última activa) | `bodegas` | `/bodegas` |
| 44 | Listado de bodegas con stock | `bodegas` | `/bodegas` |
| 45 | Stock por tipo/estado/unidad de medida | `bodegas` | `/bodegas/[id]` |
| 46 | Umbral mínimo de stock + alertas | `bodegas`, `companies` | `/bodegas/[id]`, `/dashboard`, `Header` |
| 47 | Ubicación física al ingresar/reingresar a bodega | `inventario/units` | `/unidades/[id]` |
| 49 | Crear proveedor (CU-49) | `proveedores` | `/proveedores` |
| 50 | Editar proveedor (CU-50) | `proveedores` | `/proveedores` |

## 3. Diagramas disponibles (referencia para CUs pendientes)

| Diagrama | Ruta |
|----------|------|
| Árbol de navegación (UI) | `diagramas/arbol-navegacion/arbol-navegacion.png` |
| Clases backend | `diagramas/diagrama-clases/diagrama-clases-backend.svg` (+ README) |
| Componentes | `diagramas/diagrama-componentes/diagrama-componentes-v2.png` |
| Despliegue | `diagramas/diagrama-despliegue/diagrama-despliegue.png` |
| MER (Chen) | `diagramas/diagrama_mere/mere-chen.png` |
| Modelo físico BDD | `diagramas/diagrama_modelo_fisico/modelo_bdd.png` |
| Secuencia por CU | `diagramas/diagramas-secuencia/CU01/ … CU46/` (puml + png) |

## 4. Formato de los diagramas de secuencia (PlantUML)

Convenciones constantes en todos los `.puml`:
- `title`: `CU-XX — Nombre (flujo normal)` o `(excepción: descripcion)`.
- Participantes: actor `Usuario`, `V_*` (vista SvelteKit), `C_*` (controlador/servicio NestJS),
  `C_TypeORM` y la **tabla de BD** como participante.
- Cada mensaje incluye detalle técnico real: endpoint HTTP, método del servicio, SQL aproximado y
  código de estado HTTP.
- Skin estándar: `skinparam style strictuml`, `monochrome true`, `shadowing false`,
  `sequenceMessageAlign center`, `hide footbox`.

Referencias de ejemplo:
- `diagramas/diagramas-secuencia/CU01/CU01-normal.puml`
- `diagramas/diagramas-secuencia/CU24/CU24-exc-nombre-duplicado.puml`
- `diagramas/diagramas-secuencia/CU32/CU32-exc-serie-invalida.puml`

## 5. Cómo actualizar este documento al implementar un CU nuevo

Al terminar un CU nuevo (p. ej. CU-47):
1. Agrega una fila a la tabla del punto 2 (módulo backend + ruta frontend).
2. Agrega los diagramas de secuencia en `diagramas/diagramas-secuencia/CU47/`
   (flujo normal + excepciones) y las capturas en `Casos de uso/CU-47/`.
3. Si el CU toca un módulo existente, actualiza el doc del módulo en `docs/05-backend/`
   o `docs/04-frontend/` (endpoints, entidades, reglas nuevas).
