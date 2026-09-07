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
| Órdenes de ingreso | `/ordenes-ingreso` | SUPERUSUARIO, ADMIN, ADMIN_BODEGA |
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
- Botón "Equipos en revisión" (visible para `SUPERUSUARIO`/`ADMIN`/`ADMIN_BODEGA`) navega a
  `/unidades/en-revision` (CU-77).

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

### `/unidades/en-revision`
- **CU:** CU-77 (listado de equipos en revisión, solo consulta).
- **Endpoints:** `getUnidadesEnRevision()`.
- Tabla ordenable por cualquier columna (clic en cabecera, `$state` de columna+dirección).
  Filas con `dias_en_revision > 30` se resaltan con `bg-amber-50`. Sin ítem propio en el
  Sidebar; se llega desde el botón "Equipos en revisión" de `/unidades`.
- `EmptyState` con el mensaje exacto de la Excepción 1: "No hay equipos en revisión actualmente."

### `/salidas`
- **CUs:** CU-57 (salida de equipos/consumibles a técnico), CU-58 (inventario personal del técnico,
  sección de consulta), CU-59 (validación en vivo de NS), CU-60 (consumibles con 2 decimales),
  CU-62 (stock insuficiente como banner).
- **Endpoints:** `getUsers({rol:'TECNICO_TERRENO'})`, `getWarehouses({activa:true})`,
  `getCatalog({activo:true})`, `getUnits({estado:'En bodega'})`, `getWarehouseStock(id)`,
  `verificarSerie(ns, id_bodega)`, `crearSalida()`, `listarSalidas()`, `getInventarioTecnico(id)`.
- Los NS se eligen de un **datalist** con las unidades disponibles de la bodega elegida
  (escribir para filtrar); igual pasa por la validación en vivo (CU-59). Junto al consumible
  se muestra el saldo en vivo de la bodega (CU-62, pre-validación). Confirmar deshabilitado
  mientras haya NS inválidos o sin ítems. Ítem "Salidas" agregado al
  Sidebar (roles `SUPERUSUARIO`, `ADMIN`, `ADMIN_BODEGA`, `TECNICO_TERRENO` — el técnico solo
  consulta su inventario; el backend lo valida igual).

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

### `/ordenes-ingreso`
- **CUs:** CU-52 (registrar orden de ingreso desde proveedor), CU-53 (consultar listado con filtros).
- **Endpoints:** `getOrdenesIngreso()`, `createOrdenIngreso()`, `getProveedores()`, `getCatalog()`,
  `getWarehouses()`, `getWarehousesByEmpresa()`, `getEmpresas()`.
- **CU-53:** columnas correlativo, proveedor, N.º documento, fecha del documento (**DD/MM/YYYY**),
  empresa destinataria, bodega de destino, estado y total de ítems. Filtros con `$effect` de
  recarga: buscador (correlativo / N.º documento), nombre del proveedor, estado, rango de fechas
  y empresa destinataria — este último **solo para el Superusuario**, porque al resto el backend
  ya le acota el listado a su empresa. Al hacer clic en una fila se navega a la ficha de detalle.
- **CU-53 Excepción 1:** si los filtros no arrojan coincidencias, `EmptyState` con el mensaje
  exacto `No se encontraron órdenes con los filtros seleccionados.` (sin filtros aplicados el
  mensaje es el genérico de listado vacío, que no es la excepción del CU).
- **CU-52:** el modal "Nueva orden de ingreso" arma la cabecera (proveedor, N.º documento
  alfanumérico ≤30, fecha no futura vía `max` del `input[type=date]`, bodega activa) más un
  sub-formulario dinámico de ítems (agregar/quitar filas: tipo de equipo + cantidad esperada +
  garantía en días, precargada con la `garantiaDias` del tipo elegido). Tras crear muestra un
  banner con el correlativo asignado (`OI-XXXX`).
- La **empresa destinataria** solo la elige el `SUPERUSUARIO`; para el resto de roles se
  preselecciona la propia y no se envía en el payload (la fija el backend), igual que en CU-41.
- **CU-52 Excepción 1:** validación en cliente antes de enviar (proveedor, documento, fecha,
  bodega, ≥1 ítem y cada ítem completo) que indica el error específico y no envía la petición;
  el `ValidationPipe` del backend la repite como red de seguridad.

### `/ordenes-ingreso/[id]`
- **CUs:** CU-53 (ficha de detalle de una orden de ingreso), CU-54 (registrar recepción),
  CU-55 (números de serie en la recepción), CU-56 (fecha de recepción efectiva).
- **Endpoints:** `getOrdenIngreso(id)`, `registrarRecepcionOrden(id, items)`.
- Cabecera con correlativo, badge de estado, proveedor, N.º documento, fecha (DD/MM/YYYY),
  empresa destinataria, bodega de destino y total de ítems. Tabla de ítems con cantidad
  esperada, recibida, pendiente (esperada − recibida) y garantía, más una fila de totales.
- Si la orden no existe o es de otra empresa, el backend responde el mismo 404 y la página
  muestra `Orden de ingreso no encontrada`.
- **CU-54:** el botón "Registrar recepción" abre un modal con un input por ítem (`0..pendiente`),
  acotado a lo que falta y deshabilitado en los ítems ya completos. Tras guardar, la ficha se
  actualiza en el sitio con las cantidades y el estado nuevos, y muestra un banner con el
  estado resultante. El botón queda **deshabilitado** cuando la orden está `Completada`.
- **CU-54 Excepción 1:** el formulario del modal lleva `novalidate` a propósito. Con la
  validación nativa activa, el navegador bloquea el submit por el `max` del input y muestra su
  propio tooltip, tapando el mensaje exacto del CU
  (`La cantidad no puede superar la cantidad pendiente del ítem.`). El `max` se conserva para
  acotar las flechas del spinner.
- **CU-55:** dentro del modal, los ítems con `requiere_serie_individual` muestran una sección de
  números de serie: input + botón "Agregar", validación en vivo del formato con la misma regex
  que el backend, listado de los NS ya ingresados con botón para quitarlos, y contador
  `N / esperados ingresados`. Los ítems consumibles no muestran la sección.
- **CU-55 Excepción 3:** "Guardar recepción" queda **deshabilitado** mientras algún ítem
  serializado tenga menos NS que su cantidad recibida; `guardarRecepcion` lo revalida antes de
  enviar por si el estado quedara inconsistente.
- **CU-56:** campo "Fecha de recepción efectiva" (`input[type=date]`, obligatorio, `max` = hoy),
  precargado con la fecha del día. Si difiere de la fecha del documento de la orden, se muestra
  un aviso ámbar recordando que ambas quedan registradas.
- **CU-56 Excepciones 1 y 2:** sin fecha el botón queda deshabilitado
  (*"Debe indicar la fecha de recepción efectiva."*); con fecha futura el campo muestra
  *"La fecha de recepción no puede ser futura."* El backend revalida contra su propio reloj,
  que es la referencia real.

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
