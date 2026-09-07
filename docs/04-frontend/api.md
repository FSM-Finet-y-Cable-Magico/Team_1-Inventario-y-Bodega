# Frontend — Capa de API, store de auth y tipos

## 1. Cliente HTTP — `src/lib/api/client.ts`

- `const BASE = '/api'` (dev: proxy Vite → `localhost:3003`).
- `request<T>(method, path, body?)`:
  1. Inyecta `Authorization: Bearer <token>` desde `get(authStore).token`.
  2. Serializa JSON (o envía `FormData` tal cual para subida de archivos).
  3. **Manejo 401:** si la ruta no es `/auth/login`, hace `authStore.logout()` + `goto('/login')`
     (sesión expirada). En `/auth/login`, el 401 = credenciales inválidas (muestra el mensaje).
  4. Si `!res.ok` extrae `message` (NestJS puede devolver `string[]` → se unifica con `.join('. ')`).
     Lanza `ApiError` (con `.status`).
- `download(path, fallbackName)`: descarga autenticada (la ficha técnica PDF). El token va en
  header, por eso no se usa un `<a href>` directo. Lee `Content-Disposition`, crea blob + `<a download>`.

**API exportada:** `api.get / api.post / api.patch / api.delete / api.download` y `ApiError`.

## 2. Funciones por dominio — `src/lib/api/index.ts`

Todas tipadas `<T>`. Nombre de endpoint backend en comentario:

### Auth
- `login(dto)` → `POST /auth/login` (CU-01)
- `logout(motivo: 'manual' | 'inactividad')` → `POST /auth/logout` (CU-11/12)
- `cambiarPassword(dto)` → `POST /auth/cambiar-password` (CU-10)
- `restablecerPassword(id)` → `POST /auth/restablecer-password/:id` → `{ password_temporal }` (CU-10)

### Usuarios
- `getUsers({activo?, buscar?, rol?})` → `GET /usuario` (CU-05)
- `getUser(id)` → `GET /usuario/:id`
- `createUser(data)` → `POST /usuario` (CU-04)
- `updateUser(id, data)` → `PATCH /usuario/:id` (CU-06)
- `deleteUser(id)` → `DELETE /usuario/:id` (CU-07, desactiva)
- `getRoles()` → `GET /roles`
- `getEmpresas()` → `GET /empresas`

### Catálogo
- `getCatalog({categoria?, activo?, buscar?})` → `GET /catalogo` (CU-25)
- `createCatalogItem(data)` → `POST /catalogo` (CU-24)
- `updateCatalogItem(id, data)` → `PATCH /catalogo/:id` (CU-26)
- `deleteCatalogItem(id)` → `DELETE /catalogo/:id` (lógica, CU-27)
- `hardDeleteCatalogItem(id)` → `DELETE /catalogo/:id/fisico` (CU-27)
- `uploadFichaTecnica(id, file)` → `POST /catalogo/:id/ficha-tecnica` (multipart, CU-29)
- `downloadFichaTecnica(id, fallbackName)` → `GET /catalogo/:id/ficha-tecnica/archivo` (CU-30)

### Unidades
- `getUnits({estado?, buscar?})` → `GET /unidades`
- `getUnit(id)` → `GET /unidades/:id/ficha` (CU-33)
- `createUnit(data)` → `POST /unidades` (CU-32)
- `ingresarConsumible({id_tipo_equipo, id_bodega, cantidad})` → `POST /unidades/consumibles` (CU-28/31)
- `updateConsumible(id_stock, {cantidad_disponible?, umbral_minimo?})` → `PATCH /unidades/consumibles/:id_stock`
- `updateUnit(id, data)` → `PATCH /unidades/:id` (CU-34)
- `changeUnitState(id, data)` → `PATCH /unidades/:id/cambiar-estado` (CU-35/36/40)
- `getUnitHistory(serialNumber)` → `GET /unidades/:serialNumber/historial` (CU-37)

### Bodegas
- `getWarehouses({activa?, nombre?})` → `GET /bodegas` (CU-44)
- `getWarehouse(id)` → `GET /bodegas/:id`
- `getWarehousesByEmpresa(idEmpresa)` → `GET /bodegas/empresa/:idEmpresa` (CU-20)
- `createWarehouse(data)` → `POST /bodegas` (CU-41)
- `updateWarehouse(id, data)` → `PATCH /bodegas/:id` (CU-42)
- `deactivateWarehouse(id)` → `DELETE /bodegas/:id/desactivar`
- `getWarehouseStock(id)` → `GET /bodegas/:id/stock` (CU-45)
- `setStockThreshold(id, {id_tipo_equipo, umbral})` → `POST /bodegas/:id/umbral` (CU-46)

