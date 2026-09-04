# Frontend — Rutas / páginas existentes

Todas en `codigo/frontend/src/routes/`. Sin loaders SSR; carga client-side con `onMount` + `$lib/api`.

## Menú lateral (`Sidebar`) — accesible por rol

| Ítem | Ruta | Roles |
|------|------|-------|
| Dashboard | `/dashboard` | SUPERUSUARIO, ADMIN |
| Usuarios | `/usuarios` | SUPERUSUARIO, ADMIN |
| Catálogo | `/catalogo` | SUPERUSUARIO, ADMIN, ADMIN_BODEGA |
| Unidades | `/unidades` | todos |
| Bodegas | `/bodegas` | SUPERUSUARIO, ADMIN, ADMIN_BODEGA |
| Transferencias | `/transferencias` | SUPERUSUARIO, ADMIN |
| Auditoría | `/auditoria` | SUPERUSUARIO, ADMIN |
| Reportes | `/reportes` | SUPERUSUARIO, ADMIN, ADMIN_BODEGA |

> La protección real está en el backend. El menú solo oculta ítems por rol.

## Layout y raíz

### `+layout.svelte`
- Ruta `/login` → solo `children` (sin shell).
- Con token → shell `Sidebar + Header + main`.
- Sin token y no es login → `goto('/login')`.
- **CU-11/12 — inactividad:** timer de 5 min (`INACTIVIDAD_MINUTOS = 5`), aviso a los 3 min con
  modal "Sesión por expirar" (Continuar / Cerrar sesión). Sin respuesta → `cerrarSesion('inactividad')`.
- Acepta `?token=...` en la URL (login por token): decodifica JWT, fabrica usuario mínimo,
  `authStore.login(token, usuario)` y `goto('/dashboard')`.

### `+page.svelte` (`/`)
Redirige: con token → `/dashboard`, sin token → `/login`.

## Páginas

### `/login`
- **CUs:** CU-01 (login), CU-10 (cambio obligatorio de contraseña).
- **Endpoints:** `login()`, `cambiarPassword()`.
- Validación local: usuario `^[a-z0-9_]{4,20}$`, password 8-64 con may+min+dígito. Si
  `res.debe_cambiar_password` → flujo de nueva contraseña. Mensaje genérico "Usuario o contraseña
  incorrectos." (CU-01 Excepción 1).

### `/dashboard`
- **CUs:** CU-15 (dashboard consolidado SUPERUSUARIO), CU-16 (mi dashboard), CU-46 (alertas stock).
- **Endpoints:** `getDashboard()` (SUPERUSUARIO) o `getMyDashboard()` (resto).
- KPIs: total unidades, bodegas activas, stock consumible, alertas stock mínimo, equipos por estado.

### `/usuarios`
- **CUs:** CU-04 (crear), CU-05 (listar/filtrar), CU-07 (desactivar).
- **Endpoints:** `getUsers()`, `getRoles()`, `getEmpresas()`, `createUser()`, `deleteUser()`.
- Reglas: SUPERUSUARIO ve columna Empresa y elige empresa; ADMIN solo su empresa. No desactivar la
  cuenta propia; solo SUPERUSUARIO gestiona SUPERUSUARIOS.

### `/usuarios/[id]`
- **CUs:** CU-06 (editar), CU-10 (restablecer contraseña), CU-07 (desactivar).
- **Endpoints:** `getUser(id)`, `getRoles()`, `getEmpresas()`, `updateUser()`, `restablecerPassword()`.

### `/catalogo`
- **CUs:** CU-24 (crear tipo), CU-25 (listar), CU-27 (desactivar/eliminar físico), CU-30 (descargar ficha).
- **Endpoints:** `getCatalog()`, `createCatalogItem()`, `deleteCatalogItem()`, `hardDeleteCatalogItem()`,
  `downloadFichaTecnica()`.
- Listas fijas: `categorias = ['ONT/ONU','Decodificador','Splitter','Herramienta','Consumible fibra
  óptica','Consumible conector','Consumible otro','Otro']`, `unidadesMedida = ['Unidad','Metro','Rollo']`.
- `requiereSerialNumber` decide si se pide unidad de medida (obligatoria si `false`).

