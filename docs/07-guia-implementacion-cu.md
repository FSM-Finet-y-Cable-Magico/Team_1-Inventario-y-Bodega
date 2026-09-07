# Guía práctica — Cómo implementar un caso de uso nuevo (paso a paso)

> Esta guía es el **recetario** para agregar un CU (con sus restricciones) al sistema, igual como
> se hizo con CU-01..CU-46. Léela junto con `01-flujo-de-trabajo.md`.

---

## Fase 0 — Preparación

1. **Entiende el CU** (del JSON de casos de uso que entrega el jefe de grupo):
   - Lee el flujo normal y **cada restricción/excepción**.
   - Identifica los roles que participan.
   - Busca en `diagramas/diagramas-secuencia/` si hay un CUXX similar como referencia de formato.
2. **Identifica qué módulo del backend y qué página del frontend toca** (usa la tabla de
   `06-casos-de-uso-implementados.md` y el árbol de navegación).
3. **Busca el CU más parecido ya implementado** y úsalo como plantilla (p. ej. si es un CRUD de
   una entidad nueva, copia la estructura de `bodegas` o `catalog`).
4. Crea (o reutiliza) tu **rama única de trabajo** desde `dev`:
   ```bash
   git checkout dev && git pull origin dev
   git checkout -b feat/<nombre>-cus   # solo la primera vez; después reutiliza la misma
   ```
   > Cada desarrollador acumula sus CUs en UNA sola rama propia; no se abre rama ni PR por ticket.

## Fase 1 — Base de datos (si el CU agrega datos)

1. Entidad TypeORM en `backend-inventario/src/<modulo>/entities/`.
   - `@Entity('nombre_tabla')`, columnas con nombre snake_case en BD.
   - Si reutiliza tablas existentes, revisa `03-base-de-datos.md` (pivote serializado/consumible,
     máquina de estados, etc.).
2. Registrar la entidad en el módulo: `TypeOrmModule.forFeature([NuevaEntidad])`.
3. Migración idempotente en `backend-inventario/scripts/migrar.ts`:
   ```ts
   `ALTER TABLE <tabla> ADD COLUMN IF NOT EXISTS <columna> <tipo>` // o CREATE TABLE IF NOT EXISTS
   ```
4. Actualizar `database/init.sql` (y si aplica `esquema-bdd-incremento1.sql`).
5. Aplicar: reiniciar el contenedor backend o `cd backend-inventario && npm run migrar`.

## Fase 2 — Backend (NestJS)

1. **DTOs** en `<modulo>/dto/` con class-validator y mensajes en español.
   (Seguir el estilo del módulo: algunos validan en service en vez de DTO, como transferencias.)
2. **Service:** implementar la lógica del CU + restricciones. Convenciones:
   - Excepciones: `BadRequestException` (validación), `ConflictException` (duplicado),
     `NotFoundException` (no existe / 404 genérico cross-empresa), `ForbiddenException`
     (permisos/empresa), `UnauthorizedException` (credenciales).
   - **Auditoría** con `AuditoriaService.create(...)` en toda mutación relevante.
   - **Aislamiento de empresa** según el patrón del módulo (guard o manual con `esSuperusuario`).
   - Transacciones con `QueryRunner` si hay múltiples escrituras.
3. **Controller:**
   ```ts
   @UseGuards(AuthGuard('jwt'), <RolesGuard|CompanyIsolationGuard>)
   @Roles('ADMIN', 'SUPERUSUARIO')
   ```
   - Rutas REST en español consistentes (`/api/<recurso>`, plural).
   - `req.user` trae `{ id_usuario, nombre_usuario, id_empresa, roles }` (o usa `@CurrentUser()`).
4. **Módulo:** registrar en `app.module.ts` si es nuevo.
5. **Comprobar** que las respuestas usan los nombres de campo que espera el frontend
   (los consumibles usan `es_consumible`, las unidades `numero_serie`, etc. — ver entidades).

