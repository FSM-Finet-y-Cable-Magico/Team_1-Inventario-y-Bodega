# Backend — Módulos `usuarios` y `roles`

## Módulo Usuarios

**Carpeta:** `codigo/backend-inventario/src/usuarios/`

### 1. Endpoints

Controller-level: `@UseGuards(AuthGuard('jwt'), RolesGuard)`.

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| POST | `/api/usuario` | `ADMIN`, `SUPERUSUARIO` | CU-04: crear usuario. |
| GET | `/api/usuario` | `ADMIN`, `SUPERUSUARIO` | CU-05: listar con filtros `activo`, `buscar`, `rol`. |
| GET | `/api/usuario/:id` | `ADMIN`, `SUPERUSUARIO` | Detalle. (No aplica aislamiento de empresa.) |
| PATCH | `/api/usuario/:id` | `ADMIN`, `SUPERUSUARIO` | CU-06: editar usuario. |
| DELETE | `/api/usuario/:id` | `ADMIN`, `SUPERUSUARIO` | CU-07: desactivar (baja lógica). |

### 2. Lógica del service

- **`findAll(filtros, idEmpresaActor, actorRoles)`**
  - Superusuario ve usuarios de **todas** las empresas; los demás solo de la suya.
  - Búsqueda `ILIKE` sobre `nombre_completo` o `nombre_usuario`; filtro por rol post-query.
  - **CU-05:** los `SUPERUSUARIO` solo son visibles para otro SUPERUSUARIO.
  - **CU-05 Excepción 1:** sin coincidencias → `[]` (el front muestra el mensaje).
  - Añade `empresa_nombre` desde el mapa `EMPRESAS`.
- **`create(dto, actor)`** (CU-04)
  - El nuevo usuario **hereda la empresa del actor**; solo SUPERUSUARIO puede asignar otra →
    `ForbiddenException('Solo un Superusuario puede crear usuarios en otra empresa.')`.
  - Valida roles existentes → `BadRequestException('Uno o más roles seleccionados no existen.')`.
  - **CU-04 Excepción 2:** ADMIN no puede asignar rol SUPERUSUARIO → `ForbiddenException`.
  - **CU-04 Excepción 3:** `nombre_usuario` duplicado → `ConflictException`.
  - Hash bcrypt salt 12. Estado inicial `activo ?? true` (CU-04). Audita `CREAR`.
- **`remove(id, actorId, actorRoles)`** (CU-07)
  - **Excepción 1:** no puede desactivar **su propia cuenta** → `BadRequestException`.
  - Solo SUPERUSUARIO desactiva a otro SUPERUSUARIO → `ForbiddenException`.
  - Baja **lógica** (`activo: false`). Audita `DESACTIVAR`.
- **`update(id, dto, actorId, actorRoles)`** (CU-06/07)
  - Solo SUPERUSUARIO edita a otro SUPERUSUARIO; no se puede auto-desactivar.
  - `password` no se actualiza por esta vía; `id_empresa` solo lo cambia un SUPERUSUARIO.
  - **CU-06:** roles editables, validados y reemplazados (Excepción 2: ADMIN no asigna SUPERUSUARIO).
  - Snapshot `anterior` para auditoría `ACTUALIZAR`.

### 3. Entidades

- **`usuario`** → `usuario.entity.ts`: `id_usuario`, `id_empresa` (nullable), `nombre_completo`,
  `nombre_usuario` (unique), `email` (unique), `password_hash`, `activo`, `intentos_fallidos`,
  `bloqueado_hasta`, `debe_cambiar_password`, `fecha_creacion`. `OneToMany usuarioRoles`.
- **`usuario_rol`** → `usuario-rol.entity.ts`: `id_usuario_rol`, `id_usuario`, `id_rol`,
  `fecha_asignacion`. `ManyToOne` → Usuario y Rol.

### 4. DTOs y validaciones

- `create-usuario.dto.ts`:
  - `nombre_usuario`: regex `/^[a-z0-9_]{4,20}$/`.
  - `nombre_completo`: letras/espacios/tildes, 2–80.
  - `email`: opcional, validado solo si viene (CU-04).
  - `password`: `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d\W_]{8,64}$`.
  - `id_empresa`: opcional int. `roles`: array ints. `activo`: opcional bool (CU-04).
- `update-usuario.dto.ts`: `PartialType(CreateUsuarioDto)` + `activo` re-declarado (CU-06).

---

## Módulo Roles

**Carpeta:** `codigo/backend-inventario/src/roles/`

### 1. Endpoints

| Método | Ruta | Guards/Roles |
|--------|------|--------------|
| POST | `/api/roles` | `AuthGuard('jwt')` + `RolesGuard` + `@Roles('ADMIN')` |
| GET | `/api/roles` | **público** (sin guards) |
| GET | `/api/roles/:id` | **público** (sin guards) |
| PATCH | `/api/roles/:id` | `@Roles('ADMIN')` |
| DELETE | `/api/roles/:id` | `@Roles('ADMIN')` |

### 2. Lógica
- CRUD simple. `nombre_rol` es UNIQUE en BD.
- **Deudas técnicas:** `create` no valida duplicados (error 500 si se duplica); `update`/`remove`
  lanzan `new Error(...)` genérico (HTTP 500) en vez de `NotFoundException`; `auditoriaService`
  inyectado sin usar.

### 3. Entidad
- `rol`: `id_rol`, `nombre_rol` (unique), `descripcion`. `OneToMany usuarioRol`.
- Roles en uso: `SUPERUSUARIO`, `ADMIN`, `ADMIN_BODEGA`, `TECNICO_TERRENO`.

---

## CU cubiertos
CU-04 (crear usuario), CU-05 (listar/filtrar), CU-06 (editar/roles/empresa), CU-07 (desactivar).
