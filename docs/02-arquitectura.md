# Arquitectura del sistema

## 1. Stack tecnológico

| Capa | Tecnología | Versión/Nota |
|------|-----------|--------------|
| Frontend | **SvelteKit** + **Svelte 5** (runas `$state`, `$props`, etc.) | `^2.20.0` / `^5.25.0` |
| Estilos frontend | **Tailwind CSS v4** + tokens en `app.css` | `@tailwindcss/vite` |
| Iconos | **@lucide/svelte** | — |
| Backend | **NestJS 11** + **TypeORM** | API REST con prefijo global `/api` |
| Autenticación | **Passport-JWT** + **bcrypt** | Token JWT expira en 2h |
| Validación | **class-validator / class-transformer** | `ValidationPipe` global |
| Base de datos | **PostgreSQL 16** | — |
| Proxy / entrada | **Nginx** | puerto 80 |
| Orquestación | **Docker Compose** | 4 servicios: db, backend, frontend, nginx |

## 2. Topología

```
                ┌─────────────────────────────────────────────┐
                │  http://localhost  (Nginx, puerto 80)       │
                └───────────────┬─────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
        /api/*  │                               │  /*
                ▼                               ▼
        ┌───────────────┐              ┌──────────────────┐
        │  backend      │              │  frontend        │
        │  NestJS :3003 │              │  SvelteKit :3000 │
        └───────┬───────┘              └──────────────────┘
                │
                ▼
        ┌───────────────┐
        │  PostgreSQL   │
        │  db :5432     │
        └───────────────┘
```

- **Nginx** (`codigo/nginx/nginx.conf`) enruta `/api/*` → backend (3003) y todo lo demás → frontend (3000).
- El frontend SvelteKit usa `adapter-node` (servidor Node en producción) y en **dev** proxya
  `/api` → `localhost:3003` vía Vite.
- Volúmenes Docker: `pgdata` (base de datos) y `uploads_data` (fichas técnicas PDF).
- Al primer arranque, PostgreSQL ejecuta `database/init.sql` (esquema). El backend luego corre
  automáticamente `migrar.ts` (migraciones idempotentes) y `seed-qa.ts` (datos de prueba).

## 3. Levantar el sistema (Docker)

Todo vive en `codigo/`. Ver `codigo/README.md` para la guía completa.

```bash
cd codigo
docker compose up -d --build     # levanta los 4 servicios
docker compose ps                # estado
docker compose logs -f           # logs
docker compose down              # detener (conserva datos)
docker compose down -v           # detener y borrar datos/BD
```

> Si el puerto 80 está ocupado, cambiar en `docker-compose.yml` los `ports` (p. ej. `"8080:80"`).

### Usuarios de demostración (seed automático)

| Usuario | Contraseña | Rol | Empresa |
|---------|-----------|-----|---------|
| `superusuario` | `Super1234` | SUPERUSUARIO | Finet |
| `admin_finet` | `Finet1234` | ADMIN | Finet |
| `admin_cable` | `Cable1234` | ADMIN | Cable Mágico |
| `tecnico_qa` | `Tecnico1234` | TECNICO_TERRENO | Finet |
| `tecnico_cable` | `TecnicoCable1234` | TECNICO_TERRENO | Cable Mágico |

## 4. Desarrollo sin Docker (opcional)

```bash
# Backend
cd codigo/backend-inventario
cp .env.template .env   # completar DATABASE_URL y JWT_SECRET
npm install
npm run start:dev

# Frontend (otra terminal)
cd ../frontend
npm install
npm run dev             # http://localhost:5173 (proxy /api -> localhost:3003)
```

Variables de entorno requeridas por el backend (`src/config.ts` las valida al arrancar):
`PORT`, `DATABASE_URL`, `JWT_SECRET`. (Formato `.env` en la raíz de `codigo/`, ver `.env.example`.)

## 5. Backend — estructura por capas

```
codigo/backend-inventario/src/
├── main.ts                  # bootstrap: prefijo /api, ValidationPipe global, CORS
├── app.module.ts            # raíz: importa los 9 módulos feature
├── config.ts                # validación de variables de entorno
├── auth/                    # login/logout/cambiar-password/restablecer + JwtStrategy,
│                            #   RolesGuard, CompanyIsolationGuard, decorators
├── usuarios/                # CRUD usuarios + relación usuario_rol
├── roles/                   # CRUD roles (GET público)
├── auditoria/               # log_auditoria (módulo @Global, inyectable desde todos)
├── companies/               # empresas (constante hardcodeada) + dashboards
├── bodegas/                 # bodegas + stock_consumible + umbral mínimo
├── inventario/              # catálogo (tipos de equipo) + unidades + historial de estados
├── transferencias/          # transferencias inter-empresa + movimientos de inventario
├── health/                  # /api/health/ping y /api/health/db (públicos)
└── scripts/                 # migrar.ts (migraciones), seed-qa.ts (datos de prueba)
```

