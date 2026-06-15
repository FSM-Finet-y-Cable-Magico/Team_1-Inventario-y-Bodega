# Diagrama de Clases — Backend

Diagrama de clases del backend NestJS (`backend-inventario/`), generado a partir del código fuente en `src/`.

Es un **documento vivo (metodología Scrum++)**: se actualiza al cierre de cada incremento para reflejar el estado real del código. Última actualización: **Incremento 2** (12/06/2026), incluye las correcciones QA de CU-26 a CU-46 (eliminación física de tipos, descarga de ficha técnica, ingreso de consumibles, umbrales para serializados, etc.).

## Contenido

- `diagrama-clases-backend.puml` — fuente PlantUML del diagrama.
- `diagrama-clases-backend.png` — render (~3000 px de ancho).
- `diagrama-clases-backend.svg` — render vectorial (recomendado para hacer zoom sin pérdida).

## Organización del diagrama

El diagrama se lee de arriba hacia abajo siguiendo el flujo de una petición:

| Capa | Clases |
|---|---|
| **1. Controladores (API REST)** | Roles, Usuarios, Auth, Bodegas, Companies (empresas), Catalog (catálogo), Units (unidades), Transferencias, Auditoría, Health |
| **2. Servicios** | Uno por módulo; cada controlador apunta a su servicio (columnas alineadas) |
| **3. Entidades TypeORM** | Usuario, Rol, UsuarioRol, Bodega, StockConsumible, TipoEquipo, UnidadEquipo, HistorialEstado, Transferencia, MovimientoInventario, Auditoria |
| **Apoyo: Seguridad** | JwtStrategy, RolesGuard, CompanyIsolationGuard (guards globales) |
| **Apoyo: DTOs** | Validación con `class-validator` por módulo |

Para mantener el diagrama legible se omiten dos familias de flechas, documentadas en la leyenda:

- Las clases marcadas `<<audita>>` inyectan `AuditoriaService` (transversal).
- Cada controlador valida su entrada con los DTOs de su propio módulo.

## Cómo renderizar

Con PlantUML instalado (requiere Java):

```bash
plantuml diagrama-clases-backend.puml          # PNG
plantuml -tsvg diagrama-clases-backend.puml    # SVG
```

Sin instalar nada, con Docker:

```bash
docker run --rm -v "$PWD:/data" plantuml/plantuml -tpng /data/diagrama-clases-backend.puml
```

O pegar el contenido del `.puml` en <https://www.plantuml.com/plantuml>.
