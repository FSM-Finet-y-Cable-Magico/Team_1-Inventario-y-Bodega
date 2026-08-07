# Inventario y Bodega · Setup con Docker

Este proyecto está contenerizado para poder ejecutarse en cualquier computadora con
**Docker Desktop**, sin necesidad de instalar Node.js, PostgreSQL ni nada más.

- **Frontend:** SvelteKit (servidor de producción `adapter-node`)
- **Backend:** NestJS (API REST en `/api`)
- **Base de datos:** PostgreSQL
- **Proxy:** Nginx (punto de entrada único)

## Requisitos

La única instalación que necesita cada computadora es **Docker Desktop**
(es el "motor" que ejecuta todo; es inevitable instalarlo una vez por máquina).
El script **`Iniciar` lo instala automáticamente si falta**.

## Instalación y arranque (lo más simple posible)

Hay **un solo archivo** que hace todo: `Iniciar`.

| Sistema | Archivo | Qué hace |
| ------- | ------- | -------- |
| macOS | Doble clic en **`Iniciar.command`** | Instala Docker Desktop si falta → lo arranca → levanta la app → abre el navegador |
| Windows | Doble clic en **`Iniciar.bat`** | Igual (puede pedir reiniciar una vez) |

La primera vez tarda varios minutos (descarga Docker e imágenes, compila).
Después queda en **http://localhost**.

### Paso a paso (para no equivocarse)

1. Abrir Docker Desktop y esperar a que diga "Engine running".
2. Hacer doble clic en `Iniciar.command` (macOS) o `Iniciar.bat` (Windows).
3. La primera vez tarda varios minutos (compila backend y frontend).
4. Se abre el navegador en **http://localhost** automáticamente.

### Otros scripts

| Archivo | Qué hace |
| ------- | -------- |
| `Iniciar.command` / `Iniciar.bat` | TODO en uno: instala Docker si falta, levanta todo y abre el navegador |
| `stop.sh` / `Detener.bat` | Apaga todo (los datos se conservan) |
| `reset.sh` / `Restablecer.bat` | Borra los datos y deja todo como el primer día |

### Comandos manuales (alternativa avanzada)

```bash
docker compose up -d --build   # levantar
docker compose ps              # ver el estado de los 4 servicios
docker compose logs -f         # ver los logs
docker compose down            # detener (conserva datos)
docker compose down -v         # detener y borrar datos
```

## Datos de acceso (usuarios de demostración)

El sistema arranca con datos de ejemplo (seed automático). Credenciales:

| Usuario        | Contraseña        | Rol            | Empresa      |
| -------------- | ----------------- | -------------- | ------------ |
| `superusuario` | `Super1234`       | SUPERUSUARIO   | Finet        |
| `admin_finet`  | `Finet1234`       | ADMIN          | Finet        |
| `admin_cable`  | `Cable1234`       | ADMIN          | Cable Mágico |
| `tecnico_qa`   | `Tecnico1234`     | TECNICO_TERRENO| Finet        |
| `tecnico_cable`| `TecnicoCable1234`| TECNICO_TERRENO| Cable Mágico |

## Detener y reiniciar

```bash
# Detener (los datos se conservan)
docker compose down

# Detener y borrar también los datos de la base de datos
docker compose down -v
```

## Configuración opcional

Todas las opciones tienen valores por defecto; no hace falta configurar nada.

### Cambiar credenciales de la base / secreto JWT

Copiar `.env.example` como `.env` en esta carpeta y editar los valores:

```bash
cp .env.example .env
```

### Cambiar el puerto de acceso

Si el puerto 80 está ocupado, editar `docker-compose.yml` y cambiar:

```yaml
ports:
  - "8080:80"   # acceso por http://localhost:8080
```

### Recargar desde cero (recrear la base)

```bash
docker compose down -v
docker compose up -d --build
```

## Arquitectura

```
                ┌─────────────────────────────────────────────┐
                │  http://localhost                            │
                │        (Nginx, puerto 80)                    │
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

- La base de datos persiste en un volumen (`pgdata`); los archivos PDF de fichas
  técnicas en otro (`uploads_data`).
- El esquema se crea automáticamente en el primer arranque (archivo
  `database/init.sql`).
- Migraciones y seed de datos se ejecutan automáticamente al arrancar el backend
  (ambos son idempotentes).

## Desarrollo (opcional, sin Docker)

```bash
# Backend
cd backend-inventario
cp .env.template .env   # completar DATABASE_URL y JWT_SECRET
npm install
npm run start:dev

# Frontend
cd ../frontend
npm install
npm run dev             # http://localhost:5173 (proxy /api -> localhost:3003)
```
