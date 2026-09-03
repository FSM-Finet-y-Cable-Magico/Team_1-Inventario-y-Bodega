# Flujo de trabajo — Cómo se implementan los casos de uso

Este documento es la **fuente de verdad del proceso**. Un desarrollador (o agente de IA) debe
seguir estos pasos exactamente para incorporar un caso de uso al sistema.

---

## 1. El modelo de trabajo

- **Rama de integración:** `dev` (siempre).
- **Cada desarrollador** crea su propia rama de trabajo desde `dev`. El nombre es libre,
  pero se recomienda `feat/CU-XX-descripcion` (p. ej. `feat/CU-47-registrar-cliente`).
- **Nunca se trabaja directo sobre `dev`.** Nadie hace push a `dev` desde su máquina.
- **Todo cambio llega a `dev` vía Pull Request (PR).**
- **El jefe de grupo** revisa y aprueba las PR, y valida que la implementación sea correcta.
  Es quien resuelve conflictos de merge que él considere.
- No existe una rama `main` de desarrollo activo: el trabajo diario es sobre `dev`.

```
dev  ──────────────────────────────────────────────────────────►
      ▲              ▲              ▲
      │ PR #3        │ PR #2        │ PR #1        (revisadas por el jefe)
      │              │              │
   rama propia    rama propia    rama propia   (cada desarrollador)
   (CU-50)        (CU-49)        (CU-48)
```

### Comandos base

```bash
# 1. Actualizar dev y crear rama propia
git checkout dev
git pull origin dev
git checkout -b feat/CU-47-registrar-cliente

# 2. Implementar (front + back + BDD si aplica)
#    ...trabajo...

# 3. Commit y push de la rama
git add .
git commit -m "feat(CU-47): registrar cliente en el sistema"
git push origin feat/CU-47-registrar-cliente

# 4. Abrir la PR hacia dev (con gh o desde GitHub)
gh pr create --base dev --head feat/CU-47-registrar-cliente \
  --title "feat(CU-47): registrar cliente" \
  --body "Implementa CU-47 + restricciones. Detalle: ..."
```

> Si un commit es rechazado por hooks, se corrige y se hace **un commit nuevo**; no se
> reescribe el commit fallido salvo que el jefe lo autorice.

---

## 2. El archivo JSON de casos de uso (fuente de información)

La **fuente base de información** de lo que hay que implementar es un **archivo JSON con todos
los casos de uso** del proyecto, ubicado en **`docs/casos-de-uso.json`** (lo coloca el jefe de grupo).

1. **No modifiques el JSON.** Es de solo lectura; es la especificación.
2. Cada tarea de un desarrollador = **un caso de uso** (normalmente se trabaja el CU **junto con
   sus restricciones/excepciones**).
3. El estado de avance de cada CU se refleja en **`docs/08-roadmap.md`** (ver sección 5).

Formato esperado (referencial, puede variar): una lista de objetos con al menos los campos
`codigo` (ej. `CU-47`), `nombre`, `descripcion`/`flujo_principal`, y `restricciones`/`excepciones`.

### Cómo usarlo para implementar

1. Lee el CU y sus restricciones del JSON.
2. Identifica qué módulos del backend y qué páginas del frontend intervienen (usa los
   diagramas de secuencia de `diagramas/diagramas-secuencia/CUXX/` como especificación técnica).
3. Implementa **CU + restricciones** en ambos lados (front y back).
4. Verifica manualmente el flujo y cada excepción (idealmente con las capturas de
   `Casos de uso/` como referencia de lo que debe verse).
5. Actualiza la documentación y diagramas **a la par del código** (ver sección 5).

---

## 3. Reglas de qué se puede (y no se puede) hacer

| Situación | ¿Se puede implementar? |
|-----------|------------------------|
| Un caso de uso que le toque al desarrollador (CU + restricciones) | **Sí**, front + back + BDD. |
| Arreglar un bug o algo que salió mal en el sistema | **Sí**, como tarea aparte. |
| Cambio pedido por el cliente | Solo lo gestiona el jefe de grupo. |
| Cambiar el diseño / look & feel de la UI | **No** (el diseño actual es definitivo). |
| Refactor de arquitectura, migrar empresa hardcodeada a tabla, etc. | **No** sin consultar al jefe de grupo. |
| Cambiar reglas de negocio que ya existen (estados, roles, transferencias) | **No** sin consultar al jefe de grupo. |

---

## 4. Definición de "Hecho" (Definition of Done) para un CU

Un caso de uso está terminado cuando:

- [ ] **Backend:** endpoints del CU implementados en el módulo correcto de NestJS, con:
  - Guardas `@UseGuards(AuthGuard('jwt'), RolesGuard)` + `@Roles(...)` (según el módulo).
  - Validación de restricciones con las excepciones HTTP correctas
    (`BadRequestException`, `ConflictException`, `NotFoundException`, `ForbiddenException`,
    `UnauthorizedException`).
  - Auditoría en `log_auditoria` para las mutaciones relevantes.
  - Aislamiento por empresa según el patrón del módulo.
