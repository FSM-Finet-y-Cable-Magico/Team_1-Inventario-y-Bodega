# Backend — Módulo `alertas`

**Carpeta:** `codigo/backend-inventario/src/alertas/` · **CU-94** (RF-68, módulo 7.3.14 Alertas y
notificaciones).

## 1. Endpoints

Controller-level: `@UseGuards(AuthGuard('jwt'), RolesGuard)`. Aislamiento por empresa manual en el
service (patrón de `prestamos`/`companies`).

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| GET | `/api/alertas` | `ADMIN_BODEGA`, `ADMIN`, `SUPERUSUARIO` | CU-94: alertas activas del dashboard. |

- `TECNICO_TERRENO` no es actor del CU: `RolesGuard` responde 403 y audita `ACCESO_DENEGADO`
  (el frontend no llama al endpoint para ese rol).
- Es una consulta: **no audita** (mismo criterio que CU-77 y CU-83).

## 2. Sin persistencia: las alertas se calculan al vuelo

El módulo **no tiene entidades ni migraciones**. En cada `GET` se recalculan las cuatro categorías
reutilizando la consulta del CU de origen, para que las cifras coincidan siempre con esas pantallas.
La persistencia de notificaciones (leídas / no leídas) es **CU-96**.

| Tipo (literal exacto) | Regla | Fuente reutilizada | Fecha/hora de generación |
|-----------------------|-------|--------------------|--------------------------|
| **(A) `Stock bajo umbral`** | Stock activo de un tipo en una bodega `<` umbral configurado (umbral `> 0`). Serializados: conteo de unidades `'En bodega'`; consumibles: `cantidad_disponible`. | `CompaniesService.getAlertasStockMinimo(idEmpresa)` (CU-46) | Fecha de evaluación (`now()`). |
| **(B) `Garantía con defecto`** | Unidad `'En revisión'` con `fecha_venc_garantia >= hoy` (zona `America/Santiago`, criterio de CU-39). | `UnitsService.listarEnRevision(actor)` (CU-77) | Último cambio a `'En revisión'` en el historial (si la unidad no tiene historial, la fecha de evaluación). |
| **(C) `Préstamo vencido`** | Préstamo `PRESTAMO_EXTERNO` (PE-XXXXX) `ACTIVO` con `dias_restantes < 0`. Las reparaciones externas (CU-75) **no** se incluyen. | `PrestamosService.listar({ estado: 'ACTIVO' }, actor)` (CU-83, días calculados en el servidor) | Fecha estimada de retorno a las `00:00:00`. |
| **(D) `Revisión prolongada`** | Unidad `'En revisión'` con `dias_en_revision > 30`. Registrar el resultado (CU-72/74/75) saca la unidad de ese estado, así que seguir en él equivale a "sin resultado registrado". | `UnitsService.listarEnRevision(actor)` (CU-77) | Último cambio a `'En revisión'`. |

Una misma unidad puede generar **B y D** a la vez (en revisión hace más de 30 días y con garantía
vigente): son alertas distintas.

## 3. Respuesta

```json
[
  {
    "tipo": "Stock bajo umbral",
    "empresa": "Finet",
    "descripcion": "ONT QA Finet en Bodega Finet Central: 1 disponibles (umbral: 5).",
    "fecha_hora": "2026-09-28T05:14:29.488Z"
  }
]
```

- `descripcion`: máximo **100 caracteres** (si se pasa, se recorta con `...`). Textos por tipo:
  - A: `[TIPO] en [BODEGA]: [N] disponibles (umbral: [U]).`
  - B: `Equipo [NS] ([TIPO]) en revisión con garantía vigente hasta [DD/MM/YYYY].`
  - C: `Préstamo [PE-XXXXX] a [RECEPTOR]: vencido hace [N] día(s).`
  - D: `Equipo [NS] ([TIPO]) lleva [N] días en revisión sin resultado registrado.`
- Orden: A → B → C → D (el del caso de uso) y, dentro de cada tipo, las más recientes primero.
- **Excepción 1:** sin alertas la respuesta es `200 []` (no es error). El frontend muestra
  `No hay alertas activas actualmente.`

## 4. Aislamiento por empresa

- **Superusuario:** ve las alertas de ambas empresas (columna Empresa).
- **Administrador / Administrador de bodega:** solo las de su `id_empresa`. Los servicios
  reutilizados (`listarEnRevision`, `PrestamosService.listar`) ya aplican esa misma regla; para el
  stock se recorre solo la empresa del actor.

## 5. Cambios en otros módulos (solo para reutilizar)

| Módulo | Cambio |
|--------|--------|
| `companies` | La regla de CU-46 se extrajo a `getAlertasStockMinimo(id)` (pública, tipada con `AlertaStockMinimo`) y `CompaniesModule` exporta `CompaniesService`. `getEstadisticasEmpresa` la sigue usando igual. |
| `prestamos` | `PrestamosModule` exporta `PrestamosService`. |
| `inventario` | `listarEnRevision` (CU-77) agrega `fecha_venc_garantia` a cada fila (campo nuevo, no rompe el contrato). |

## 6. Cómo forzar cada alerta con los datos de QA

Con el seed (`npm run seed:qa`) no hay alertas (E1). Para probar cada tipo:

| Tipo | Cómo forzarla |
|------|---------------|
| A | `admin_finet`: `POST /api/bodegas/:id/umbral` con `{ id_tipo_equipo: <ONT QA Finet>, umbral: 5 }` (hay 1 unidad `En bodega`). |
| B | `admin_finet`: pasar `QA-ONT-F-0002` a `En revisión` (garantía vigente hasta 15/01/2027). |
| C | `admin_cable`: préstamo de `QA-ONT-C-0001` y luego `UPDATE prestamo_externo SET fecha_retorno_estimada = current_date - 3 WHERE correlativo = 'PE-00001';` |
| D | `admin_cable`: pasar `QA-ONT-C-0003` a `En revisión` y luego `UPDATE historial_estado_equipo SET fecha_hora = now() - interval '40 days' WHERE id_unidad = <id> AND estado_nuevo = 'En revisión';` |

Aislamiento: `admin_finet` ve solo A y B, `admin_cable` solo C y D y `superusuario` las cuatro.

## 7. CU cubiertos

CU-94 (flujo normal + Excepción 1). Diagramas: `diagramas/diagramas-secuencia/CU94/`.
