# Sistema de Inventario y Bodega

Sistema fullstack de **inventario y bodega** para un ISP (empresas **Finet** y **Cable Mágico**).
~46 de ~94 casos de uso implementados (Incremento 1: CU-01 a CU-46).

| Capa | Tecnología |
|------|-----------|
| Frontend | SvelteKit + Svelte 5 + Tailwind CSS v4 (`codigo/frontend/`) |
| Backend | NestJS + TypeORM + PostgreSQL (`codigo/backend-inventario/`) |
| Infra | Docker Compose + Nginx (entrada única en `http://localhost`) |

---

## Documentación

**Lee primero [`docs/README.md`](docs/README.md)** (índice) y [`docs/01-flujo-de-trabajo.md`](docs/01-flujo-de-trabajo.md) (proceso).
Para agentes de IA: [`AGENTS.md`](AGENTS.md) es la guía de entrada obligatoria.

| Documento | Contenido |
|-----------|-----------|
| `docs/01-flujo-de-trabajo.md` | Proceso de trabajo (dev → rama → PR), definición de hecho, formatos de diagramas. |
| `docs/02-arquitectura.md` | Stack, Docker y seguridad transversal. |
| `docs/03-base-de-datos.md` | Esquema BDD, migraciones, seed. |
| `docs/04-frontend/` | Convenciones, design system, componentes, API y rutas del frontend. |
| `docs/05-backend/` | Convenciones y módulos del backend (endpoints, lógica, CU). |
| `docs/06-casos-de-uso-implementados.md` | Estado CU-01..46 y mapa CU → módulos/rutas. |
| `docs/07-guia-implementacion-cu.md` | Checklist paso a paso para implementar un CU nuevo. |
| `codigo/README.md` | Guía operativa de Docker (levantar, scripts, credenciales). |

La fuente de información de los casos de uso es `docs/casos-de-uso.json`
(lo coloca el jefe de grupo; es de solo lectura).

---

## Cómo levantar el sistema (Docker — la forma normal)

Todo vive en `codigo/`. La única instalación requerida es **Docker Desktop**.

```bash
cd codigo
docker compose up -d --build     # primera vez tarda varios minutos
# queda disponible en http://localhost
```

Otros comandos:

```bash
docker compose ps                # estado de los 4 servicios
docker compose logs -f           # logs
docker compose down              # detener (conserva datos)
docker compose down -v           # detener y borrar datos
```

Scripts de un clic (instalan Docker Desktop si falta): `Iniciar.command` (macOS),
`Iniciar.bat` (Windows). Ver `codigo/README.md` para el detalle completo.

### Datos de acceso (seed automático)

| Usuario | Contraseña | Rol | Empresa |
|---------|-----------|-----|---------|
| `superusuario` | `Super1234` | SUPERUSUARIO | Finet |
| `admin_finet` | `Finet1234` | ADMIN | Finet |
| `admin_cable` | `Cable1234` | ADMIN | Cable Mágico |
| `tecnico_qa` | `Tecnico1234` | TECNICO_TERRENO | Finet |
| `tecnico_cable` | `TecnicoCable1234` | TECNICO_TERRENO | Cable Mágico |

### Configuración opcional

Copiar `codigo/.env.example` como `codigo/.env` para personalizar credenciales de PostgreSQL,
secreto JWT o puerto de acceso.

---

## Cómo desarrollar (modo dev)

```bash
# Backend (NestJS en :3003)
cd codigo/backend-inventario
cp .env.template .env   # completar DATABASE_URL y JWT_SECRET
npm install
npm run start:dev

# Frontend (SvelteKit en :5173, proxy /api -> localhost:3003)
cd ../frontend
npm install
npm run dev
```

Migraciones y datos de prueba del backend:

```bash
cd codigo/backend-inventario
npm run migrar      # migraciones idempotentes de esquema
npm run seed:qa     # usuarios/empresas/bodegas de prueba
```

> Nota: `migrar` y `seed:qa` necesitan `DATABASE_URL` en el entorno (ver `.env.template`).

### Verificación antes de una Pull Request

```bash
# Backend
cd codigo/backend-inventario && npm run lint && npm run build
# Frontend
cd ../frontend && npm run check && npm run build
```

---

## Estructura del repositorio

```
├── AGENTS.md              ← guía de entrada para agentes de IA
├── docs/                  ← documentación del proyecto (ver arriba)
├── codigo/                ← EL SISTEMA (backend + frontend + docker + nginx)
├── Casos de uso/          ← evidencia visual (capturas) por CU implementado
├── diagramas/             ← diagramas (clases, componentes, secuencia por CU, BDD...)
└── archivos-incremento-1/ ← artefactos del Incremento 1
```

---

## Flujo de trabajo del equipo (resumen)

1. **Siempre se trabaja sobre `dev`**; cada desarrollador crea su propia rama (p. ej.
   `feat/CU-47-registrar-cliente`).
2. **Un CU se implementa completo** (front + back + BDD si aplica) junto con sus restricciones.
3. **Nunca push directo a `dev`**: todo llega vía **Pull Request** revisada por el jefe de grupo.
4. Los desarrolladores solo trabajan en casos de uso; bugs/cambios de cliente los gestiona el
   jefe de grupo.
5. **El diseño UI está cerrado** (no rediseñar). Detalle en `docs/01-flujo-de-trabajo.md`.
