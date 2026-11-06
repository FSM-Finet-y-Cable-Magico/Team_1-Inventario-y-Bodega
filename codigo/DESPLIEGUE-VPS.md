# Despliegue en la VPS FiNet (grupo 1 · Inventario)

Guía para dejar el sistema corriendo en la VPS compartida en lugar de Railway.
Usa `docker-compose.vps.yml` y `vps.env.example`, que están en esta misma carpeta.

## Lo que da la VPS

| Dato | Valor del grupo 1 |
|---|---|
| Acceso | `ssh grupo1@38.7.201.104` (contraseña entregada por el curso) |
| Carpeta | `/srv/finet/grupo1` |
| Puertos permitidos | 8100 a 8199 |
| Sistema | Ubuntu 20.04, Docker rootless con Compose y Buildx |

Docker es **rootless**: no hay `sudo` ni se puede abrir el puerto 80. Por eso el
compose de la VPS publica la app en `127.0.0.1:8100` y se entra por túnel SSH.

## Qué levanta el compose

| Servicio | Qué es | Expuesto |
|---|---|---|
| `db` | PostgreSQL 16 con volumen `pgdata` | No, solo red interna |
| `backend` | API NestJS (3003). Al arrancar migra el esquema y corre el seed | No |
| `frontend` | SvelteKit (3000) | No |
| `nginx` | Entrada única: `/api` al backend y `/` al frontend | `127.0.0.1:8100` |

## Paso 1 · Entrar a la VPS y clonar

```bash
ssh grupo1@38.7.201.104
cd /srv/finet/grupo1
git clone -b main https://github.com/FSM-Finet-y-Cable-Magico/Team_1-Inventario-y-Bodega.git
cd Team_1-Inventario-y-Bodega/codigo
```

El repo es público, así que el clon no pide credenciales. Se usa `main` porque
es la rama de producción.

## Paso 2 · Crear el `.env` con los secretos

```bash
cp vps.env.example .env
openssl rand -hex 24   # copiar el resultado como POSTGRES_PASSWORD
openssl rand -hex 32   # copiar el resultado como JWT_SECRET
nano .env              # reemplazar cada CAMBIAR
chmod 600 .env
```

- Usa contraseñas en hexadecimal (como las de `openssl`): caracteres como `@`, `:` o `/`
  rompen la `DATABASE_URL`.
- El `.env` queda solo en la VPS. No se sube al repo (`.gitignore` ya lo excluye).
- Si un grupo nos llama por API (`X-API-KEY`), copia en `INTEGRACION_API_KEYS` el mismo
  valor que hoy tiene esa variable en Railway. Lo mismo con `G3_INTEGRACION_URL` y
  `G3_INTEGRACION_API_KEY` si se usa CU-48. Si quedan vacías, la app funciona igual
  sin esas integraciones.

## Paso 3 · Levantar

```bash
docker compose -f docker-compose.vps.yml up -d --build
docker compose -f docker-compose.vps.yml ps
```

La primera vez tarda varios minutos (descarga imágenes y compila). Todos los servicios
deben quedar `running` y `backend` en `healthy`. Para comprobar desde la misma VPS:

```bash
curl http://127.0.0.1:8100/api/health/ping
```

Si algo falla, mira los registros:

```bash
docker compose -f docker-compose.vps.yml logs --tail=100 backend
```

## Paso 4 · Abrir la app desde tu computador

En otra consola **de tu computador** (no en la VPS):

```bash
ssh -N -L 127.0.0.1:18100:127.0.0.1:8100 grupo1@38.7.201.104
```

Deja esa ventana abierta y entra a **http://127.0.0.1:18100**. `Ctrl+C` cierra el túnel.

El seed crea los usuarios de demostración (por ejemplo `superusuario`). Cambia sus
contraseñas si la app la usará gente real.

## Paso 5 (opcional) · Traer los datos que hay hoy en Railway

Solo si quieren conservar lo que se cargó en Railway; si no, la base parte con el
esquema y el seed. Necesitas la URL **pública** de Postgres de Railway
(servicio Postgres, pestaña *Variables*, `DATABASE_PUBLIC_URL`).

