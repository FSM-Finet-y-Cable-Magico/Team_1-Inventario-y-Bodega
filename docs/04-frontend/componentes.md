# Frontend — Componentes reutilizables

Todos en `codigo/frontend/src/lib/components/`. Patrón Svelte 5: props vía `$props()`, contenido
vía **snippets** (`children`), callbacks como props (`onclick`, `onclose`, `onconfirm`).

---

## `Badge.svelte`
Etiqueta de estado/rol.

| Prop | Tipo | Default |
|------|------|---------|
| `variant` | `'default' \| 'success' \| 'warning' \| 'danger' \| 'info'` | `'default'` |
| `class: className` | `string` | `''` |
| `children` | snippet | contenido |

```svelte
<Badge variant="success">Activo</Badge>
```

## `Button.svelte`
Botón con variantes y estado de carga.

| Prop | Tipo | Default |
|------|------|---------|
| `variant` | `'primary' \| 'secondary' \| 'destructive' \| 'ghost'` | `'primary'` |
| `size` | `'default' \| 'sm' \| 'lg'` | `'default'` |
| `disabled` | `boolean` | `false` |
| `loading` | `boolean` | `false` (spinner inline) |
| `type` | `'button' \| 'submit'` | `'button'` |
| `onclick` | `((e: MouseEvent) => void) \| undefined` | `undefined` |
| `...rest` | atributos extra → `<button>` | — |

## `ConfirmDialog.svelte`
Diálogo de confirmación (destructiva o primaria).

| Prop | Tipo | Default |
|------|------|---------|
| `open` | `boolean` | `false` |
| `title` | `string` | `'Confirmar'` |
| `message` | `string` | `'¿Estás seguro?'` |
| `confirmlabel` | `string` | `'Confirmar'` |
| `cancellabel` | `string` | `'Cancelar'` |
| `variant` | `'destructive' \| 'primary'` | `'destructive'` |
| `onconfirm` | `() => void` | — |
| `oncancel` | `() => void` | — |

Cierra con Escape / clic fuera. Se usa para desactivar/eliminar, restablecer contraseña, logout.

## `DataTable.svelte` — ⚠️ existe pero NO se usa en páginas reales
Tabla genérica (`columns`, `data`, `onrowclick`). El sistema usa tablas **escritas a mano**
(ver `diseno.md` sección 5). Al implementar un CU, replica el patrón manual, no este componente.

## `EmptyState.svelte`
Estado vacío con icono.

| Prop | Tipo | Default |
|------|------|---------|
| `message` | `string` | `'No hay datos disponibles'` |
| `action` | `(() => void) \| undefined` | `undefined` |
| `actionlabel` | `string \| undefined` | `undefined` (usa `'Crear'`) |

## `FormField.svelte`
Envoltura de campo de formulario (label + control + error/helper).

| Prop | Tipo | Default |
|------|------|---------|
| `children` | snippet | el control |
| `label` | `string` | `''` |
| `name` | `string` | `''` (para `for`/ids) |
| `error` | `string` | `''` (rojo) |
| `helper` | `string` | `''` (gris) |
| `required` | `boolean` | `false` (muestra `*`) |

```svelte
<FormField label="Nombre" name="nombre" error={errores.nombre} required>
  <input type="text" name="nombre" bind:value={form.nombre} class="w-full px-3 py-2 ..." />
</FormField>
```

## `Header.svelte`
Header de la app (en `+layout.svelte`). Muestra empresa, roles, **campana de notificaciones** y
usuario. Sin props. Al abrir la campana llama a `getMyDashboard()` (bloque ad-hoc, sin estado
leída/no leída: CU-20 transferencias pendientes + CU-78 bajas pendientes + CU-46 alertas de
stock) y, si el rol lo permite, a `getNotificaciones()` (CU-96: sección separada
"Notificaciones del sistema", persistida, con `marcarNotificacionLeida()` /
`marcarTodasNotificacionesLeidas()`). El badge numérico suma ambos bloques.

## `Modal.svelte`
Modal base para formularios/detalles.

| Prop | Tipo | Default |
|------|------|---------|
| `children` | snippet | contenido |
| `open` | `boolean` | `false` |
| `title` | `string` | `''` |
| `onclose` | `() => void` | — (Escape / overlay / X) |

`max-w-lg`, `max-h-[90vh] overflow-y-auto`, `z-50`, fondo `bg-black/40`.

## `Pagination.svelte`
Paginar listas.

| Prop | Tipo | Default |
|------|------|---------|
| `page` | `number` | `1` |
| `total` | `number` | `0` |
| `limit` | `number` | `20` |
| `onpagechange` | `(p: number) => void` | — |

**Solo se usa en `auditoria` (limit 30).** El resto de listas no pagina.

## `SearchInput.svelte`
Búsqueda con debounce (300 ms).

| Prop | Tipo | Default |
|------|------|---------|
| `value` | `$bindable('')` | `''` |
| `placeholder` | `string` | `'Buscar...'` |
| `onsearch` | `((value: string) => void) \| undefined` | `undefined` |
| `maxlength` | `number \| undefined` | `undefined` |

```svelte
<SearchInput bind:value={buscar} onsearch={(v) => { buscar = v; }} placeholder="Buscar..." />
```

## `Sidebar.svelte`
Menú lateral colapsable (240px ↔ 60px). **Menú según rol** (ver tabla en `rutas.md`).
Botón "Cerrar sesión" con `ConfirmDialog` → `apiLogout('manual')` + `authStore.logout()` + `/login`.

---

## Regla general
Si tu CU necesita un control de UI nuevo (input especial, dropdown, etc.), primero verifica que no
exista algo parecido en estos componentes o en una página existente; reutiliza antes de crear.
Si creas uno, colócalo en `lib/components/` siguiendo el patrón de props/snippets de los demás.
