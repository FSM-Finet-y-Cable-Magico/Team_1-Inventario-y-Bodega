# Diagrama de componentes — Sistema de Gestión Integral de Inventario

Diagrama de componentes UML de la arquitectura **ya funcional** del incremento
(CU-01 a CU-46), generado leyendo el código real (`backend-inventario/` y `frontend/`).
Sigue las mismas convenciones aprobadas para los diagramas de secuencia
(`diagramas-secuencia/_guia/GUIA-DIAGRAMAS.md`): monocromo, nomenclatura
`V_` / `C_`, capas explícitas, `C_TypeORM` como único componente de acceso a datos.

Archivos: `diagrama-componentes.puml` (fuente) + `diagrama-componentes.png` (exportado).

## Versión 2 — estilo draw.io (alternativa para presentar)

Misma arquitectura, dibujada con la notación visual del ejemplo de otro grupo
(módulos UML con icono, puertos, interfaz lollipop, flechas punteadas con etiquetas):

- `diagrama-componentes-v2.drawio.xml` — fuente editable en [app.diagrams.net](https://app.diagrams.net) (Archivo → Abrir)
- `diagrama-componentes-v2.png` — exportado en alta resolución

Diferencias con la v1: las vistas se agrupan en un solo módulo «Vistas del Sistema»,
la seguridad aparece como componente «Middleware» (ValidationPipe · JWT · Roles · Empresa),
y no lleva la anotación de CU por componente (el ejemplo de referencia no la usa;
la trazabilidad CU → componente queda en la tabla de abajo). A diferencia del
sistema CRM del otro grupo, el nuestro **no tiene integraciones externas**, por lo
que esa sección no existe en nuestro diagrama.

## Capas y componentes (trazado contra el código)

| Capa | Componentes | Fuente real |
|------|-------------|-------------|
| **Presentación** (SPA SvelteKit) | `V_Login`, `V_Dashboard`, `V_Usuarios`, `V_Auditoria`, `V_Catalogo`, `V_Unidades`, `V_Transferencias`, `V_Bodegas` + `C_ClienteAPI` + Store de sesión | `frontend/src/routes/*`, `frontend/src/lib/api/client.ts`, `frontend/src/lib/stores/auth.ts` |
| **Controladores** (NestJS) | 9 controladores REST + seguridad transversal (`ValidationPipe`, `JwtAuthGuard`, `C_RolesGuard`, `C_CompanyIsolationGuard`) | `backend-inventario/src/*/*.controller.ts`, `src/auth/guards/` |
| **Servicios** (lógica de negocio) | 9 servicios; todos los de negocio delegan el registro de eventos en `C_AuditoriaService` (CU-08) | `backend-inventario/src/*/*.service.ts` |
| **Persistencia** | `C_TypeORM` (`Repository<T>` / `DataSource`) | módulos con `TypeOrmModule.forFeature(...)` |
| **Base de datos** | PostgreSQL con 11 tablas (`@Entity`) | `backend-inventario/src/*/entities/` |

## Trazabilidad de casos de uso del incremento

| Componente | Casos de uso |
|------------|--------------|
| `C_AuthController` / `C_AuthService` | CU-01, CU-10, CU-11, CU-12 |
| `C_RolesGuard` (seguridad transversal) | CU-02, CU-03 |
| `C_UsuariosController` / `C_UsuariosService` | CU-04 a CU-07 |
| `C_AuditoriaService` (registro) / `C_AuditoriaController` (consulta) | CU-08 / CU-09 |
| `C_CompaniesController` / `C_CompaniesService` | CU-13 a CU-16 |
| `C_CompanyIsolationGuard` (seguridad transversal) | CU-17 a CU-19 |
| `C_TransferenciasController` / `C_TransferenciasService` | CU-20 a CU-23 |
| `C_CatalogController` / `C_CatalogService` | CU-24 a CU-31 |
| `C_UnitsController` / `C_UnitsService` | CU-32 a CU-40 |
| `C_BodegasController` / `C_BodegasService` | CU-41 a CU-46 |

## Cómo regenerar la imagen

```bash
cd diagrama-componentes
curl -s -X POST https://kroki.io/plantuml/png \
  -H "Content-Type: text/plain" \
  --data-binary "@diagrama-componentes.puml" \
  -o diagrama-componentes.png
```

(Si Kroki no responde, el servidor oficial `plantuml.com/plantuml` también lo renderiza.)