```bash
cd /srv/finet/grupo1/Team_1-Inventario-y-Bodega/codigo
# 1. Detener la app (la base sigue arriba)
docker compose -f docker-compose.vps.yml stop backend frontend nginx

# 2. Volcar Railway a un archivo (pide la URL sin dejarla en el historial)
read -s -p "DATABASE_PUBLIC_URL de Railway: " RAILWAY_URL; echo
docker run --rm postgres:17-alpine pg_dump --clean --if-exists --no-owner --no-acl \
  "$RAILWAY_URL" > railway.sql
unset RAILWAY_URL

# 3. Cargarlo en la base de la VPS
docker compose -f docker-compose.vps.yml exec -T db \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < railway.sql

# 4. Volver a arrancar y borrar el volcado
docker compose -f docker-compose.vps.yml up -d
rm railway.sql
```

Algún aviso de `psql` sobre `transaction_timeout` es normal (viene de `pg_dump` 17) y
no afecta. Las fichas técnicas PDF subidas en Railway no viajan con la base; si
importan, hay que volver a subirlas.

## Integraciones con G3 y G8

El administrador de la VPS publicó solo las rutas de integración de cada grupo
con un nginx propio y certificado válido:

| Grupo | URL pública de integración | Llega a |
|---|---|---|
| G1 (nosotros) | `https://38.7.201.104:8143/api/integraciones/...` | `127.0.0.1:8100` |
| G3 | `https://38.7.201.104:8343/api/integraciones/...` | `127.0.0.1:8300` |

G3 y G8 nos llaman a esa URL con su `X-API-KEY`, que se configura en
`INTEGRACION_API_KEYS` del `.env`.

### Cargar equipos para las integraciones

`database/poblar-equipos-vps.sql` agrega unidades serializadas (ONT, routers,
decodificadores y switches, en bodega y asignadas a los técnicos del seed) y stock
de consumibles en ambas empresas. Se puede ejecutar más de una vez sin duplicar:

```bash
docker compose -f docker-compose.vps.yml exec -T db \
  sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < database/poblar-equipos-vps.sql
```

## Conectar a la BDD global (pendiente de acuerdo con el administrador y G8)

La BDD global de los 4 grupos es `crm_g8_prueba` (Postgres 15, contenedor de G8,
`127.0.0.1:15432`). Su esquema `public` ya tiene 29 de nuestras tablas; faltan 5, que
crea su administrador con `database/global/tablas-g1-faltantes.sql`.

Requisitos antes de cambiar:
1. Usuario de G1 en esa base con permisos sobre nuestras tablas (lo crea su administrador).
2. Una ruta de red desde nuestro contenedor al puerto (hoy los Docker rootless no ven el
   localhost del servidor).
3. Respaldo de la base propia.

Luego, en `.env`:

```
DATABASE_URL=postgresql://USUARIO_G1:CONTRASEÑA@HOST:PUERTO/crm_g8_prueba
OMITIR_MIGRACIONES=true
OMITIR_SEED=true
```

y `docker compose -f docker-compose.vps.yml up -d backend`. Para volver a la base propia,
basta con comentar esas tres líneas y repetir el comando.

## Actualizar a una versión nueva

Ya no hay despliegue automático: después de mergear a `main`, alguien entra a la VPS y ejecuta

```bash
cd /srv/finet/grupo1/Team_1-Inventario-y-Bodega/codigo
git pull origin main
docker compose -f docker-compose.vps.yml up -d --build
```

## Comandos útiles

| Para | Comando (agregar `-f docker-compose.vps.yml`) |
|---|---|
| Ver estado | `docker compose ps` |
| Ver registros | `docker compose logs --tail=100` |
| Detener | `docker compose stop` |
| Respaldo de la base | `docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > respaldo.sql` |
| Borrar todo, datos incluidos | `docker compose down -v` (no se puede deshacer) |

Los servicios tienen `restart: unless-stopped`, así que vuelven solos si se cae un
contenedor. Si la VPS se reinicia, depende de que el administrador haya dejado el
Docker rootless del grupo como servicio de arranque; si después de un reinicio
`docker ps` no responde, hay que pedírselo.

## Lo que hay que confirmar con quien administra la VPS

1. **Acceso público.** La guía de la VPS indica usar túnel SSH y no abrir servicios a
   Internet. Si la app la tiene que usar gente sin túnel (o la tienen que llamar otros
   grupos por API), hay que pedir un dominio o proxy hacia `127.0.0.1:8100`.
2. **Salida a Internet** desde la VPS (Docker Hub, npm y GitHub), necesaria para el build.
3. **Arranque del Docker rootless** al reiniciar la VPS.
