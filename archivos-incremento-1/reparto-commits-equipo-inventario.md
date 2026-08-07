# Reparto sugerido para commits del equipo — Inventario y Bodega

Objetivo: mantener el avance completo de los 46 casos de uso del Incremento 1 y permitir que cada integrante suba una parte clara del código sin romper las entidades ni el esquema de base de datos compartido.

Stack real del proyecto: **capa vista SvelteKit (Svelte 5 + Vite + Tailwind + TypeScript)** y **backend NestJS + TypeORM + PostgreSQL**, organizado como monorepo (`backend-inventario/` y `frontend/`).

> Asignación de nombres orientativa: ajústenla según quién tomó cada módulo. Lo importante es que cada bloque toca archivos distintos para evitar conflictos de merge.

## Bloque A — Autenticación, sesión y seguridad

Casos cubiertos:

- CU-01 Iniciar sesión.
- CU-02 Verificar permisos del rol al acceder a una funcionalidad.
- CU-03 Bloquear acceso a recursos no autorizados.
- CU-11 Cerrar sesión automáticamente por inactividad.
- CU-12 Cerrar sesión del sistema.

Archivos principales:

- `backend-inventario/src/auth/` (auth.controller.ts, auth.service.ts, auth.module.ts, jwt.strategy.ts).
- `backend-inventario/src/auth/guards/roles.guard.ts` y `guards/company-isolation.guard.ts`.
- `backend-inventario/src/auth/decorators/` (roles.decorator.ts, current-user.decorator.ts) y `dto/login.dto.ts`.
- `frontend/src/routes/login/+page.svelte` y `frontend/src/lib/stores/auth.ts`.

Explicación corta:

Implementa el login con `bcrypt.compare` y emisión de JWT (`{ sub, nombre_usuario, id_empresa, roles }`), el `RolesGuard` que valida `@Roles(...)`, el bloqueo de recursos no autorizados con auditoría y el cierre de sesión (manual y por inactividad, vía expiración del token).

## Bloque B — Multiempresa, contexto y dashboard

Casos cubiertos:

- CU-13 Cargar contexto de empresa Finet.
- CU-14 Cargar contexto de empresa Cable Mágico.
- CU-15 Consultar dashboard consolidado de ambas empresas.
- CU-16 Consultar datos aislados por empresa.

Archivos principales:

- `backend-inventario/src/companies/` (companies.controller.ts, companies.service.ts, companies.module.ts).
- `backend-inventario/src/auth/guards/company-isolation.guard.ts` (aislamiento por `id_empresa`).
- `frontend/src/routes/dashboard/+page.svelte`.

Explicación corta:

Carga el contexto de empresa que viaja en el JWT (`id_empresa = 1` Finet / `2` Cable Mágico) y el `CompanyIsolationGuard` que inyecta `request.companyContextId`. El dashboard consolidado (solo Superusuario) agrupa unidades por estado, cuenta bodegas activas y suma stock por empresa.

## Bloque C — Usuarios, roles y auditoría

Casos cubiertos:

- CU-04 Crear usuario.
- CU-05 Listar usuarios.
- CU-06 Editar usuario.
- CU-07 Desactivar usuario.
- CU-10 Restablecer contraseña.
- CU-08 Registrar evento en el log de auditoría.
- CU-09 Consultar log de auditoría.

Archivos principales:

- `backend-inventario/src/usuarios/` (controller, service, module, entities `usuario.entity.ts` y `usuario-rol.entity.ts`, dto).
- `backend-inventario/src/roles/` (controller, service, module, entities `rol.entity.ts`, dto).
- `backend-inventario/src/auditoria/` (controller, service, module, entities `auditoria.entity.ts`, dto).
- `frontend/src/routes/usuarios/+page.svelte`, `frontend/src/routes/usuarios/[id]/+page.svelte`, `frontend/src/routes/auditoria/+page.svelte`.

Explicación corta:

Cubre el CRUD de usuarios con baja lógica (`activo = false`), el hash con `bcrypt.genSalt(12)`, las reglas de rol (un ADMIN no puede crear/editar SUPERUSUARIO, no se puede desactivar la propia cuenta) y el servicio transversal de auditoría que registra cada acción con `valor_anterior` / `valor_nuevo`.

## Bloque D — Catálogo de tipos de equipo

Casos cubiertos:

- CU-17, CU-18, CU-19 Crear / editar / desactivar tipo con aislamiento de empresa.
- CU-24 Crear tipo en el catálogo.
- CU-25 Consultar catálogo.
- CU-26 Editar tipo existente.
- CU-27 Desactivar tipo del catálogo.
- CU-28 Validar número de serie.
- CU-29 Adjuntar ficha técnica PDF.
- CU-30 Descargar ficha técnica.
- CU-31 Distinguir naturaleza del equipo (INDIVIDUALIZABLE / CONSUMIBLE).

Archivos principales:

- `backend-inventario/src/inventario/catalog.controller.ts` y `catalog.service.ts`.
- `backend-inventario/src/inventario/entities/tipo-equipo.entity.ts`.
- `frontend/src/routes/catalogo/+page.svelte` y `frontend/src/routes/catalogo/[id]/+page.svelte`.

Explicación corta:

