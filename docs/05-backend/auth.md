# Backend — Módulo `auth` y seguridad

**Carpeta:** `codigo/backend-inventario/src/auth/`

## 1. Endpoints

| Método | Ruta | Guards/Roles | Descripción |
|--------|------|--------------|-------------|
| POST | `/api/auth/login` | público | CU-01: login. Valida usuario+password, maneja intentos fallidos y bloqueo. |
| POST | `/api/auth/logout` | `AuthGuard('jwt')` | CU-11/12: cierre de sesión (motivo manual o inactividad). |
| POST | `/api/auth/cambiar-password` | público | CU-10: cambiar contraseña (tras restablecimiento, `debe_cambiar_password`). |
| POST | `/api/auth/restablecer-password/:id` | `AuthGuard('jwt')`, `RolesGuard`, `@Roles('ADMIN','SUPERUSUARIO')` | CU-10: genera contraseña temporal. |

## 2. Lógica de negocio (`auth.service.ts`)

### Login (CU-01)
- Busca usuario por `nombre_usuario` con `usuarioRoles.rol`.
- **Excepción 1/2:** usuario no existe o password incorrecto → **mensaje genérico**
  `'Usuario o contraseña incorrectos.'` (no revela cuál falló).
- **Excepción 3:** cuenta bloqueada (`bloqueado_hasta > now`) → mensaje de bloqueo.
- Cuenta inactiva (`activo: false`) → mensaje de cuenta desactivada.
- **Intentos fallidos:** máx **5**; al alcanzarlos bloquea **15 min** (`bloqueado_hasta`) y resetea
  el contador. Al login exitoso resetea contador y bloqueo.
- **CU-10:** si `debe_cambiar_password` → devuelve `{ debe_cambiar_password: true }` (no da token).
- **CU-13/14 Excepción 1:** si el usuario no tiene empresa (`id_empresa` null) → error
  `'Su cuenta no tiene empresa asignada. Contacte al administrador.'`.
- Genera JWT: `payload = { sub, nombre_usuario, id_empresa, roles }`, expira en **2h**.
- Audita `LOGIN`. Devuelve `{ access_token, usuario }` (sin `password_hash`; con `roles` y `empresa`).

### Logout (CU-11/12)
- Agrega el token a una blacklist en memoria (`Set`).
- Audita `LOGOUT` con `valor_nuevo: { motivo: 'inactividad' | 'manual' }`.
- (Nota: la blacklist es en memoria — no sobrevive reinicios; basta para la sesión en curso.)

### Cambiar password (CU-10)
- Valida password actual (`bcrypt.compare`) y que la cuenta no esté bloqueada/desactivada.
- Hashea la nueva con salt 12 y setea `debe_cambiar_password: false`.
- Audita `CAMBIAR_PASSWORD`.

### Restablecer password (CU-10)
- **Excepción 1:** usuario inactivo o inexistente → `NotFoundException`
  `'No es posible restablecer la contraseña de un usuario inactivo o inexistente.'`.
- Genera contraseña temporal de 10 caracteres alfanuméricos, hashea con salt 12, setea
  `debe_cambiar_password: true`.
- Audita `RESTABLECER_PASSWORD` con `valor_nuevo: { accion: 'password temporal generado' }`.
- Devuelve `{ password_temporal }`.

## 3. JWT Strategy (`jwt.strategy.ts`)
Extrae Bearer token, `secretOrKey` = `JWT_SECRET`, mapea `payload` → `req.user`:
`{ id_usuario: sub, nombre_usuario, id_empresa, roles }`.

## 4. Guards

### `roles.guard.ts`
- Lee `@Roles(...)` del handler vía `Reflector`. Si no hay roles definidos → `return true`.
- Si `user.roles` no incluye ninguno requerido: **audita `ACCESO_DENEGADO`** (guarda método, ruta,
  roles requeridos y roles del usuario) y lanza `ForbiddenException('No tiene permisos para acceder a esta sección.')`.

### `company-isolation.guard.ts`
- Si `request.user` no existe → `ForbiddenException('No autenticado...')`.
- Si `id_empresa` es null/undefined → audita `ACCESO_DENEGADO` (motivo "Cuenta sin empresa
  asignada") y lanza `ForbiddenException('Su cuenta no tiene una empresa asignada. Contacte al administrador del sistema.')`.
- Si pasa, setea `request.companyContextId = user.id_empresa`.
- **Uso actual:** solo `inventario/units.controller.ts` y `inventario/catalog.controller.ts`.

## 5. Decorators

- `@Roles(...roles)` → `SetMetadata('roles', roles)`.
- `@CurrentUser()` → devuelve `request.user`.

## 6. DTOs

- `login.dto.ts`: `nombre_usuario`, `password`.
- `cambiar-password.dto.ts`: `nombre_usuario`, `password_actual`, `nueva_password`.

## 7. CU cubiertos

CU-01 (login + bloqueo), CU-02 (autenticación/roles — vía guards), CU-03 (permisos por rol),
CU-10 (cambio/restablecimiento de contraseña), CU-11 (logout manual), CU-12 (logout por
inactividad), CU-13/14 (contexto de empresa).
