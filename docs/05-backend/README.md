# Backend — Convenciones y módulos

**Carpeta:** `codigo/backend-inventario/`

## 1. Stack y configuración

- **NestJS 11** + **TypeORM** + **PostgreSQL**. Prefijo global de rutas: `/api`.
- Autenticación **JWT** (Passport) con expiración de **2h**.
- `ValidationPipe` global (class-validator sobre los DTOs).
- `synchronize: false` → los cambios de esquema van por **migraciones** (`scripts/migrar.ts`).
- Módulos feature: `auth`, `usuarios`, `roles`, `auditoria`, `companies`, `bodegas`,
  `inventario` (catálogo + unidades), `transferencias`, `proveedores`, `ordenes-ingreso`,
  `integraciones` (server-to-server con G3, `docs/05-backend/integraciones.md`),
  `salidas` (salidas a técnico, `docs/05-backend/salidas.md`), `health`.
  `inventario` (catálogo + unidades), `transferencias`, `bajas`, `donaciones`, `prestamos`, `health`,
  `alertas` (alertas activas del dashboard, `docs/05-backend/alertas.md`).

## 2. Seguridad transversal (obligatorio en todo endpoint)

### 2.1 Cadena de guards
Cualquier endpoint que acceda a datos protegidos usa:

```ts
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN', 'SUPERUSUARIO')
```

- `AuthGuard('jwt')` → valida el token y expone `req.user = { id_usuario, nombre_usuario, id_empresa, roles }`.
- `RolesGuard` → lee metadata `roles` (de `@Roles(...)`) del handler. Si no coincide, **audita
  `ACCESO_DENEGADO`** y lanza `ForbiddenException('No tiene permisos para acceder a esta sección.')`.
- `@Roles()` sin argumentos → no restringe (pero exige estar autenticado).
- Si un endpoint NO lleva `@Roles`, `RolesGuard` deja pasar a cualquier usuario autenticado.

### 2.2 Aislamiento por empresa (3 patrones distintos — respetar cada uno)

| Módulo | Patrón |
|--------|--------|
| `inventario` (`catalogo`, `unidades`) | Guard dedicado `CompanyIsolationGuard` (exige `id_empresa` no nulo, inyecta `req.companyContextId`; audita y lanza `ForbiddenException` si la cuenta no tiene empresa). |
| `usuarios`, `bodegas`, `transferencias`, `companies`, `ordenes-ingreso` | Aislamiento **manual en el service** con flag `esSuperusuario`: los no-superusuario solo ven/editan su empresa. En `bodegas` hay `verificarPertenencia` que devuelve **404 genérico** ("Bodega no encontrada") para no revelar existencia. En `ordenes-ingreso` el no-superusuario no puede elegir empresa: se le fuerza la suya. |
| `usuarios`, `bodegas`, `transferencias`, `bajas`, `donaciones`, `prestamos`, `companies`, `alertas` | Aislamiento **manual en el service** con flag `esSuperusuario`: los no-superusuario solo ven/editan su empresa. En `bodegas` hay `verificarPertenencia` que devuelve **404 genérico** ("Bodega no encontrada") para no revelar existencia. |
| `transferencias` | Manual: un Admin solo ve transferencias donde su empresa es origen o destino (`NotFoundException('Transferencia no encontrada')` si no). |

**No agregues `CompanyIsolationGuard` a un módulo que no lo usa sin justificación**, y
mantén la consistencia interna de cada módulo.

### 2.3 Auditoría
- `AuditoriaService` es **`@Global`** → se inyecta en cualquier service.
- **Toda mutación relevante** registra en `log_auditoria`: `accion` (LOGIN, LOGOUT, CREAR,
  ACTUALIZAR, DESACTIVAR, ELIMINAR, MODIFICAR, EDITAR, SOLICITAR_TRANSFERENCIA,
  APROBAR_TRANSFERENCIA, RECHAZAR_TRANSFERENCIA, RESTABLECER_PASSWORD, CAMBIAR_PASSWORD,
  CONFIGURAR_UMBRAL, SOLICITAR_BAJA, APROBAR_BAJA, RECHAZAR_BAJA, BAJA_DEFINITIVA,
  DONACION, PRESTAMO_EXTERNO, RETORNO_PRESTAMO, ACCESO_DENEGADO...), `entidad_afectada`, `id_entidad_afectada`,
  `valor_anterior`/`valor_nuevo` (jsonb).