### `/catalogo/[id]`
- **CUs:** CU-26 (editar tipo), CU-29 (subir/reemplazar ficha PDF), CU-30 (descargar).
- **Endpoints:** `getCatalog()` (⚠️ no existe `GET /catalogo/:id`; la página carga el catálogo y
  hace `find()` por id), `updateCatalogItem()`, `uploadFichaTecnica()`, `downloadFichaTecnica()`.

### `/unidades`
- **CUs:** CU-28 (registrar unidad/consumible), CU-31 (ingresar consumible), CU-32 (registrar unidad).
- **Endpoints:** `getUnits()`, `getCatalog({activo:true})`, `getWarehouses({activa:true})`,
  `createUnit()`, `ingresarConsumible()`, `updateConsumible()`.
- El tipo seleccionado decide el formulario (serializado vs. consumible). Consumibles marcados
  `es_consumible`. TECNICO_TERRENO es solo lectura.

### `/unidades/[id]`
- **CUs:** CU-33 (ficha), CU-34 (editar datos), CU-35 (cambio de estado), CU-36 (historial + observaciones),
  CU-37 (historial con usuario/empresa), CU-38/39 (garantía), CU-40 (diagnóstico en revisión).
- **Endpoints:** `getUnit(id)`, `getUnitHistory(serialNumber)`, `getWarehouses()`, `updateUnit()`,
  `changeUnitState()`.
- Máquina de transiciones replicada en el front (ver `03-base-de-datos.md`).

### `/bodegas`
- **CUs:** CU-41 (crear con responsable), CU-42 (desactivar), CU-44 (listado con stock).
- **Endpoints:** `getWarehouses()`, `getUsers({activo:true})`, `getEmpresas()`, `createWarehouse()`,
  `deactivateWarehouse()`.
- Vista en **tarjetas** (no tabla). Responsable obligatorio; SUPERUSUARIO elige empresa.

### `/bodegas/[id]`
- **CUs:** CU-42 (editar), CU-45 (stock por tipo/estado), CU-46 (umbral mínimo).
- **Endpoints:** `getWarehouse(id)`, `getWarehouseStock(id)`, `getCatalog()`, `getUsers()`,
  `updateWarehouse()`, `setStockThreshold()`.

### `/transferencias`
- **CUs:** CU-20 (crear transferencia + notificación), CU-21 (detalle), CU-22 (rechazar), CU-23 (listar/filtrar).
- **Endpoints:** `getTransfers()`, `getWarehouses()`, `getUnits()`, `getEmpresas()`,
  `getWarehousesByEmpresa()`, `createTransfer()`, `getTransferDetail()`, `approveTransfer()`,
  `rejectTransfer()`.
- Aprobar/rechazar: botones solo para `SUPERUSUARIO`. Empresa origen = empresa del usuario (inmutable).
- Estados backend `TRANSFERENCIA_PENDIENTE | _APROBADA | _RECHAZADA` → labels Pendiente/Aprobada/Rechazada.

### `/auditoria`
- **CUs:** CU-08 (visualizar log), CU-09 (filtrar).
- **Endpoints:** `getAuditLog()` (paginado), `getEmpresas()`.
- Listas fijas de acciones y entidades (ver código). `limit = 30`.

### `/reportes`
- **CU:** CU-85 (reporte de stock actual).
- **Endpoint:** `generarReporteStock()` → `GET /reportes/stock`.
- Filtros opcionales de empresa (solo SUPERUSUARIO), bodega y tipo de equipo.
- La tabla muestra cantidades por estado, total activo y umbral mínimo; las filas bajo umbral
  usan el badge de peligro y fondo rojo del sistema.
- Sin resultados se muestra `No se encontraron datos para los filtros seleccionados.`.

---

## Notas / deudas técnicas conocidas (para no repetirlas al implementar CUs)

1. `DataTable.svelte` no se usa en ninguna página (tablas manuales).
2. `/catalogo/[id]` no tiene endpoint de detalle propio; carga el catálogo completo y hace `find()`.
3. No hay `/transferencias/[id]`: el detalle es un Modal.
4. La paginación solo existe en auditoría; las demás listas cargan todo.
5. `TransferenciaDetalle` usa `motivo` mientras que el listado usa `observaciones` (inconsistencia menor).
6. No hay `+layout.ts`/`+page.ts`: todo es CSR.
