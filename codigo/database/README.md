# Base de datos

Sistema de Inventario y Bodega (Grupo 1). PostgreSQL 15 o superior.

| Carpeta / archivo | Tipo | Contenido |
|---|---|---|
| `ddl/esquema-completo.sql` | DDL | Esquema final: 34 tablas, secuencias, índices y 72 claves foráneas. |
| `dml/datos-demostracion.sql` | DML | Datos de demostración (164 registros): empresas, bodegas, roles, usuarios de prueba, tipos de equipo, proveedores, unidades y movimientos. |
| `init.sql` | DDL | Esquema base que Docker Compose carga al crear el contenedor; el backend lo completa con `npm run migrar`. |
| `global/` | DDL y DML | Scripts para la base de datos compartida de los cuatro grupos en la VPS. |
| `poblar-equipos-vps.sql` | DML | Carga de equipos de prueba en la VPS. |

## Crear la base desde cero

```bash
createdb inventario
psql -d inventario -f ddl/esquema-completo.sql
psql -d inventario -f dml/datos-demostracion.sql
```

Usuarios de prueba que crea el DML (contraseñas de demostración, no de producción):

| Usuario | Contraseña | Rol |
|---|---|---|
| superusuario | Super1234 | SUPERUSUARIO |
| admin_finet | Finet1234 | ADMIN |
| admin_cable | Cable1234 | ADMIN |
| tecnico_qa | Tecnico1234 | TECNICO_TERRENO |
| tecnico_cable | TecnicoCable1234 | TECNICO_TERRENO |

## Cómo se generaron

Sobre una base vacía se ejecutó `init.sql`, luego `npm run migrar` y `npm run seed:qa`. Después se exportó con `pg_dump --schema-only` (DDL) y `pg_dump --data-only --column-inserts` (DML). Se verificó que, cargados en una base nueva, reproducen las 34 tablas y los 164 registros.