## Fase 3 — Frontend (SvelteKit)

1. **Tipos** en `frontend/src/lib/types/index.ts` (mismos nombres de campo del backend).
2. **Función API** en `frontend/src/lib/api/index.ts` (tipada, vía `api.get/post/patch/delete/download`).
3. **Página/s** en `frontend/src/routes/`:
   - Copia el patrón de una página existente (ver `04-frontend/rutas.md`): `onMount(load)` +
     filtros + tabla manual + Modal + ConfirmDialog + EmptyState + banners de error.
   - Sigue el design system de `04-frontend/diseno.md` (tokens, cabecera, filtros, badges).
   - Oculta botones por rol con `userRoles` / `hasRole(...)`.
   - Estados/acciones: respeta los literales exactos (`'En bodega'`, `TRANSFERENCIA_PENDIENTE`, etc.).
4. **Sidebar:** agregar ítem de menú solo si el CU crea una sección nueva (coordinar con el jefe).

## Fase 4 — Verificación

```bash
# Backend
cd codigo/backend-inventario
npm run lint
npm run build
# Frontend
cd ../frontend
npm run check
npm run build
```

- Levanta la app (Docker o `npm run dev` + `npm run start:dev`) y prueba **flujo normal + cada
  excepción** (usa las capturas de `Casos de uso/` de CUs similares como referencia visual).
- Verifica la auditoría (login, acciones, accesos denegados) y el aislamiento por empresa.

## Fase 5 — Documentación y diagramas (a la par)

- Agrega fila en `docs/06-casos-de-uso-implementados.md`.
- Actualiza el estado del CU en `docs/08-roadmap.md` (pendiente → implementado).
- Actualiza el doc del módulo tocado en `docs/05-backend/` o `docs/04-frontend/`.
- Crea los diagramas de secuencia en `diagramas/diagramas-secuencia/CUXX/`
  (`CUXX-normal.puml` + `CUXX-exc-*.puml`, formato de `01-flujo-de-trabajo.md` §5) y
  **renderízalos a PNG** (`plantuml -tpng <archivo>.puml`); commitea siempre .puml + .png juntos.
- Agrega capturas en `Casos de uso/CU-XX/` (`Correcto*.png`, `Excepcion*.png`).

## Fase 6 — Pull Request

1. `git fetch origin && git merge origin/dev`
2. Correr validaciones (Fase 4).
3. Revisar el diff (`git diff origin/dev...HEAD`) — que solo toque lo necesario.
4. Commit con mensaje tipo `feat(CU-47): <descripción>` (un commit por CU en la rama única).
5. `git push origin feat/<nombre>-cus`
6. Al cierre del lote de CUs: abrir PR hacia `dev` describiendo los CUs incluidos + restricciones
   cubiertas, endpoints/páginas tocados y cómo probar. El jefe de grupo revisa y aprueba el merge.

---

## Resumen rápido (anti-errores)

- ✅ Trabaja **CU + restricciones**, front + back juntos.
- ✅ Usa `@Roles` + guards en todo endpoint protegido; audita mutaciones y accesos denegados.
- ✅ Mensajes de error en español, estilo del código existente.
- ✅ Nuevas columnas → `migrar.ts` (+ `init.sql`), nunca `synchronize`.
- ✅ Consumibles vs. serializados → respeta el pivote `requiereSerialNumber`.
- ✅ Diseño UI → copia los patrones actuales, NO rediseñes.
- ✅ Todo `.puml` se renderiza a PNG (`plantuml -tpng`) y se commitea (.puml + .png).
- ✅ Solo se trabaja en casos de uso; bugs/cambios de cliente los administra el jefe de grupo.
- ✅ UNA rama propia por desarrollador (no una por ticket); merge a dev vía PR al cierre del lote.
- ❌ No hacer push directo a `dev`.
- ❌ No cambiar reglas de negocio existentes (estados, roles, transferencias, empresas) sin consultar.