Cada módulo feature sigue la estructura NestJS estándar:
`<modulo>.module.ts` + `<modulo>.controller.ts` + `<modulo>.service.ts` +
`entities/` + `dto/`.

### Configuración global relevante (`main.ts`)

- Prefijo global: `app.setGlobalPrefix('api/')`.
- `app.useGlobalPipes(new ValidationPipe())` → todos los DTOs con class-validator se validan.
- CORS abierto (`origin: '*'`).

### TypeORM (`app.module.ts`)

- `synchronize: false` → **los cambios de esquema se hacen con migraciones** (`npm run migrar`),
  nunca con `synchronize`. Si agregas columnas, agrégalas a `scripts/migrar.ts`.
- `autoLoadEntities: true` → las entidades registradas vía `TypeOrmModule.forFeature(...)`
  se cargan automáticamente.

## 6. Frontend — estructura por capas

```
codigo/frontend/src/
├── app.css                  # tokens de diseño (@theme) + estilos base
├── app.html                 # shell HTML
├── routes/                  # páginas (cada carpeta = una URL)
│   ├── +layout.svelte       # layout: login sin shell; resto con Sidebar+Header; inactividad
│   ├── +page.svelte         # redirect / -> /dashboard o /login
│   ├── login/               # CU-01 y CU-10
│   ├── dashboard/           # CU-15/16
│   ├── usuarios/            # CU-04..07, [id] CU-06/10
│   ├── catalogo/            # CU-24..30, [id] CU-26/29/30
│   ├── unidades/            # CU-28/31/32, [id] CU-33..40
│   ├── bodegas/             # CU-41/42/44, [id] CU-42/45/46
│   ├── transferencias/      # CU-20..23
│   └── auditoria/           # CU-08/09
└── lib/
    ├── api/client.ts        # fetch genérico con token, manejo 401, descargas
    ├── api/index.ts         # funciones tipadas por dominio
    ├── stores/auth.ts       # store de autenticación (localStorage)
    ├── types/index.ts       # tipos TS (Usuario, UnidadEquipo, Bodega, etc.)
    └── components/          # componentes reutilizables
```

**Modelo de datos del frontend:** no hay loaders SSR (`+page.ts`/`+server.ts`). Todas las
páginas cargan datos **client-side** con `onMount` usando las funciones de `$lib/api`.
La autenticación se maneja en `+layout.svelte` (redirige a `/login` si no hay token, y vigila la
inactividad de 5 minutos para cerrar sesión — CU-11/12).

## 7. Seguridad transversal (back-end)

1. **Autenticación:** `@UseGuards(AuthGuard('jwt'))` → valida el Bearer token y expone
   `req.user = { id_usuario, nombre_usuario, id_empresa, roles[] }`.
2. **Autorización por rol:** `@UseGuards(..., RolesGuard)` + `@Roles('ADMIN', ...)`.
   Si el rol no coincide → audita `ACCESO_DENEGADO` y lanza `ForbiddenException`.
3. **Aislamiento por empresa:** o bien el guard dedicado `CompanyIsolationGuard`
   (usado en `inventario`) o bien aislamiento manual en el service con flag `esSuperusuario`
   (usado en `usuarios`, `bodegas`, `transferencias`). Ver `05-backend/README.md`.
4. **Auditoría:** todas las mutaciones relevantes y accesos denegados escriben en
   `log_auditoria` vía `AuditoriaService` (módulo `@Global`).

## 8. Estructura de la base de datos (resumen)

11 tablas: `empresa`, `rol`, `usuario`, `usuario_rol`, `bodega`, `tipo_equipo`,
`unidad_equipo`, `historial_estado_equipo`, `log_auditoria`, `transferencia_equipo`,
`movimiento_inventario`, `stock_consumible`. Detalle en `03-base-de-datos.md`.

> **Nota sobre `empresa`:** la tabla existe en el esquema SQL, pero el código la mantiene como
> **constante hardcodeada** (`EMPRESAS` en `companies.service.ts`). Las entidades usan
> `id_empresa` como número simple, sin relación TypeORM a una entidad Empresa.
