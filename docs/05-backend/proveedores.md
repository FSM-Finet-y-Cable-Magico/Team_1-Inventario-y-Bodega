# Módulo `proveedores` — CU-49

**Carpeta:** `codigo/backend-inventario/src/proveedores/`

## Entidades

### `proveedor`
| Columna | Tipo | Notas |
|---------|------|-------|
| `id_proveedor` | SERIAL PK | |
| `nombre_comercial` | VARCHAR(100) NOT NULL | 3–100 caracteres |
| `rut` | VARCHAR(12) UNIQUE NOT NULL | Formato XXXXXXXX-X, DV validado (mód 11) |
| `nombre_contacto` | VARCHAR(80) | Opcional |
| `telefono` | VARCHAR(15) | Opcional, 8–15 dígitos |
| `email` | VARCHAR(150) | Opcional |
| `activa` | BOOLEAN DEFAULT TRUE | |
| `fecha_creacion` | TIMESTAMPTZ DEFAULT now() | |

> **Sin `id_empresa`:** el proveedor es global (compartido entre ambas empresas).

### `proveedor_tipo_equipo` (tabla puente N:M)
| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | SERIAL PK | |
| `id_proveedor` | INTEGER FK → `proveedor` | ON DELETE CASCADE |
| `id_tipo_equipo` | INTEGER FK → `tipo_equipo` | ON DELETE CASCADE |

Restricción UNIQUE en `(id_proveedor, id_tipo_equipo)`.

## Endpoints

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `POST` | `/api/proveedores` | ADMIN, SUPERUSUARIO | CU-49: crear proveedor |
| `GET` | `/api/proveedores` | ADMIN, SUPERUSUARIO | Listado (filtros: `buscar`, `activa`) |

## Validación de RUT (módulo 11)

`ProveedoresService.validarRut(rut)` y `calcularDV(rutNumero)` son reutilizables
para CU-75, CU-78, CU-80, CU-81. El helper:

1. Separa número del DV por el guión.
2. Multiplica cada dígito (de derecha a izquierda) por factores cíclicos 2..7.
3. DV = 11 − (suma mod 11). Si 11 → `'0'`, si 10 → `'K'`.

## Auditoría

- `CREAR` al registrar un proveedor nuevo.

## CUs cubiertos

| CU | Descripción |
|----|-------------|
| CU-49 | Crear proveedor con validación de RUT y tipos de equipo opcionales |
