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
| Préstamos | `/prestamos` | SUPERUSUARIO, ADMIN, ADMIN_BODEGA |
| Bajas | `/bajas` | todos (aprobar/rechazar y pestaña Donaciones solo SUPERUSUARIO, ADMIN) |
| Auditoría | `/auditoria` | SUPERUSUARIO, ADMIN |

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
  CU-37 (historial con usuario/empresa), CU-38/39 (garantía), CU-40 (diagnóstico en revisión),
  CU-47 (ubicación física al ingresar/reingresar a bodega).
- **Endpoints:** `getUnit(id)`, `getUnitHistory(serialNumber)`, `getWarehouses()`, `updateUnit()`,
  `changeUnitState()`.
- Máquina de transiciones replicada en el front (ver `03-base-de-datos.md`).
- **CU-47:** en el modal de cambio de estado, si el destino es `'En bodega'` aparece el campo
  opcional "Ubicación física en bodega" (≤60); si se deja vacío se muestra el aviso de trazabilidad
  sin bloquear el envío. La ficha muestra la ubicación actual cuando la unidad está en bodega.

### `/bodegas`
- **CUs:** CU-41 (crear con responsable), CU-42 (desactivar), CU-44 (listado con stock).
- **Endpoints:** `getWarehouses()`, `getUsers({activo:true})`, `getEmpresas()`, `createWarehouse()`,
  `deactivateWarehouse()`.
- Vista en **tarjetas** (no tabla). Responsable obligatorio; SUPERUSUARIO elige empresa.

### `/bodegas/[id]`
- **CUs:** CU-42 (editar), CU-45 (stock por tipo/estado), CU-46 (umbral mínimo).
- **Endpoints:** `getWarehouse(id)`, `getWarehouseStock(id)`, `getCatalog()`, `getUsers()`,
  `updateWarehouse()`, `setStockThreshold()`.

### `/unidades/[id]` — baja definitiva (CU-78) y donación (CU-80)
- Botón **Registrar baja definitiva** (oculto solo si la unidad ya está `Dado de baja`), disponible
  también para `TECNICO_TERRENO`, que genera una solicitud en vez de aplicar la baja.
- Modal con motivo (lista cerrada de 6) + descripción obligatoria (5-200) si el motivo es `Otro`,
  aviso de garantía vigente y `ConfirmDialog` de confirmación fuerte.
- **Endpoints:** `registrarBaja()`, `registrarDonacion()`.
- **CU-80 encadenado:** si el motivo es `Donación a institución` y el actor aplica la baja directa
  (ADMIN / SUPERUSUARIO / ADMIN_BODEGA), "Continuar" abre un **segundo paso** en el mismo modal con
  los datos de la institución (nombre, RUT, fecha no futura y resolución). Al confirmar se registra
  la baja y, acto seguido, la donación de ese equipo. El técnico de terreno no ve este paso: su
  solicitud queda pendiente y la unidad todavía no está dada de baja.
- Registrar la donación de **varios** equipos ya dados de baja sigue estando en
  `/bajas` → pestaña Donaciones.

### `/transferencias`
- **CUs:** CU-20 (crear transferencia + notificación), CU-21 (detalle), CU-22 (rechazar), CU-23 (listar/filtrar).
- **Endpoints:** `getTransfers()`, `getWarehouses()`, `getUnits()`, `getEmpresas()`,
  `getWarehousesByEmpresa()`, `createTransfer()`, `getTransferDetail()`, `approveTransfer()`,
  `rejectTransfer()`.
- Aprobar/rechazar: botones solo para `SUPERUSUARIO`. Empresa origen = empresa del usuario (inmutable).
- Estados backend `TRANSFERENCIA_PENDIENTE | _APROBADA | _RECHAZADA` → labels Pendiente/Aprobada/Rechazada.

### `/bajas`
- **CUs:** CU-78 (bandeja de solicitudes de baja definitiva).
- **Endpoints:** `getBajas()`, `approveBaja()`, `rejectBaja()`.
- Filtro por estado (`Pendiente de aprobación | Aprobada | Rechazada`); por defecto muestra las pendientes.
- Aprobar/rechazar: botones solo para `SUPERUSUARIO` y `ADMIN`. Aprobar pide `ConfirmDialog`
  (la baja es irreversible); rechazar exige motivo (máx. 200).

### `/bajas` — pestaña Donaciones (CU-80)
- **Endpoints:** `getDonaciones()`, `getUnidadesDonables()`, `registrarDonacion()`, `descargarPdfDonacion()`.
- Formulario: institución (3-100), RUT `XXXXXXXX-X` (con dígito verificador), fecha no futura
  (`max` = hoy), número de resolución opcional y selector de equipos donables.
- **Excepción 1:** los NS que el backend rechaza se resaltan en rojo en el selector.
- El PDF se descarga con `api.download` (el enlace directo no sirve: la ruta exige token).

### `/prestamos`
- **CUs:** CU-81 (registrar préstamo externo), CU-82 (retorno total o parcial),
  CU-83 (tabla de activos), CU-84 (trazabilidad del retorno).
- **Endpoints:** `getPrestamos()`, `getPrestamoDetalle()`, `registrarPrestamo()`, más
  `getUnits()`, `getWarehouses()` y `getWarehouseStock()` para los selectores.
- Los equipos se agregan por NS (solo unidades `En bodega` de la bodega de origen) y los
  consumibles por tipo + cantidad, mostrando el saldo disponible.
- Validación en vivo de los mensajes de CU-59 antes de enviar; el backend los repite.
- **CU-83:** por defecto muestra los `Activo`; filtros de estado y de empresa (este último solo
  para `SUPERUSUARIO`), badge por tipo (Préstamo / Reparación externa), columna de días restantes
  con `Vencido hace N días` en rojo y `EmptyState` con el mensaje exacto del caso de uso.
- **CU-84:** cuando el backend rechaza ítems, el modal reparte las frases del mensaje entre los
  ítems que nombran y marca cada uno en rojo con su motivo.
- **CU-82:** modal "Registrar retorno" (solo en préstamos `Activo`) con fecha limitada a hoy
  (`max`), selección de ítems respetando lo ya devuelto, cantidad por consumible, observación
  con contador y el historial de retornos previos de cada ítem.

### `/auditoria`
- **CUs:** CU-08 (visualizar log), CU-09 (filtrar).
- **Endpoints:** `getAuditLog()` (paginado), `getEmpresas()`.
- Listas fijas de acciones y entidades (ver código). `limit = 30`.

---

## Notas / deudas técnicas conocidas (para no repetirlas al implementar CUs)

1. `DataTable.svelte` no se usa en ninguna página (tablas manuales).
2. `/catalogo/[id]` no tiene endpoint de detalle propio; carga el catálogo completo y hace `find()`.
3. No hay `/transferencias/[id]`: el detalle es un Modal.
4. La paginación solo existe en auditoría; las demás listas cargan todo.
5. `TransferenciaDetalle` usa `motivo` mientras que el listado usa `observaciones` (inconsistencia menor).
6. No hay `+layout.ts`/`+page.ts`: todo es CSR.
