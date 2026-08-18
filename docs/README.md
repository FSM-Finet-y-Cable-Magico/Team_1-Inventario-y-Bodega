# Sistema de Inventario y Bodega — Documentación para el equipo de desarrollo

> **Propósito:** esta documentación existe para que cualquier desarrollador (humano o agente de IA)
> pueda **incorporar los casos de uso restantes** al sistema fullstack de la misma forma en que ya se
> incorporaron los primeros 46, sin necesidad de "descifrar" el código desde cero.

**Proyecto:** Sistema de inventario y bodega para ISP (Finet / Cable Mágico)
**Stack:** Frontend SvelteKit (Svelte 5) · Backend NestJS (TypeORM) · Base de datos PostgreSQL
**Avance:** ~46 de 96 casos de uso implementados (Incremento 1: CU-01 a CU-46).

---

## Cómo usar esta documentación (orden de lectura recomendado)

| Orden | Documento | Qué vas a aprender |
|-------|-----------|--------------------|
| 1 | [01-flujo-de-trabajo.md](./01-flujo-de-trabajo.md) | **El proceso**: cómo se trabaja, ramas, PR, y los pasos exactos para implementar un caso de uso. **LÉELO PRIMERO.** |
| 2 | [02-arquitectura.md](./02-arquitectura.md) | Arquitectura fullstack (Nginx → Frontend/Backend → PostgreSQL), cómo levantar el sistema con Docker. |
| 3 | [03-base-de-datos.md](./03-base-de-datos.md) | El esquema de la base de datos, entidades, migraciones y datos de prueba. |
| 4 | [04-frontend/README.md](./04-frontend/README.md) | Convenciones del frontend, páginas existentes, componentes y design system. |
| 5 | [05-backend/README.md](./05-backend/README.md) | Convenciones del backend, módulos existentes, endpoints y reglas de negocio. |
| 6 | [06-casos-de-uso-implementados.md](./06-casos-de-uso-implementados.md) | Estado actual: qué CU ya están hechos y dónde vive cada uno. |
| 7 | [07-guia-implementacion-cu.md](./07-guia-implementacion-cu.md) | **Checklist paso a paso** para implementar un caso de uso nuevo (front + back). |
| 8 | [08-roadmap.md](./08-roadmap.md) | **Estado de los 96 casos de uso** (implementado / en progreso / pendiente). **Se actualiza en cada avance.** |

> **Regla de oro:** antes de tocar código para un caso de uso, lee al menos
> `01-flujo-de-trabajo.md` y el módulo del backend/frontend que toca el CU.
> Los agentes de IA deben usar esta documentación como fuente de contexto junto con el
> archivo JSON de casos de uso (ver `01-flujo-de-trabajo.md` → "El archivo JSON de casos de uso").

---

## Contenido del repositorio (mapa)

```
Team_1-Inventario-y-Bodega/
├── docs/                        ← ESTA documentación (+ casos-de-uso.json y 08-roadmap.md)
├── codigo/                      ← EL SISTEMA (fullstack)
│   ├── docker-compose.yml       ← Orquestación: db + backend + frontend + nginx
│   ├── database/init.sql        ← Esquema SQL inicial (se ejecuta al primer arranque)
│   ├── nginx/nginx.conf         ← Proxy único (puerto 80): /api/* → backend, /* → frontend
│   ├── backend-inventario/      ← Backend NestJS (API REST en /api)
│   │   └── src/                 ← módulos: auth, usuarios, roles, auditoria,
│   │                                companies, bodegas, inventario, transferencias, health
│   └── frontend/                ← Frontend SvelteKit (SPA, fetch client-side)
│       └── src/
│           ├── lib/             ← componentes, api client, store auth, tipos
│           └── routes/          ← páginas
├── Casos de uso/                ← Evidencia visual (capturas) por CU implementado
│   └── CU-XX/ (Correcto.png, Excepcion*.png)
├── diagramas/                   ← Diagramas del proyecto
│   ├── arbol-navegacion/        ← Navegación de la UI (draw.io)
│   ├── diagrama-clases/         ← Clases backend (PlantUML + README)
│   ├── diagrama-componentes/    ← Componentes / arquitectura
│   ├── diagrama-despliegue/     ← Infraestructura
│   ├── diagrama_mere/           ← Modelo Entidad-Relación (Chen)
│   ├── diagrama_modelo_fisico/  ← Modelo físico de la BDD
│   └── diagramas-secuencia/     ← Un subfolder CUXX/ por CU (flujo normal + excepciones)
└── archivos-incremento-1/       ← Artefactos del Incremento 1 (esquema BDD, reparto, avance)
```

