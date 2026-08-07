# Frontend — Design system y guidelines de UI

> **IMPORTANTE:** el diseño actual del sistema está **cerrado y validado**. Los casos de uso
> nuevos deben reutilizar estos patrones **exactamente como están**. No rediseñar.

El diseño fue construido con las skills de agente `frontend-design`
(`anthropics/skills`) y principalmente **`ui-ux-pro-max`**
(`nextlevelbuilder/ui-ux-pro-max-skill`), fijadas en `codigo/frontend/skills-lock.json`.

---

## 1. Tokens de diseño (`src/app.css` → `@theme`)

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-primary` | `#334155` (slate-700) | títulos, textos principales, focus ring |
| `--color-primary-light` | `#475569` | acento secundario de texto |
| `--color-accent` | `#059669` (emerald-600) | botones primarios, links, logo |
| `--color-accent-hover` | `#047857` | hover de botón primario |
| `--color-destructive` | `#dc2626` (red-600) | errores, peligro |
| `--color-destructive-hover` | `#b91c1c` | hover destructivo |
| `--color-surface` | `#f8fafc` | fondo de página |
| `--color-surface-alt` | `#f1f5f9` | hovers, inputs disabled, headers de tabla |
| `--color-border` | `#e2e8f0` | bordes |
| `--color-muted` | `#94a3b8` | texto secundario |
| `--color-foreground` | `#0f172a` (slate-900) | texto principal |

`body`: fondo `surface`, texto `foreground`, fuente `'Inter', system-ui, sans-serif`.
Los tokens se usan en Tailwind como `bg-accent`, `text-foreground`, `border-border`, `text-muted`,
`bg-surface`, `bg-surface-alt`, `text-destructive`, `ring-primary`, etc.

## 2. Layout general de la app

- **Shell autenticado** (`+layout.svelte`): `Sidebar` (240px, colapsable a 60px) + `Header`
  (con campana de notificaciones y usuario) + `<main class="flex-1 overflow-y-auto p-6">`.
- **Página de listado:** contenedor `<div class="max-w-6xl mx-auto">`.
- **Página de detalle/edición:** `max-w-3xl` o `max-w-4xl`.

## 3. Patrón de cabecera de página

```svelte
<div class="flex items-center justify-between mb-6">
  <h1 class="text-xl font-bold text-foreground">Título</h1>
  <div class="flex items-center gap-2">
    <Button variant="secondary" onclick={load}>Actualizar</Button>
    <Button onclick={abrirNuevo}>Nuevo X</Button>
  </div>
</div>
```

## 4. Fila de filtros

`SearchInput` (con `flex-1 max-w-xs`) + selects y fechas con clase:

```
px-3 py-2 border border-border rounded-md text-sm
focus:outline-none focus:ring-2 focus:ring-primary bg-white
```

## 5. Tablas (patrón manual; NO usar `DataTable`)

Todas las tablas del sistema están escritas **a mano** con el mismo HTML/Tailwind (el componente
`DataTable` existe pero no se usa). Copiar este patrón:

```svelte
<div class="bg-white rounded-lg border border-border overflow-hidden">
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-border bg-surface/50">
          <th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Col</th>
        </tr>
      </thead>
      <tbody>
        {#each items as item, i (item.id)}
          <tr class="{i % 2 === 0 ? 'bg-white' : 'bg-surface/30'} border-b border-border">
            <td class="px-4 py-3 text-foreground">{item.col ?? '-'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
```

- Zebra: `{i % 2 === 0 ? 'bg-white' : 'bg-surface/30'}`.
- Botones de acción de fila: iconos `h-4 w-4` con `p-1.5 rounded-md hover:bg-surface-alt
  text-muted hover:text-foreground` (destructivo: `hover:bg-red-50 hover:text-destructive`).
- Fila clicable: `cursor-pointer hover:bg-surface/50` + `onclick={() => goto(...)}`.

## 6. Formularios en modales

- Modal base: componente `Modal` (`max-w-lg`, `max-h-[90vh] overflow-y-auto`, `z-50`).
- Cada campo envuelto en `FormField` (label + control como snippet + error/helper).
- Inputs:
  ```
  w-full px-3 py-2 border border-border rounded-md text-sm
  focus:outline-none focus:ring-2 focus:ring-primary
  disabled:bg-surface-alt disabled:text-muted
  ```
- Botones del modal: `Button` primaria "Guardar" (con `loading`) + `Button variant="secondary"` "Cancelar".

## 7. Banners de estado

| Tipo | Clases |
|------|--------|
| Error | `bg-red-50 border border-red-200 text-destructive` |
| Éxito | `bg-emerald-50 border border-emerald-200 text-emerald-700` |
| Aviso | `bg-amber-50 border border-amber-200 text-amber-800` |
| Info | `bg-blue-50 border border-blue-200 text-blue-700` |

## 8. Badges de estado

Usar `<Badge variant={...}>`. Variantes y colores:
`default` (gris) · `success` (esmeralda) · `warning` (ámbar) · `danger` (rojo) · `info` (azul).
Mapeos típicos ya usados: usuario `activo`→success / `inactivo`→danger; unidad `En bodega`→info,
`En revisión`→warning, `Dado de baja`→danger, etc.

## 9. Estados de carga y vacío

- **Carga:** filas esqueleto `animate-pulse` (`bg-surface-alt rounded`) o texto "Cargando...".
- **Vacío:** componente `EmptyState` (con `action`/`actionlabel` opcionales para "Crear X").
- Condicional estándar: `{#if loading} ... {:else if data.length === 0} <EmptyState/> {:else} <tabla> {/each}`.

## 10. Fechas

```js
d.toLocaleDateString('en-GB', { timeZone: 'America/Santiago' })          // DD/MM/YYYY
d.toLocaleString('en-GB', { timeZone: 'America/Santiago' })              // con hora
```

## 11. Roles y visibilidad

Los `$derived` sobre `userRoles` (`get(userRoles)`, `hasRole('SUPERUSUARIO')`) controlan la
visibilidad de botones y columnas. Convenciones usadas:
- `esSuperusuario` → ver columnas de empresa, editar empresa al crear, aprobar/rechazar transferencias.
- `puedeCrearX` / `puedeEditarX` → solo `SUPERUSUARIO`, `ADMIN`, `ADMIN_BODEGA` (TECNICO_TERRENO solo lectura).

## 12. Checklist visual antes de dar un CU por terminado

- [ ] Usa los tokens de `@theme` (nada de colores hardcodeados fuera de estos).
- [ ] Sigue el patrón de listado/cabecera/filtros/tabla/modal de las páginas existentes.
- [ ] Estado loading, EmptyState y banner de error.
- [ ] Botones ocultos por rol según corresponda.
- [ ] Fechas con `America/Santiago`, formato DD/MM/YYYY.
- [ ] No introduce componentes nuevos si existe uno equivalente en `lib/components/`.