- [ ] **Base de datos:** si se agregan columnas/tablas, se agregan a:
  - `codigo/backend-inventario/scripts/migrar.ts` (sentencia `ADD COLUMN IF NOT EXISTS`) si es
    sobre tablas existentes, o al esquema si es tabla nueva.
  - Idealmente también `codigo/database/init.sql` y/o `archivos-incremento-1/esquema-bdd-incremento1.sql`.
- [ ] **Frontend:** la página/s funcionales del CU, con:
  - Funciones en `frontend/src/lib/api/index.ts` + tipos en `frontend/src/lib/types/index.ts`.
  - UI siguiendo los patrones y el design system actuales (`04-frontend/diseno.md`).
  - Botones/acciones ocultos por rol según `userRoles` (el backend igualmente valida).
- [ ] **Verificación:** `npm run build` y `npm run lint` en backend; `npm run check` y
  `npm run build` en frontend. Prueba manual del flujo normal + cada excepción.
- [ ] **Documentación y diagramas actualizados a la par del código** (ver sección 5).
- [ ] **PR hacia `dev`** abierta, con descripción clara del CU, archivos tocados y cómo probarlo.

---

## 5. Documentación y diagramas: se crean a la par del código

Los diagramas y archivos de documentación **no se hacen "después"**: se crean/actualizan
**mientras se está programando** el CU. Esto mantiene al día:

- `docs/06-casos-de-uso-implementados.md` — agregar el CU nuevo a la lista de implementados.
- `docs/08-roadmap.md` — **actualizar el estado del CU** (pendiente → en progreso → implementado,
  con rama/PR). Esta actualización es obligatoria en cada avance, no solo al final.
- `docs/` módulos tocados (endpoints, entidades, páginas) si el CU agrega algo nuevo.
- `diagramas/diagramas-secuencia/CUXX/` — agregar `CUXX-normal.puml` y `CUXX-exc-*.puml`
  (mismo formato de los existentes, ver `06-casos-de-uso-implementados.md` → formato PlantUML).
- `Casos de uso/CU-XX/` — capturas del flujo correcto y de cada excepción.

**Formato de los diagramas de secuencia (PlantUML)** — replicar el patrón existente:

```plantuml
@startuml CU47-Nombre-Normal
title CU-47 — Descripción del caso de uso (flujo normal)
skinparam style strictuml
skinparam monochrome true
skinparam shadowing false
skinparam sequenceMessageAlign center
<style> sequenceDiagram { participant { Margin 35 } actor { Margin 15 } } </style>
skinparam sequence { MessageAlign center  LifeLineBorderColor black }
hide footbox

actor Usuario
participant "Vista" as V
participant "Controlador" as C
participant "Servicio" as SVC
database "postgres" as DB

Usuario -> V : <accion>
activate V
V -> C : POST /api/<ruta>
activate C
C -> SVC : <metodo>(...)
activate SVC
SVC -> SVC : <validacion/regla>
SVC -> DB : SELECT ...
DB --> SVC : row
SVC --> C : <resultado / throw XException>
C --> V : <HTTP code>
V --> Usuario : <mensaje/pantalla>
deactivate V
deactivate C
deactivate SVC
@enduml
```

Cada mensaje debe incluir el detalle técnico real: endpoint HTTP, método del servicio, SQL
aproximado y código de estado HTTP. Ver ejemplos ya renderizados en
`diagramas/diagramas-secuencia/CU01/CU01-normal.puml` y `CU24-exc-nombre-duplicado.puml`.

---

## 6. Checklist diario antes de abrir la PR

1. `git fetch origin` + `git merge origin/dev` en la rama para integrar lo último.
2. Correr las validaciones:
   ```bash
   # Backend
   cd codigo/backend-inventario && npm run lint && npm run build
   # Frontend
   cd ../frontend && npm run check && npm run build
   ```
3. Probar el CU (flujo normal + excepciones) contra la app levantada con Docker.
4. Revisar el diff: `git diff origin/dev...HEAD` para asegurar que solo tocaste lo necesario
   y no rompes otros módulos.
5. Abrir la PR hacia `dev` con una descripción que incluya: CU implementado, restricciones
   cubiertas, endpoints nuevos/afectados, páginas nuevas/afectadas, y cómo probarlo.

---

## 7. Consejos para agentes de IA

- **Contexto mínimo obligatorio antes de tocar código:** este documento + `docs/README.md` +
  el módulo del backend (`05-backend/`) y del frontend (`04-frontend/`) que toque el CU.
- **No inventes endpoints ni campos:** replica las convenciones de los módulos existentes
  (nombres, rutas, mensajes de error, formato de DTOs).
- **Los mensajes de error ya existen en el código** con textos exactos en español. Reutiliza
  el estilo (mensajes específicos por validación, mensaje genérico en login, 404 que no
  revelan existencia, etc.).
- **Cuando un CU toque stock, estados o transferencias**, revisa primero `05-backend/inventario.md`
  y `05-backend/transferencias.md`: hay máquinas de estados, transacciones y reglas de stock
  que se deben respetar.
- **El frontend hace fetch client-side siempre** (no hay loaders SSR). Toda conexión a la API
  pasa por `frontend/src/lib/api/index.ts` — nunca `fetch` directo.
