# Backend — Módulo `donaciones`

**Carpeta:** `codigo/backend-inventario/src/donaciones/` · **CU-80** · Depende de CU-78.

## 1. Endpoints

Controller-level: `@UseGuards(AuthGuard('jwt'), RolesGuard)` + `@Roles('ADMIN', 'SUPERUSUARIO')`.
Aislamiento por empresa manual en el service (patrón de `transferencias`/`bajas`).

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/donaciones` | Registra la donación (cabecera + detalles + auditoría en una transacción). |
| POST | `/api/donaciones/validar` | Comprueba los datos de la institución **sin registrar nada** (lo usa el flujo encadenado de la baja). |
| GET | `/api/donaciones` | Donaciones de la empresa del actor (el Superusuario ve ambas). |
| GET | `/api/donaciones/candidatas` | Unidades elegibles: `Dado de baja` con `motivo_baja = 'Donación a institución'` y sin donación previa. |
| GET | `/api/donaciones/:id/pdf` | Resumen descargable (`application/pdf`, `Content-Disposition: attachment`). |

## 2. Validaciones del formulario (mensajes acumulados, estilo catálogo)

| Campo | Regla |
|-------|-------|
| `nombre_institucion` | Obligatorio, 3–100 caracteres. |
| `rut_institucion` | Obligatorio, formato `XXXXXXXX-X` **y dígito verificador válido** (módulo 11). |
| `fecha_donacion` | Obligatoria, `YYYY-MM-DD`, **no futura** (comparada con la fecha en `America/Santiago`). |
| `numero_resolucion` | Opcional, 1–30 caracteres alfanuméricos (se admite `-`). |
| `ids_unidades` | Al menos un equipo. |

Los errores de formato se acumulan y se devuelven juntos en un `BadRequestException`.

## 3. Excepción 1 — NS que no cumplen la condición

Antes de abrir la transacción se revisa cada unidad. Se rechaza (con el motivo entre paréntesis) la
que no exista, sea de otra empresa, no esté `Dado de baja`, tenga otro `motivo_baja` o **ya figure en
otra donación**. El mensaje nombra todos los NS afectados:

```
Los siguientes equipos no están dados de baja con motivo 'Donación a institución' y deben
quitarse del listado: SN-CU78-004 (estado actual: En bodega).
```

El frontend usa esos NS para resaltarlos en rojo en el selector.

## 4. El PDF se genera sin dependencias nuevas

`pdf.ts` arma el archivo con las primitivas del formato PDF 1.4: fuentes base-14 (Helvetica para el
texto, **Courier para la tabla**, que es la única forma de que las columnas cuadren) y
`WinAnsiEncoding`, que cubre los acentos del español. No hay imágenes ni ajuste de línea automático;
las páginas se cortan cada ~46 líneas.

**Por qué no `pdfkit`:** agregar una dependencia requiere aprobación del jefe de grupo. Si se
aprueba, se reemplaza `pdf.ts` sin tocar el resto del módulo (`construirPdf(lineas)` es la única
superficie que usa el service). La exportación genérica de reportes es CU-92/CU-93 y **no** debe
reutilizar este helper sin revisarlo.

Contenido del resumen: institución, RUT, fecha, número de resolución, empresa donante, quién la
registró, fecha de emisión y la tabla de equipos (NS, tipo, marca, modelo, fecha de adquisición).

> El caso de uso menciona "valores" de los equipos: **el esquema no guarda costo ni valor de
> adquisición** de una unidad, así que el PDF lista la fecha de adquisición. Si el cliente necesita
> el monto, hay que agregar el campo al modelo (consultar al jefe de grupo).

## 4.1 Dos caminos hacia el mismo endpoint

| Camino | Cuándo |
|--------|--------|
| `/unidades/[id]` → baja con motivo `Donación a institución` | La baja abre un segundo paso con los datos de la institución y registra la donación del equipo recién dado de baja (un equipo). |
| `/bajas` → pestaña Donaciones | Donación de varios equipos ya dados de baja con ese motivo. |

Ambos llaman a `POST /api/donaciones`; la validación es la misma, porque el endpoint exige que las
unidades ya estén `Dado de baja` con motivo `Donación a institución`. Por eso el flujo encadenado
**registra primero la baja** y después la donación.

Como la baja es irreversible, antes de ejecutarla el frontend llama a **`POST /api/donaciones/validar`**
con los datos de la institución: si el RUT tiene un dígito verificador incorrecto, la fecha es futura
o el nombre no cumple el largo, el error se muestra en el formulario y **el equipo no se da de baja**.
Sin esa comprobación previa el cliente solo validaba el formato del RUT y una baja irreversible podía
quedar registrada con una donación que después fallaba.

## 5. Auditoría

| Acción | Cuándo |
|--------|--------|
| `DONACION` | Al registrar la donación: institución, RUT, fecha, resolución y los NS incluidos. |

## 6. Pruebas

`src/donaciones/pdf.spec.ts` comprueba la estructura del PDF (cabecera, catálogo, escape de
caracteres, offsets reales de la tabla `xref` y paginación):

```bash
cd codigo/backend-inventario && npx jest src/donaciones
```
