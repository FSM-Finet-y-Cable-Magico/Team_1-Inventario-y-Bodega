# Team 1 — Inventario y Bodega

Backend REST con NestJS + TypeORM conectado a PostgreSQL (Railway).

## Stack

- NestJS (puerto 3003)
- TypeORM con PostgreSQL
- Base de datos en Railway

## Lo que hay hasta ahora

- **Conexión a la BD** — TypeORM configurado y conectado a Railway PostgreSQL
- **Health checks** (`/health/ping`, `/health/db`) — verifican si el backend está vivo y si la BD responde
- **Entidad `Usuario`** con campos: `id_usuario`, `id_empresa`, `nombre_completo`, `nombre_usuario`, `email`, `password_hash`, `activo`, `fecha_creacion`
- **Módulo `Usuarios`** — estructura base generada (controller, service, DTOs), sin endpoints implementados aún

## Pendiente / notas

- Faltan FK relacionales (empresa, rol)
- Falta implementar los endpoints CRUD de usuarios
- El `ConfigModule` no está configurado como global (la URL de la BD va hardcodeada por ahora)
- Revisar si `synchronize` debe activarse o si se usan migraciones

## Levantar el proyecto

```bash
cd backend-inventario
npm install
npm run start:dev
```