- Los accesos denegados (RolesGuard, CompanyIsolationGuard, verificarPertenencia) también auditan.

## 3. Excepciones HTTP (convención de mensajes)

| Excepción | Uso |
|-----------|-----|
| `BadRequestException` | Validación de negocio/formato con mensaje específico (acumula varios errores con `join(' ')` en catálogo). |
| `ConflictException` | Duplicados (usuario, serie, MAC, nombre+marca+modelo, etc.). |
| `NotFoundException` | Entidad no existe. **En consultas cross-empresa se usa el mismo 404 que "no existe" para no revelar existencia.** |
| `ForbiddenException` | Rol insuficiente / no pertenece a la empresa del actor. |
| `UnauthorizedException` | Credenciales inválidas, cuenta bloqueada/desactivada, token inválido. |

Mensajes **en español**, específicos por validación. Excepción: login usa mensaje **genérico**
(`'Usuario o contraseña incorrectos.'`) sin revelar cuál campo falló.

## 4. Patrón de creación de un módulo nuevo (para un CU que agregue entidad)

1. Carpeta `src/<modulo>/` con `<modulo>.module.ts`, `.controller.ts`, `.service.ts`,
   `entities/`, `dto/`.
2. En el módulo: `TypeOrmModule.forFeature([Entidad, ...])` + importar `AuditoriaModule` (o usar
   el service global).
3. Registrar el módulo en `app.module.ts` (imports).
4. Entidad TypeORM con `@Entity('nombre_tabla')` y columnas mapeadas (snake_case en BD).
5. Controller con guards + `@Roles(...)` por handler.
6. Service con validación manual + auditoría + aislamiento de empresa.
7. DTOs con class-validator (mensajes en español).
8. Si agrega columnas/tablas: `scripts/migrar.ts` + `database/init.sql`.

## 5. Índice de documentos por módulo

| Documento | Módulos |
|-----------|---------|
| [auth.md](./auth.md) | `auth` (login/logout/password) + guards + decorators |
| [usuarios.md](./usuarios.md) | `usuarios` + `roles` |
| [auditoria-companies.md](./auditoria-companies.md) | `auditoria` + `companies` + `health` |
| [bodegas.md](./bodegas.md) | `bodegas` (bodegas + stock + umbral) |
| [inventario.md](./inventario.md) | `inventario` (catálogo + unidades + historial) |
| [transferencias.md](./transferencias.md) | `transferencias` |
| [proveedores.md](./proveedores.md) | `proveedores` (CU-49) |
| [ordenes-ingreso.md](./ordenes-ingreso.md) | `ordenes-ingreso` (CU-52, CU-53) |
| [bajas.md](./bajas.md) | `bajas` (baja definitiva y solicitudes, CU-78/CU-79) |
| [donaciones.md](./donaciones.md) | `donaciones` (donación de equipos de baja + PDF, CU-80) |
| [prestamos.md](./prestamos.md) | `prestamos` (préstamos externos y retornos, CU-81/CU-82) |
| [alertas.md](./alertas.md) | `alertas` (alertas activas del dashboard, CU-94) |

> Para cada módulo se listan: endpoints, lógica de negocio, entidades, y qué CU cubre.

## 6. Comandos

```bash
cd codigo/backend-inventario
npm install
npm run start:dev        # dev con watch (necesita DATABASE_URL y JWT_SECRET en .env)
npm run lint             # eslint
npm run build            # compilación
npm run test             # jest (specs boilerplate, sin lógica)
npm run migrar           # migraciones idempotentes
npm run seed:qa          # datos de prueba
```

## 7. Consideraciones al implementar un CU nuevo

- **No rompas los contratos de respuesta existentes.** El frontend depende de los nombres de
  campo actuales (a veces camelCase en la entidad, a veces snake_case). Al agregar campos nuevos,
  respeta el estilo del módulo y documenta los nombres en el frontend.
- **Los mensajes de error ya establecidos** (máquina de estados, diagnósticos, formato de serie,
  etc.) no deben cambiar.
- **Si tu CU cambia stock, estados o transferencias**, lee `inventario.md` y `transferencias.md`
  completos antes de tocar código.
- **Empresas:** si necesitas listar/validar empresas usa `EMPRESAS` de `companies.service.ts`.
- **Transacciones:** para operaciones multi-escritura (registrar/aprobar transferencia, cambiar
  estado + historial) se usa `QueryRunner` de TypeORM con `commitTransaction`/`rollbackTransaction`.