---

## Reglas generales del equipo (no negociables)

1. **Siempre se trabaja sobre `dev`.** Cada desarrollador crea su propia rama desde `dev`
   (el nombre de la rama es libre, p. ej. `feat/CU-47-registrar-cliente`).
2. **Nunca se hace commit/push directo a `dev`.** La integración se hace siempre vía
   **Pull Request** hacia `dev`, revisada y aprobada por el jefe de grupo.
3. **El jefe de grupo administra las PR** y valida que la implementación sea correcta.
4. **Los desarrolladores NO se dividen el trabajo entre front y back.** Cada caso de uso
   se implementa completo (backend + frontend + BDD si hace falta) en su rama.
5. **Un desarrollador solo trabaja en casos de uso.** Trabajar en otra cosa que no sea un
   caso de uso está reservado para:
   - Arreglar bugs o cosas que salieron mal, o
   - Cambios que pida el cliente (que gestiona el jefe de grupo).
6. **El diseño UI está cerrado.** No hay que cambiar cómo se ve el sistema. Cualquier
   pantalla nueva debe seguir las guidelines actuales (ver `04-frontend/diseno.md`).
7. **Los diagramas y archivos de documentación se actualizan a la par del código**:
   se crean/actualizan mientras se programa el CU (no al final).
8. **Un caso de uso se trabaja junto con sus restricciones/excepciones** (CU + CU restricción).
9. **El roadmap (`docs/08-roadmap.md`) se actualiza en cada avance.** Al terminar (o empezar) un
   CU, cada desarrollador marca su estado ahí (pendiente → en progreso → implementado).

---

## Decisiones clave ya tomadas (contexto para no romper nada)

- **Empresas:** solo existen 2 (Finet id=1 y Cable Mágico id=2). Están **hardcodeadas** en una
  constante `EMPRESAS` del backend (`codigo/backend-inventario/src/companies/companies.service.ts`),
  NO son una tabla que se gestione. No las conviertas en entidad sin avisar al jefe de grupo.
- **Doble vía de inventario:** un ítem del catálogo con `requiereSerialNumber = true` se registra
  como **unidad individual** (tabla `unidad_equipo`); con `false` es un **consumible por cantidad**
  (tabla `stock_consumible`). Esta distinción atraviesa todo el sistema.
- **Máquina de estados de unidades:** hay 6 estados con transiciones válidas estrictas
  (`En bodega → Asignado a técnico / En préstamo externo / Dado de baja`, etc.). El backend valida
  la transición; el frontend replica la misma máquina para la UI.
- **Los estados de transferencia viven en `movimiento_inventario.tipo_movimiento`**
  (`TRANSFERENCIA_PENDIENTE / _APROBADA / _RECHAZADA`), no en la cabecera `transferencia_equipo`.
- **Solo un `SUPERUSUARIO` puede aprobar/rechazar transferencias.**
- **Aislamiento por empresa:** cada usuario ve solo su empresa. Cada módulo lo implementa a su
  manera (ver `05-backend/README.md` → "Aislamiento de empresa"). Respeta el patrón de cada módulo.

---

## Documentos relacionados (fuera de `docs/`)

- `codigo/README.md` — guía operativa para levantar el sistema con Docker.
- `archivos-incremento-1/reparto-commits-equipo-inventario.md` — división del Incremento 1 por
  bloques (referencia histórica del cómo se organizó el trabajo).
- `archivos-incremento-1/esquema-bdd-incremento1.sql` — versión evolucionada del esquema con
  más FKs (es la "versión objetivo").
- `diagramas/diagramas-secuencia/CUXX/*.puml` — **especificación de flujos**: cada CU tiene su
  diagrama de secuencia (flujo normal + excepciones) con endpoints, servicios, SQL y códigos HTTP.
- `Casos de uso/CU-XX/` — capturas de pantalla de cada flujo implementado (evidencia visual).

---

*Documentación v1 — generada con el estado actual del repositorio (46 CU implementados).*
*Si un CU nuevo requiere un cambio de arquitectura o de diseño, detener la implementación y
consultar al jefe de grupo.*
