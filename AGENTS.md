# AGENTS.md — Guía para agentes de código / desarrolladores

> Este archivo es la puerta de entrada para cualquier agente de IA o desarrollador que trabaje
> en este repositorio. **Léelo completo antes de tocar código.**

## 1. Qué es este proyecto

Sistema fullstack de **inventario y bodega** para un ISP (empresas **Finet** y **Cable Mágico**).
~46 de ~94 casos de uso ya están implementados (CU-01 a CU-46).

| Capa | Tecnología |
|------|-----------|
| Frontend | SvelteKit + Svelte 5 + Tailwind CSS v4 (`codigo/frontend/`) |
| Backend | NestJS + TypeORM + PostgreSQL (`codigo/backend-inventario/`) |
| Infra | Docker Compose + Nginx (entrada única en `http://localhost`) |

## 2. Mapa del repositorio

```
docs/                            ← DOCUMENTACIÓN (lee primero, ver §4)
codigo/                          ← EL SISTEMA
  ├── docker-compose.yml         ← db + backend + frontend + nginx
  ├── database/init.sql          ← esquema SQL inicial
  ├── backend-inventario/src/    ← módulos NestJS (auth, usuarios, roles, auditoria,
  │                                 companies, bodegas, inventario, transferencias, health)
  ├── frontend/src/              ← lib/ (api, componentes, store, tipos) + routes/ (páginas)
  └── README.md                  ← guía operativa de Docker
Casos de uso/CU-XX/              ← evidencia visual (capturas) por CU
diagramas/                       ← diagramas del proyecto (secuencia por CU en diagramas-secuencia/CUXX/)
archivos-incremento-1/           ← artefactos del Incremento 1
docs/casos-de-uso.json           ← fuente de información de los casos de uso (lo coloca el jefe de grupo)
```

## 3. Reglas de trabajo (NO NEGOCIABLES)

1. **Siempre se trabaja sobre `dev`.** Cada tarea usa una rama propia desde `dev`
   (nombre libre, se recomienda `feat/CU-XX-descripcion`).
2. **Nunca push directo a `dev`.** Todo llega vía **Pull Request** revisada por el jefe de grupo.
3. **Un CU se implementa completo** (backend + frontend + BDD si aplica) en la misma rama.
   No hay división front/back entre personas.
4. **Un desarrollador solo trabaja en casos de uso.** Trabajar en otra cosa solo para
   arreglar bugs, o cambios del cliente que gestione el jefe de grupo.
5. **El diseño UI está cerrado.** Pantallas nuevas = mismos patrones; NO rediseñar.
6. **Los diagramas y documentación se actualizan a la par del código** del CU.
7. **CU + sus restricciones/excepciones se implementan juntos.**

## 4. Documentación (leer según la tarea)

| Documento | Cuándo |
|-----------|--------|
| `docs/README.md` | Siempre (índice + decisiones clave). |
| `docs/01-flujo-de-trabajo.md` | **Siempre.** Proceso, ramas/PR, DoD, formato de diagramas. |
| `docs/07-guia-implementacion-cu.md` | Al implementar un caso de uso. |
| `docs/02-arquitectura.md` | Para entender el stack y Docker. |
| `docs/03-base-de-datos.md` | Si el CU toca esquema/entidades. |
| `docs/04-frontend/` (diseno, componentes, api, rutas) | Para cualquier cambio de frontend. |
| `docs/05-backend/` (por módulo) | Para cualquier cambio de backend. |
| `docs/06-casos-de-uso-implementados.md` | Estado CU-01..46 y mapa CU→módulos/rutas. |

Regla: **antes de tocar código para un CU**, lee `docs/01-flujo-de-trabajo.md` y el módulo
backend/frontend que interviene.

## 5. Fuente de información de los casos de uso

`docs/casos-de-uso.json` (lo coloca el jefe de grupo). Es de **solo lectura**:
la especificación de los CUs (flujo + restricciones/excepciones). Cada tarea = un CU + sus
restricciones. No modificar este archivo.

## 6. Convenciones técnicas críticas (resumen)

- **Backend:** todos los endpoints protegidos usan `@UseGuards(AuthGuard('jwt'), RolesGuard)`
  + `@Roles(...)`. Auditoría vía `AuditoriaService.create(...)` en toda mutación.
  Aislamiento por empresa: `CompanyIsolationGuard` solo en `inventario`; el resto lo maneja
  manualmente el service con `esSuperusuario`. Prefijo global `/api`.
- **TypeORM `synchronize: false`:** nuevas columnas/tablas se declaran en
  `codigo/backend-inventario/scripts/migrar.ts` (sentencias `IF NOT EXISTS`) + `database/init.sql`.
- **Inventario:** el catálogo bifurca según `requiereSerialNumber` (`true` → `unidad_equipo`,
  `false` → `stock_consumible`). Máquina de estados de unidades con 6 estados literales
  (con tildes) que deben coincidir exacto front/back.
- **Transferencias:** el estado vive en `movimiento_inventario.tipo_movimiento`
  (`TRANSFERENCIA_PENDIENTE/APROBADA/RECHAZADA`); solo `SUPERUSUARIO` aprueba/rechaza.
- **Empresas:** constante `EMPRESAS` en `codigo/backend-inventario/src/companies/companies.service.ts`
  (NO es una tabla gestionada).
- **Frontend:** sin SSR/loaders; toda página carga con `onMount` vía `frontend/src/lib/api/`
  (nunca `fetch` directo). El token se inyecta solo en `client.ts`. Seguridad real en backend;
  el front solo oculta elementos por rol.

## 7. Verificación antes de PR

```bash
# Backend
cd codigo/backend-inventario && npm run lint && npm run build
# Frontend
cd ../frontend && npm run check && npm run build
```

Levantar la app: ver `codigo/README.md` (Docker) o modo dev (`02-arquitectura.md` §4).

## 8. Mensajes de commit sugeridos

```
feat(CU-47): registrar cliente en el sistema
fix(CU-12): corregir cierre de sesión por inactividad
```
