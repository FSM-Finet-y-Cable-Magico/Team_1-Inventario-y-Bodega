# Sistema de Inventario y Bodega

Sistema fullstack de **inventario y bodega** para un ISP (empresas **Finet** y **Cable Mágico**),
desarrollado por el **Grupo 1** del curso Ingeniería de Software (UNAB, 2026).

**Proyecto terminado: 99 de 99 casos de uso (100 %)**, entregados en 4 incrementos y aceptados por el
cliente (FIBERNET LIMITADA). Estado CU por CU en [`docs/08-roadmap.md`](docs/08-roadmap.md).

| Incremento | CU nuevos | Acumulado | Contenido principal |
|------------|-----------|-----------|---------------------|
| Incremento 1 | 46 | 46 (46,5 %) | Usuarios y roles, multiempresa, catálogo, unidades, bodegas y stock |
| Incremento 2 | 31 | 77 (77,8 %) | Proveedores y órdenes de ingreso, salidas a técnicos, revisión, bajas, préstamos y reportes |
| Incremento 3 | 19 | 96 (97,0 %) | Cierres de trabajo integrados con G3, clientes, notificaciones, exportación a Excel y PDF |
| Incremento 4 | 3 | 99 (100 %) | Toma de inventario (CU-97), desactivación de proveedores (CU-98) y acta en PDF (CU-99); despliegue en la VPS FiNet |

De los 99 CU, el Grupo 1 implementa 95; CU-63, CU-65, CU-66 y CU-67 los cubre el Grupo 3 (terreno/FSM)
y este sistema consume sus endpoints. La integración con G2 (portal web), G3 (terreno) y G8 (CRM) está
documentada en `docs/09` a `docs/13`.

**Equipo:** Kevin Cifuentes · Javier Farías · Tomás Heilenkötter · Javiera Morán · Uriel Navarrete.

| Capa | Tecnología |
|------|-----------|
| Frontend | SvelteKit + Svelte 5 + Tailwind CSS v4 (`codigo/frontend/`) |
| Backend | NestJS + TypeORM + PostgreSQL (`codigo/backend-inventario/`) |
| Infra | Docker Compose + Nginx (entrada única en `http://localhost`) |
| Producción | VPS FiNet compartida con los otros grupos (`codigo/docker-compose.vps.yml`, guía en `codigo/DESPLIEGUE-VPS.md`) |

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
| `docs/06-casos-de-uso-implementados.md` | Estado de los CU implementados y mapa CU → módulos/rutas. |
| `docs/07-guia-implementacion-cu.md` | Checklist paso a paso para implementar un CU nuevo. |
| `docs/08-roadmap.md` | **Estado de los 99 CU** (todos implementados; los 4 de G3 marcados como tales). |
| `docs/09-…` a `docs/13-…` | Integración con los otros grupos (G2/G3/G8): CUs compartidos, trazabilidad y endpoints acordados. |
| `docs/incremento-3/`, `docs/incremento-4/` | Evidencias y resultados de pruebas de cada incremento. |
| `codigo/README.md` | Guía operativa de Docker (levantar, scripts, credenciales). |
| `codigo/DESPLIEGUE-VPS.md` | Despliegue en producción en la VPS FiNet. |
| `codigo/database/README.md` | Base de datos: DDL, DML y cómo crear la base desde cero. |

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

Los usuarios de demostración y sus contraseñas los genera el seed automático
(`codigo/backend-inventario/scripts/seed-qa.ts`). No se publican en este repositorio;
solicítalos por el canal interno del equipo.

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

Para crear la base sin el backend, `codigo/database/` trae el esquema final (`ddl/esquema-completo.sql`:
34 tablas y 72 claves foráneas) y los datos de demostración (`dml/datos-demostracion.sql`).

### Verificación antes de una Pull Request

```bash
# Backend (incluye las pruebas unitarias: 174 en total)
cd codigo/backend-inventario && npm run lint && npm run build && npm test
# Frontend
cd ../frontend && npm run check && npm run build
```

---

## Estructura del repositorio

```
├── AGENTS.md              ← guía de entrada para agentes de IA
├── docs/                  ← documentación del proyecto (ver arriba)
├── codigo/                ← EL SISTEMA
│   ├── backend-inventario/  ← API NestJS (controladores, servicios, entidades, migraciones)
│   ├── frontend/            ← SvelteKit (vistas y rutas)
│   ├── database/            ← DDL, DML, init.sql y scripts de la BDD global
│   ├── nginx/               ← proxy de entrada única
│   └── docker-compose*.yml  ← entorno local y de la VPS
├── Casos de uso/          ← evidencia visual (capturas) por CU implementado
├── diagramas/             ← diagramas (clases, componentes, secuencia por CU, BDD...)
│   ├── incremento3/         ← modelos por área, MERE, ME, FN, burn charts, proceso final
│   └── incremento4/         ← modelo físico en ChartDB, componentes, MERE/MR/ME/FN, CU-97 a CU-99, gráficos
└── archivos-incremento-1/ ← artefactos del Incremento 1
```

---

## Flujo de trabajo del equipo (resumen)

1. **Siempre se trabaja sobre `dev`**; cada desarrollador mantiene **una sola rama propia**
   desde `dev` donde acumula sus CUs (p. ej. `feat/javier-cus`). No se crea una rama por CU.
2. **Un CU se implementa completo** (front + back + BDD si aplica) junto con sus restricciones.
3. **Nunca push directo a `dev`**: todo llega vía **Pull Request** revisada por el jefe de grupo.
4. Los desarrolladores solo trabajan en casos de uso; bugs/cambios de cliente los gestiona el
   jefe de grupo.
5. **El diseño UI está cerrado** (no rediseñar). Detalle en `docs/01-flujo-de-trabajo.md`.