### Transferencias
- `getTransfers({estado?, id_empresa?, fecha_inicio?, fecha_fin?})` → `GET /transferencias` (CU-23)
- `getTransferDetail(id)` → `GET /transferencias/:id` (CU-21)
- `createTransfer(data)` → `POST /transferencias` (CU-20)
- `approveTransfer(id)` → `PATCH /transferencias/:id/aprobar` (solo SUPERUSUARIO)
- `rejectTransfer(id, {observaciones})` → `PATCH /transferencias/:id/rechazar` (CU-22)

### Dashboards
- `getDashboard()` → `GET /empresas/dashboard` (consolidado, SUPERUSUARIO) (CU-15)
- `getMyDashboard()` → `GET /empresas/mi-dashboard` (CU-16)

### Reportes
- `generarReporteStock({id_empresa?, id_bodega?, id_tipo_equipo?})` → `GET /reportes/stock` (CU-85).

### Auditoría
- `getAuditLog(filters)` → `GET /auditoria` (CU-08/09) con `pagina, limite, accion, entidad_afectada,
  fecha_inicio, fecha_fin, usuario, id_empresa`.

**Convención:** los filtros se serializan con `URLSearchParams` omitiendo `undefined`.

## 3. Store de autenticación — `src/lib/stores/auth.ts`

- Estado `AuthState`: `{ token, usuario, roles: RolNombre[], id_empresa }`.
- Persistencia en `localStorage` (clave `'auth'`), restaurado al recargar.
- `decodeToken(token)`: decodifica el payload JWT (`atob`) → roles e id_empresa.
- Métodos: `login(token, usuario)`, `logout()`, `setUser(usuario)`.
- Derivados exportados: `isAuthenticated`, `userRoles`, `currentUser`, `hasRole(role)`.

**Roles definidos (`RolNombre`):** `'SUPERUSUARIO' | 'ADMIN' | 'ADMIN_BODEGA' | 'TECNICO_TERRENO'`.

## 4. Tipos — `src/lib/types/index.ts`

Los principales:
- `Usuario`, `CreateUsuarioDto`, `UpdateUsuarioDto`.
- `Empresa` `{ id, nombre }`, `Rol`, `RolNombre`.
- `LoginDto`, `LoginResponse` (`access_token?`, `usuario?`, `debe_cambiar_password?` — CU-10).
- `TipoEquipo` (catálogo). ⚠️ La API serializa el nombre de la entidad TypeORM, por lo que el
  frontend soporta **dos variantes** de nombre: `requiereSerialNumber` y `requiere_serie_individual`.
  También hay variantes snake/camel en `ficha_tecnica_pdf_url`/`fichaTecnicaPdfUrl`.
- `EstadoUnidad`: literal con tildes `'En bodega' | 'Asignado a técnico' | 'Instalado en cliente' |
  'En revisión' | 'En préstamo externo' | 'Dado de baja'` — debe coincidir exacto con backend.
- `UnidadEquipo` (+ campos de consumible `es_consumible`, `id_stock_consumible`,
  `cantidad_disponible`, `unidad_medida`, `umbral_minimo`).
- `CreateUnidadDto`, `CambioEstadoDto`, `HistorialEstado` (con `usuario?` y `empresa?`).
- `Bodega`, `StockConsumible`, `ConfigurarUmbralDto`.
- `Transferencia`, `TransferenciaDetalle`, `CreateTransferenciaDto`, `MovimientoInventario`.
- `LogAuditoria`, `FiltrosAuditoria`, `DashboardEmpresa`, `PaginatedResponse<T>`, `DecodedToken`.

> Al implementar un CU nuevo: agrega aquí los tipos que necesite el frontend, **usando los mismos
> nombres de campo** que devuelve el backend (ver entidades en `05-backend/`).

## 5. Cómo agregar una función API para un CU nuevo

Ejemplo (flujo típico):

```ts
// en api/index.ts
export async function crearCliente(data: CreateClienteDto): Promise<Cliente> {
  return api.post('/cliente', data);
}
```

```ts
// en types/index.ts
export interface Cliente { id_cliente: number; ... }
export interface CreateClienteDto { ... }
```

Luego en la página: `onMount(load)` → `crearCliente(form)` en el submit → `load()` tras éxito.
