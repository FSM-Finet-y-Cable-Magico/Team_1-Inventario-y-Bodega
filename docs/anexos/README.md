# Anexos — JSON de casos de uso de los otros grupos

> **Qué es:** copia de los JSON de casos de uso de los grupos con los que compartimos el
> proyecto integral (Fuente: los archivos originales que compartió cada grupo; agregados a este
> repositorio el 2026-09-02). Son material de **referencia/anexo**: casi no se usarán en el día
> a día, pero dejan constancia de los dominios de los demás para la integración.
>
> **Nuestro JSON (T1):** `docs/casos-de-uso.json` (96 CUs, fuente de nuestra implementación).

## Contenido

| Archivo | Grupo | Sistema | CUs |
|---------|-------|---------|-----|
| `casos-de-uso-g2-portal-web.json` | **G2** | Portal Web y Sistema de Gestión | 80 |
| `casos-de-uso-g3-terreno-fsm.json` | **G3** | FSM de Gestión de Instalaciones y Monitoreo Técnico (Terreno) | 56 |
| `casos-de-uso-g8-crm.json` | **G8** | Sistema de Gestión Integral — CRM | 86 |

## Para qué sirven

- Cruzar CUs entre grupos y evitar duplicar trabajo (ver `docs/10-trazabilidad-entre-equipos.md`).
- Saber de quién es cada dominio de datos y qué endpoints consume/expone cada grupo
  (ver `docs/12-solicitud-endpoints-otros-grupos.md` y `docs/13-guia-global-endpoints-4-grupos.md`).

## Reglas

1. **Solo lectura.** Estos JSON son la especificación de CADA grupo; T1 no los modifica.
   Si un grupo actualiza su JSON, el jefe de grupo reemplaza el archivo aquí y avisa al equipo.
2. No implementamos CUs de estos JSON directamente: solo los nuestros (96) y los consumos
   acordados por endpoint.
