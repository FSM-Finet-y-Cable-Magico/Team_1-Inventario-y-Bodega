# Backend — Módulos `auditoria`, `companies` y `health`

## Módulo Auditoría

**Carpeta:** `codigo/backend-inventario/src/auditoria/`
**Importante:** el módulo es **`@Global`** y exporta `AuditoriaService`, por eso todos los
módulos pueden inyectarlo directamente.

### 1. Endpoints

Controller-level: `@UseGuards(AuthGuard('jwt'), RolesGuard)`.

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| POST | `/api/auditoria` | `ADMIN` | Crear entrada manual (solo para peticiones manuales; el `create` real se usa automáticamente desde otros services). |
| GET | `/api/auditoria` | `ADMIN`, `SUPERUSUARIO` | CU-08/09: listar con filtros y paginación. |

### 2. Lógica del service

- **Mapa `VERBOS`**: traduce `accion` a descripciones legibles (LOGIN, LOGOUT, CREAR, ACTUALIZAR,
  DESACTIVAR, RESTABLECER_PASSWORD, CAMBIAR_PASSWORD, ACCESO_DENEGADO...). **CU-08:** descripción
  breve, máx. 200 caracteres.
- **`descripcionEvento`**: el LOGOUT distingue `inactividad` ("Cierre de sesión por inactividad")
  vs. manual (CU-11/12).
- **`create(...)`**: reintenta la grabación hasta 3 veces antes de propagar error.
- **`findAll(filtros)`** (CU-09):
  - Filtros directos: `id_usuario`, `accion`, `entidad_afectada`, rango `fecha_inicio/fecha_fin`
    (`Between`).
  - **CU-09:** filtros por nombre de usuario (`ILIKE` parcial) o `id_empresa` del actor.
  - Paginación `pagina`/`limite` (default 20), orden `fecha_hora DESC`.
  - Enriquece cada log con `usuario_nombre`, `empresa` (mapa `EMPRESAS`) y `descripcion`
    (resuelve nombres en una sola query con `In(...)`).

### 3. Entidad y DTOs

- **`log_auditoria`** → `auditoria.entity.ts`: `id_log`, `id_usuario`, `accion`, `entidad_afectada`,
  `id_entidad_afectada`, `valor_anterior` (jsonb), `valor_nuevo` (jsonb NOT NULL), `ip_origen`
  (inet), `fecha_hora`.
- `create-auditoria.dto.ts`: campos planos (sin validación).
- `filtrar-auditoria.dto.ts`: numéricos con `@Type(() => Number)`.

### 4. Cómo registrar auditoría desde un CU nuevo

```ts
import { AuditoriaService } from 'src/auditoria/auditoria.service';

// en el constructor:
constructor(private readonly auditoriaService: AuditoriaService) {}

// al mutar:
await this.auditoriaService.create({
  id_usuario: actor.id_usuario,
  accion: 'CREAR',
  entidad_afectada: 'cliente',
  id_entidad_afectada: nuevo.id,
  valor_anterior: null,
  valor_nuevo: { nombre: nuevo.nombre },
});
```

---

## Módulo Companies

**Carpeta:** `codigo/backend-inventario/src/companies/`

### 1. Endpoints

Controller-level: `@UseGuards(AuthGuard('jwt'), RolesGuard)`.

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| GET | `/api/empresas` | `ADMIN`, `SUPERUSUARIO` | CU-06: lista de empresas (para selectores). |
| GET | `/api/empresas/dashboard` | `SUPERUSUARIO` | CU-15: dashboard consolidado (ambas empresas). |
| GET | `/api/empresas/mi-dashboard` | `ADMIN`, `SUPERUSUARIO`, `ADMIN_BODEGA`, `TECNICO_TERRENO` | CU-16: dashboard de la empresa del actor + CU-20 (transferencias pendientes). |

### 2. Lógica del service

- **`EMPRESAS`** (líneas 12-15): **constante hardcodeada** `[{id:1,'Finet'},{id:2,'Cable Mágico'}]`.
  Es la fuente de verdad de empresas en todo el sistema (importada por `usuarios.service`,
  `auditoria.service`, `transferencias.service`). **No convertirla en tabla sin consultar al jefe.**
- **`findAll()`**: devuelve el array para selectores (CU-06).
- **`getDashboard()`** (CU-15): consolida `getEstadisticasEmpresa` de ambas empresas.
- **`getMiDashboard(actor)`** (CU-16): estadísticas de la empresa del actor +
  `transferencias_pendientes` (CU-20) + `bajas_pendientes` (CU-78, solo ADMIN/SUPERUSUARIO).
- **`getTransferenciasPendientes(actor)`** (CU-20): movimientos `TRANSFERENCIA_PENDIENTE`,
  agrupados por `referencia_id`; aislamiento por rol: SUPERUSUARIO ve todas, Admin solo las de su
  empresa (origen o destino). Se expone en la **campana de notificaciones** del Header.
- **`getEstadisticasEmpresa(id, nombre)`**:
  - **CU-79:** `total_unidades` es el **inventario activo** (excluye `'Dado de baja'`) y
    `unidades_dadas_de_baja` expone ese conteo por separado.
  - `unidades_por_estado` (conteo por `estado`, **incluye** `'Dado de baja'`: el histórico
    sigue siendo consultable).
  - `bodegas_activas` (conteo).
  - `stock_consumible_total` (suma de `cantidad_disponible` de la empresa).
  - **CU-46:** `alertas_stock_minimo` — para tipos serializados el stock = conteo de unidades
    `'En bodega'`; para consumibles = `cantidad_disponible`. Solo considera umbrales
    `NOT NULL` y `> 0`.

---

## Módulo Health

**Carpeta:** `codigo/backend-inventario/src/health/`

| Método | Ruta | Guards |
|--------|------|--------|
| GET | `/api/health/ping` | público → `{ message: 'Backend vivo', time }` |
| GET | `/api/health/db` | público → prueba manual de conexión a BD (información de tablas) |

Usado por el healthcheck de Docker (`docker-compose.yml`).

---

## CU cubiertos
CU-06 (empresas en selector), CU-08 (ver log de auditoría), CU-09 (filtrar auditoría),
CU-15 (dashboard consolidado), CU-16 (mi dashboard), CU-20 (transferencias pendientes + campana),
CU-46 (alertas de stock en dashboard).
