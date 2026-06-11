# Evidencia de prueba — CU-16 a CU-19 (Aislamiento multiempresa)

**Fecha:** 2026-06-11
**Probado contra:** backend local `http://localhost:3003` (BDD PostgreSQL Railway)
**Usuarios de prueba:** `admin_cable / Cable1234` (ADMIN, Cable Mágico, empresa 2) y `superusuario / Super1234` (SUPERUSUARIO).

## Por qué la evidencia es por API y no por pantalla

Estos CUs garantizan que un usuario **no puede** ver ni tocar datos de la otra empresa. En la interfaz eso se ve como ausencia de datos (la UI de `admin_cable` simplemente no muestra nada de Finet), lo cual no demuestra que el bloqueo esté en el servidor. La propia Excepción 1 de los cuatro CUs define el escenario de prueba: *"el usuario intenta acceder mediante manipulación técnica (URL, parámetros o solicitudes HTTP)"*. La evidencia válida es entonces: **solicitud HTTP forzada → respuesta de rechazo → registro en auditoría**.

Para reproducir, obtener el token de `admin_cable`:

```bash
curl -X POST http://localhost:3003/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"nombre_usuario":"admin_cable","password":"Cable1234"}'
# usar el access_token en: -H "Authorization: Bearer <token>"
```

El recurso "ajeno" usado en todas las pruebas es la bodega **id 2 ("Bodega Central FiNet", empresa Finet)**, consultada con un usuario de Cable Mágico.

> Nota de diseño: el rechazo responde **404 "Bodega no encontrada"**, idéntico al de un id inexistente. Esto cumple la parte de la excepción que exige *"no revelar si el registro existe en la otra empresa"* (un 403 delataría su existencia). El "error de acceso no autorizado" queda registrado como `ACCESO_DENEGADO` en el log de auditoría.

## CU-16 — Consultando datos aislados por empresa

**Paso 1 (flujo normal):** `GET /api/bodegas` con token de `admin_cable` retorna solo bodegas de Cable Mágico:

```
3 Bodega Evidencia QA - Cable Mágico
```

El mismo endpoint con token de `superusuario` retorna las bodegas de ambas empresas. (Captura de pantalla equivalente: página Bodegas logueado con cada usuario.)

**Paso 2 (Excepción 1, manipulación de URL):** `GET /api/bodegas/2` y `GET /api/bodegas/2/stock` como `admin_cable`:

```json
{"message":"Bodega no encontrada","error":"Not Found","statusCode":404}
```

## CU-17 — Creando registro con aislamiento de empresa

**Excepción 1 (forzar la otra empresa por parámetros):** POST como `admin_cable` inyectando `id_empresa: 1` (Finet) en el body:

```bash
curl -X POST http://localhost:3003/api/bodegas -H "Authorization: Bearer <token>" \
  -H 'Content-Type: application/json' \
  -d '{"nombre":"Bodega CU17","direccion":"Calle Prueba 456","id_empresa":1}'
```

Respuesta — el sistema **ignora** el `id_empresa` del body y crea el registro en la empresa del JWT (2, Cable Mágico):

```json
{"id_bodega":5,"id_empresa":2,"nombre":"Bodega CU17","direccion":"Calle Prueba 456","activa":true}
```

(El `id_empresa` solo es seleccionable para el rol SUPERUSUARIO; para el resto siempre se toma del token.)

## CU-18 — Editando registro con aislamiento de empresa

**Excepción 1:** `PATCH /api/bodegas/2` como `admin_cable` intentando renombrar la bodega de Finet:

```json
{"message":"Bodega no encontrada","error":"Not Found","statusCode":404}
```

Verificación posterior con `superusuario`: la bodega 2 conserva su nombre `Bodega Central FiNet`.

## CU-19 — Eliminando/desactivando registro con aislamiento de empresa

**Excepción 1:** `DELETE /api/bodegas/2/desactivar` como `admin_cable`:

```json
{"message":"Bodega no encontrada","error":"Not Found","statusCode":404}
```

Verificación posterior: la bodega 2 sigue `activa: true`.

## Registro en auditoría (exigido por la Excepción 1 de los 4 CUs)

`GET /api/auditoria?accion=ACCESO_DENEGADO` como `superusuario` (también visible en la pantalla de Auditoría filtrando por acción):

```json
{
  "accion": "ACCESO_DENEGADO",
  "entidad_afectada": "bodega",
  "id_entidad_afectada": 2,
  "valor_nuevo": {
    "motivo": "Intento de acceso a bodega de otra empresa",
    "operacion": "MODIFICAR",
    "id_empresa_actor": 2
  },
  "usuario_nombre": "admin_cable",
  "descripcion": "Intento de acceso no autorizado a bodega #2"
}
```

Hay una entrada por cada intento (operaciones `CONSULTAR`, `CONSULTAR_STOCK`, `MODIFICAR`, `DESACTIVAR`).

## Cómo capturar las evidencias en pantalla

1. **UI:** login con `admin_cable` → pantalla Bodegas (solo Cable Mágico). Login con `superusuario` → ambas empresas. Dos capturas lado a lado = evidencia CU-16 flujo normal.
2. **Manipulación técnica:** los `curl` de arriba, o en Postman/Thunder Client (capturar request + response). También sirve editar la URL del navegador (`/bodegas/2`) logueado como `admin_cable`.
3. **Auditoría:** pantalla de Auditoría como `superusuario`, filtrando acción `ACCESO_DENEGADO` después de los intentos.

## Hallazgos corregidos durante esta prueba (2026-06-11)

Al generar esta evidencia se detectó que `PATCH /bodegas/:id`, `DELETE /bodegas/:id/desactivar` y `POST /bodegas/:id/umbral` **no verificaban la empresa del registro** (un admin de Cable Mágico podía editar bodegas de Finet). Se corrigió en `bodegas.service.ts`/`bodegas.controller.ts`: ahora las cinco operaciones sobre una bodega ajena responden 404 sin revelar existencia y registran `ACCESO_DENEGADO` en auditoría. Las respuestas de este documento corresponden al código ya corregido.