Maneja el catálogo por empresa: validación de campos, nombre único, regla de consumible con unidad de medida, bloqueo del cambio de `requiereSerialNumber` cuando ya hay unidades, validación de serie con regex `/^[A-Z0-9-]{4,30}$/`, carga/descarga de ficha PDF (FileInterceptor, máx. 5 MB) y la clasificación que consume CU-32.

## Bloque E — Unidades de equipo, estados y garantía

Casos cubiertos:

- CU-32 Registrar unidad individualizable.
- CU-33 Consultar ficha de detalle de unidad.
- CU-34 Editar datos de unidad.
- CU-35 Gestionar transición de estado.
- CU-36 Registrar automáticamente el cambio de estado.
- CU-37 Consultar historial completo de estados.
- CU-38 Calcular vencimiento de garantía.
- CU-39 Mostrar indicador visual de garantía vigente.
- CU-40 Registrar diagnóstico técnico al enviar a revisión.

Archivos principales:

- `backend-inventario/src/inventario/units.controller.ts` y `units.service.ts`.
- `backend-inventario/src/inventario/entities/unidad-equipo.entity.ts` y `entities/historial-estado.entity.ts`.
- `backend-inventario/src/inventario/dto/editar-datos-unidad.dto.ts`.
- `frontend/src/routes/unidades/+page.svelte` y `frontend/src/routes/unidades/[id]/+page.svelte`.

Explicación corta:

Registra cada equipo físico (serie única en todo el sistema, MAC validada y única), la máquina de estados con `transicionesPermitidas`, el historial transaccional (CU-36), el cálculo de garantía (`fechaAdquisición + garantiaDias`) con su indicador visual y el diagnóstico obligatorio al pasar a "En revisión".

## Bloque F — Transferencias inter-empresa

Casos cubiertos:

- CU-20 Solicitar transferencia inter-empresa.
- CU-21 Aprobar transferencia (Superusuario).
- CU-22 Rechazar transferencia.
- CU-23 Consultar transferencias.

Archivos principales:

- `backend-inventario/src/transferencias/` (transferencias.controller.ts, transferencias.service.ts, transferencias.module.ts).
- `backend-inventario/src/transferencias/entities/transferencia.entity.ts` y `entities/movimiento-inventario.entity.ts`.
- `backend-inventario/src/transferencias/dto/create-transferencia.dto.ts`.
- `frontend/src/routes/transferencias/+page.svelte`.

Explicación corta:

Implementa el flujo transaccional (`queryRunner` ACID): solicitud que deja movimientos en `TRANSFERENCIA_PENDIENTE`, aprobación que recién cambia `id_empresa` e `id_bodega_actual` de cada unidad, rechazo con motivo obligatorio (≤ 200 caracteres) y consulta filtrada por estado/empresa/fecha.

## Bloque G — Bodegas y stock

Casos cubiertos:

- CU-41 Crear bodega.
- CU-42 Editar bodega.
- CU-43 Desactivar bodega.
- CU-44 Consultar listado de bodegas.
- CU-45 Consultar stock de bodega.
- CU-46 Configurar umbral de stock mínimo.

Archivos principales:

- `backend-inventario/src/bodegas/` (bodegas.controller.ts, bodegas.service.ts, bodegas.module.ts).
- `backend-inventario/src/bodegas/entities/bodega.entity.ts` y `entities/stock-consumible.entity.ts`.
- `backend-inventario/src/bodegas/dto/` (create-bodega.dto.ts, update-bodega.dto.ts, configurar-umbral.dto.ts).
- `frontend/src/routes/bodegas/+page.svelte` y `frontend/src/routes/bodegas/[id]/+page.svelte`.

Explicación corta:

CRUD de bodegas con nombre único por empresa y protección de la última bodega activa, listado enriquecido con responsable y stock, vista de stock agrupado por tipo y estado, y configuración del umbral mínimo (upsert sobre `stock_consumible`).

## Base compartida — coordinar antes de tocar

Estos archivos los usan todos; cambiarlos sin avisar genera conflictos:

- `backend-inventario/src/app.module.ts` (registro de cada módulo Nest).
- `backend-inventario/src/main.ts` y `src/config.ts`.
- Las **entidades** y el esquema de base de datos: no agregar/renombrar columnas sin coordinar.
- `backend-inventario/scripts/migrar.ts` y `scripts/seed-qa.ts` (scripts compartidos de BD).
- `frontend/src/lib/api/client.ts`, `lib/api/index.ts` y `lib/types/index.ts` (cliente HTTP y tipos compartidos).
- `frontend/src/lib/components/` y `src/routes/+layout.svelte` (componentes y layout comunes).

## Validación antes de subir

Capa controlador:

```powershell
cd backend-inventario
npm run build      # nest build
npm run test       # jest (si tu módulo tiene specs)
npm run lint
```

Capa vista:

```powershell
cd frontend
npm run check      # svelte-kit sync + svelte-check
npm run build      # vite build
```

Base de datos compartida:

```powershell
# No modifiques las entidades ni los scripts compartidos sin coordinar.
# Si necesitas datos de prueba, usa el seed del proyecto contra TU base local:
cd backend-inventario
npm run seed:qa    # ts-node scripts/seed-qa.ts
```

