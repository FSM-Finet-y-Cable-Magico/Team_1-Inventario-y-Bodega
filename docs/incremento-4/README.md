# Incremento 4

Cierre del proyecto: 99 CU en total (96 del Documento 0 + 3 nuevos del I4). El I4 aporta 3 CU
(3,03 %) y deja el acumulado en 100 %. El sistema queda desplegado en la VPS FiNet.

| CU | RF | Nombre | Módulo |
|----|----|--------|--------|
| CU-97 | RF-71 | Registrando toma de inventario físico y ajuste de diferencias | `tomas-inventario` |
| CU-98 | RF-72 | Desactivando proveedor | `proveedores` (+ validación en `ordenes-ingreso`) |
| CU-99 | RF-73 | Generando acta de toma de inventario en PDF | `tomas-inventario` |

Además, por la retroalimentación del I3, `scripts/migrar.ts` declara 45 FK que faltaban en el
modelo físico (ver `docs/03-base-de-datos.md`, «Relaciones del modelo físico»).

## Evidencia

- `evidencias/`: capturas de la app local con el seed QA (CU-97, CU-98, CU-99 y el acta PDF).
- `resultados/pruebas-api-*.txt`: llamadas reales a la API con su código HTTP (flujo normal y excepciones).
- `resultados/unitarios-i4.log`: 26 pruebas de los tres CU. `resultados/unitarios.log`: suite completa (174/174).
- `resultados/acta-toma-ejemplo.pdf`: acta generada por CU-99.
- Diagramas de secuencia: `diagramas/diagramas-secuencia/CU97`, `CU98`, `CU99`.
