# Frontend — Convenciones y estructura

**Carpeta:** `codigo/frontend/`

## 1. Stack

- **SvelteKit** + **Svelte 5** (runas: `$state`, `$props`, `$derived`, `$effect`, `$bindable`).
  No se usan slots clásicos, se usan **snippets** (`{@render children?.()}`).
- **Tailwind CSS v4** (plugin `@tailwindcss/vite`) con tokens en `src/app.css` (`@theme`).
- **Iconos:** `@lucide/svelte`.
- **Producción:** `@sveltejs/adapter-node` (servidor Node, puerto 3000).
- **Dev:** Vite en `:5173`, proxy `/api` → `http://localhost:3003`.

## 2. Reglas transversales (respetar siempre)

1. **No hay SSR/loaders.** Ninguna página usa `+page.ts`/`+server.ts`. Todo se carga **client-side**
   con `onMount` y las funciones de `src/lib/api/index.ts`. **Nunca uses `fetch` directo** en una página.
2. **La conexión a la API pasa siempre por `$lib/api`**: el token se inyecta solo en
   `client.ts` y un 401 dispara logout + redirect a `/login`.
3. **Seguridad de roles:** el frontend solo *oculta* botones/menús según `userRoles`; el backend
   es quien realmente valida. No confíes en el front para seguridad.
4. **Los estados literalales deben coincidir exacto con el backend** (p. ej.
   `'En bodega'`, `'Asignado a técnico'`). Ver `src/lib/types/index.ts` → `EstadoUnidad`.
5. **El diseño actual es definitivo.** Pantallas nuevas = mismos patrones (ver `04-frontend/diseno.md`).
6. **Cada página tiene:**
   - Cabecera con `h1` + botones de acción.
   - Filtros (SearchInput + selects) con `$effect` que recarga.
   - `loading` / `EmptyState` / tabla manual / errores en banner rojo.
   - Modales para formularios y `ConfirmDialog` para acciones destructivas.

## 3. Índice de documentos

| Documento | Contenido |
|-----------|-----------|
| [diseno.md](./diseno.md) | Design system, tokens, convenciones de UI (obligatorio para pantallas nuevas). |
| [componentes.md](./componentes.md) | Componentes reutilizables y su API de props. |
| [api.md](./api.md) | Cliente HTTP, funciones por dominio, store de auth y tipos. |
| [rutas.md](./rutas.md) | Páginas existentes, qué CU cubren y qué endpoints usan. |

## 4. Comandos

```bash
cd codigo/frontend
npm install
npm run dev            # dev en :5173
npm run check          # svelte-check + typescript (usar antes de PR)
npm run build          # build de producción
```

## 5. Cómo navegar el código para un CU nuevo

1. Abre `04-frontend/rutas.md` y busca la página más parecida al flujo que toca tu CU.
2. Copia su estructura (`onMount(load)` + `$effect` de filtros + tabla manual + Modal).
3. Agrega la función API en `src/lib/api/index.ts` (tipada) y los tipos en `src/lib/types/index.ts`.
4. Mantén los patrones de diseño de `diseno.md`; NO rediseñes.
5. Agrega los nuevos estados/acciones al `Sidebar` solo si el CU agrega una sección nueva de menú
   (y coordina con el jefe de grupo, porque cambia el árbol de navegación).
