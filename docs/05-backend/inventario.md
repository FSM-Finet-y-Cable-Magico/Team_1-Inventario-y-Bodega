# Backend — Módulo `inventario` (catálogo + unidades)

**Carpeta:** `codigo/backend-inventario/src/inventario/`

Dos controladores bajo el mismo módulo:
- `CatalogController` → ruta base `catalogo` (tipos de equipo).
- `UnitsController` → ruta base `unidades` (unidades individuales y consumibles).

Ambos usan `@UseGuards(AuthGuard('jwt'), CompanyIsolationGuard, RolesGuard)`.
**`CompanyIsolationGuard` exige `id_empresa` y setea `req.companyContextId`.**

> **Concepto pivote:** `CatalogService.determinarNaturalezaEquipo()` clasifica cada tipo según
> `requiereSerialNumber`: `true` → INDIVIDUALIZABLE (tabla `unidad_equipo`); `false` →
> CONSUMIBLE/VOLUMEN (tabla `stock_consumible`). Úsalo antes de registrar ítems.

---

## PARTE A — Catálogo (tipos de equipo) — CU-24..31

### 1. Endpoints (`catalog.controller.ts`)

| Método | Ruta | Roles | CU |
|--------|------|-------|----|
| POST | `/api/catalogo` | `ADMIN`, `SUPERUSUARIO` | CU-24 crear tipo |
| GET | `/api/catalogo` | 4 roles | CU-25 listar (filtros `categoria`, `activo`, `buscar`) |
| GET | `/api/catalogo/:id/ficha-tecnica` | 4 roles | info de ficha (si `tieneFicha`) |
| GET | `/api/catalogo/:id/ficha-tecnica/archivo` | 4 roles | CU-30 descargar PDF |
| PATCH | `/api/catalogo/:id` | `ADMIN`, `SUPERUSUARIO` | CU-26 editar tipo |
| DELETE | `/api/catalogo/:id` | `ADMIN`, `SUPERUSUARIO` | CU-27 desactivar (lógica) |
| DELETE | `/api/catalogo/:id/fisico` | `ADMIN`, `SUPERUSUARIO` | CU-27 eliminar físico |
| POST | `/api/catalogo/:id/ficha-tecnica` | `ADMIN`, `SUPERUSUARIO` | CU-29 subir/reemplazar PDF |

### 2. Lógica (`catalog.service.ts`)

**Constantes:** `CATEGORIAS = ['ONT/ONU','Decodificador','Splitter','Herramienta','Consumible fibra
óptica','Consumible conector','Consumible otro','Otro']`; `UNIDADES_MEDIDA = ['Unidad','Metro','Rollo']`.

- **`crearTipo` (CU-24):** valida (mensajes específicos):
  - nombre 3–80; categoría obligatoria y dentro de `CATEGORIAS`; marca 2–50; modelo 1–50;
    descripción técnica ≤500; `requiereSerialNumber` obligatorio; garantía entero 0–3650.
  - **Excepción 2:** si `requiereSerialNumber === false`, `unidadMedida` obligatoria y de la lista.
  - **Excepción 3:** unicidad `nombre+marca+modelo+id_empresa` (incluye inactivos) →
    `ConflictException('Ya existe un tipo de equipo con esa combinación...')`.
  - Guarda `activo: true`; `unidadMedida: null` si es serializable.
- **`consultar` (CU-25):** QueryBuilder filtrado por `id_empresa`, `categoria`, `activo` (string
  'true'/'false'), `buscar` (ILIKE sobre nombre/marca/modelo). **Excepción 1:** sin coincidencias → `[]`.
- **`editarTipo` (CU-26):**
  - No existe en la empresa → audita `ACCESO_DENEGADO` + `NotFoundException('El tipo de equipo que
    intenta modificar no existe o no pertenece a su empresa.')`.
  - **Excepción 1:** no se puede cambiar `requiereSerialNumber` si existen unidades →
    `BadRequestException('No es posible cambiar este campo porque existen N unidades registradas...')`.
  - Re-valida formato (CU-24) solo sobre campos enviados.
  - **Excepción 2:** nueva combinación `nombre+marca+modelo` no debe existir (excluyendo el propio).
  - `unidadMedida` solo aplica a consumibles (si pasa a serializable → null). Audita `EDITAR`.
- **`desactivarTipo`:** desactivación lógica. Si tiene unidades → `tipoDesactivacion: 'LÓGICA'`
  (preservación histórica); si no → `'ORDINARIA'`.
- **`eliminarTipoFisico` (CU-27):** solo si no hay `unidad_equipo` **ni** `stock_consumible` →
  `ConflictException('No es posible eliminar este tipo de equipo porque tiene unidades registradas.
  Solo se permite la desactivación lógica.')`. Elimina el PDF del disco, borra y audita `ELIMINAR`.
- **`validarFormatoSerialNumber` (CU-28 Excepción 1):** regex `/^[A-Z0-9-]{4,30}$/`; mensaje exacto:
  `'El formato del número de serie es inválido. Debe contener entre 4 y 30 caracteres alfanuméricos
  y guiones. No se permiten espacios ni caracteres especiales.'`.
- **`adjuntarPdfPath` (CU-29):** solo 1 PDF por tipo; un nuevo archivo reemplaza/elimina el anterior
  del disco. Devuelve `id_tipo_equipo`, urls y nombre.
- **`obtenerFichaPdf`:** distingue `tieneFicha` true/false; sin ficha devuelve mensaje con nombre del tipo.
- **`determinarNaturalezaEquipo`:** pivote (ver arriba). Si `requiereSerialNumber` es null/undefined →
  `BadRequestException` (error de configuración).

### 3. Subida de PDF (CU-29, controller)
- `FileInterceptor` con `diskStorage` en `./uploads/fichas_tecnicas`, nombre = `{id}{ext}`.
- Multer: máx **5 MB**, solo `application/pdf` → `BadRequestException('El archivo debe estar en
  formato PDF y no superar los 5 MB.')`. Sin archivo → `BadRequestException('Archivo PDF no recibido.')`.

---

## PARTE B — Unidades (individuales + consumibles) — CU-28..40

### 1. Endpoints (`units.controller.ts`)

| Método | Ruta | Roles | CU |
|--------|------|-------|----|
| GET | `/api/unidades` | 4 roles | listar (filtros `estado`, `buscar`) |
| POST | `/api/unidades` | `ADMIN`, `SUPERUSUARIO`, `ADMIN_BODEGA` | CU-28/CU-32 registrar unidad |
| POST | `/api/unidades/consumibles` | idem | CU-28/CU-31 ingresar consumible |
| PATCH | `/api/unidades/consumibles/:id_stock` | idem | CU-28/CU-31 editar consumible |
| GET | `/api/unidades/:id/ficha` | 4 roles | CU-33 ver ficha detalle |
| GET | `/api/unidades/:serialNumber/historial` | 4 roles | CU-36/CU-37 ver historial |
| PATCH | `/api/unidades/:id/cambiar-estado` | 4 roles | CU-35/36/40/47 cambio de estado (CU-95: `forzar_aviso_garantia`) |
| PATCH | `/api/unidades/:id` | `ADMIN`, `SUPERUSUARIO`, `ADMIN_BODEGA` | CU-34 editar datos |
| GET | `/api/unidades/devolucion/:numeroSerie` | 4 roles | CU-71 buscar equipo por NS para la devolución |
| POST | `/api/unidades/:id/devolucion` | 4 roles | CU-71 registrar devolución de equipo desde cliente |
| POST | `/api/unidades/:id/resultado-revision` | `ADMIN_BODEGA`, `ADMIN`, `SUPERUSUARIO` | CU-72 registrar resultado de revisión |


### 2. Lógica (`units.service.ts`)

Constante: `MAC_REGEX = /^([0-9A-Fa-f]{2}[:\\-]){5}[0-9A-Fa-f]{2}$/`.

- **`listarUnidades`:** join a `tipoEquipo`; filtros `estado` y `buscar` (serie/modelo/nombre tipo).
  - **CU-28/CU-31:** los consumibles se muestran si no hay filtro de estado o es `'En bodega'`, con
    `cantidad_disponible > 0`. Representación especial: `id_unidad = -id_stock` (negativo), 
    `numero_serie = "{cantidad} {unidadMedida}"`, `estado: 'En bodega'`, `es_consumible: true`,
    `id_stock_consumible`, `umbral_minimo`, `garantia_no_calculable: true`.
- **`registrarUnidad` (CU-32):**
  - Obligatorios: `id_tipo_equipo`, `numero_serie`, `id_bodega_actual`.
  - Si la naturaleza es CONSUMIBLE → `BadRequestException('Restricción de Flujo (CU-32): El ítem [...]
    está clasificado como Consumible. No se puede registrar de manera individualizada en esta tabla.')`.
  - Valida formato de serie y unicidad → `ConflictException('El número de serie [...] ya se encuentra
    registrado...')`.
  - MAC: normaliza a mayúsculas, valida regex y unicidad → `ConflictException('Conflicto de Inventario:
    La dirección MAC [...] ya está registrada en otro equipo del sistema.')`.
  - **CU-32:** la fecha de adquisición no puede ser futura.
  - **CU-38:** `fechaVencGarantia = fechaAdquisicion + garantiaDias` (si ambos existen y >0).
  - Crea con `estado: 'En bodega'`, `observaciones` ≤300.
- **`ingresarConsumible` (CU-28/31):**
  - Obligatorios `id_tipo_equipo` + `id_bodega`.
  - **CU-31 Excepción 1:** si la naturaleza NO es consumible → `BadRequestException` (debe
    registrarse como unidad).
  - **CU-28 Excepción 2:** cantidad entero positivo >0.
  - Bodega debe existir y estar activa. Acumula en `StockConsumible` (busca por
    `id_tipo_equipo+id_bodega`, crea con `cantidad_disponible: 0` si no existe).
- **`editarConsumible`:** stock debe pertenecer a la empresa del actor. `cantidad_disponible` ≥0;
  `umbral_minimo` 0–9999. Audita `MODIFICAR` solo si hubo cambios.
- **`transicionarEstado` (CU-35/36/40/78):**
  - **CU-36:** observación opcional, ≤300.
  - **Máquina de estados** (ver tabla en `03-base-de-datos.md`); **CU-35 Excepción 1:** transición
    no permitida → `'Transición de estado no permitida para este equipo.'`. La tabla vive en la
    constante exportada **`TRANSICIONES_PERMITIDAS`** (CU-81): los módulos que hacen su propia
    transacción (préstamos) la reutilizan en vez de duplicarla. **CU-82** amplió esa tabla:
    `En préstamo externo` admite `En bodega` y `En revisión` (cambio ratificado por el jefe de grupo).
  - **CU-40 Excepción 1:** al pasar a `'En revisión'` el diagnóstico es obligatorio
    (`DIAGNOSTICOS_PERMITIDOS`); si es `'Otro'`, descripción obligatoria 5–200
    (`'Debe ingresar una descripción cuando selecciona Otro.'`).
  - Al salir de `'En bodega'` limpia `id_bodega_actual` y `numeroPoste` **con `null` explícito**
    (**CU-79**: con `undefined` TypeORM ignoraba la propiedad y la unidad seguía contando en el
    stock de su bodega incluso después de darse de baja).
  - **CU-47:** acepta `ubicacion_fisica` opcional (texto libre, ≤60 →
    `BadRequestException('La ubicación física no puede superar los 60 caracteres.')`). Al pasar a
    `'En bodega'` la persiste junto a la transición (misma transacción del historial) y la incluye
    en el `motivo` del historial (`... . Ubicación física: ...`); al **salir** de `'En bodega'`
    (`Asignado a técnico` / `En préstamo externo` / `Dado de baja`) la vacía automáticamente
    (`null`). Audita `CAMBIAR_ESTADO` en `log_auditoria` con `ubicacion_fisica` en
    `valor_anterior`/`valor_nuevo` y la devuelve en la respuesta.
  - **CU-78:** acepta `bajaPayload = { motivo, descripcion }` (lo valida `BajasService`, ver
    `bajas.md`). Al pasar a `'Dado de baja'` persiste `motivo_baja` / `motivo_baja_detalle` en la
    misma transacción, escribe el historial como `'Baja definitiva. Motivo: ...'` y audita con la
    acción **`BAJA_DEFINITIVA`** (número de serie, motivo, empresa) en vez de `CAMBIAR_ESTADO`.
    `'Dado de baja'` es terminal: la máquina no define transiciones de salida y no deben agregarse.
  - **CU-36:** transacción con **reintentos (3, backoff 100ms×intento)**; fecha en timezone
    `America/Santiago`; `motivo` = `'Cambio de estado ordinario'` o
    `'Ingreso a taller técnico. Diagnóstico: ...'`. Si falla → `BadRequestException('Error al
    registrar el cambio en el historial...')`. Flag QA `simularErrorHistorial`.
- **`listarEnRevision` (CU-77):** unidades `'En revisión'` (Superusuario: ambas empresas) con fecha
  de ingreso a revisión (último cambio a ese estado en el historial) y `dias_en_revision`.
  **CU-94** agregó `fecha_venc_garantia` a cada fila: el módulo `alertas` la usa para las alertas
  "Garantía con defecto" y "Revisión prolongada" (`UnitsService` ya se exporta).
- **`verFichaDetalle` (CU-33/CU-38):** ficha plana con bodega actual, empresa propietaria y alerta de
  garantía: sin fecha/garantía → `no_calculable: true` ('Garantía no calculable'); vigente → alerta
  con días restantes; expirada → `'COBERTURA EXPIRADA...'`.
- **`editarDatos` (CU-34):** `observaciones` (≤300), `ubicacion_fisica` **solo si estado `'En bodega'`**
  → `BadRequestException('La ubicación física en bodega solo puede editarse cuando la unidad está en
  estado [En bodega].')`, `id_bodega_actual`, `numero_poste`, `modelo`.
- **`verHistorialEstados` (CU-36/37):** join por `numero_serie` filtrado por empresa, orden desc;
  resuelve nombres de usuarios y empresa. Sin historial: unidad inexistente → **CU-33/CU-37 Excepción
  1** `'Número de serie no encontrado.'`; existente → `'El dispositivo se encuentra en su estado
  inicial de fábrica...'`.
- **`consultarParaDevolucion` (CU-71):** busca la unidad por `numero_serie` + empresa (404
  `'El equipo solicitado no existe.'`). **Excepción 1:** si el estado no es `'Instalado en cliente'`
  → `'Transición de estado no permitida para este equipo. Estado actual: [ESTADO].'`. Devuelve NS,
  tipo, marca, modelo, `nombre_cliente` y `direccion_instalacion`. El cliente y la dirección se leen
  (helper privado `buscarClienteInstalacion`) del último registro de `integracion_cierre` de la
  empresa cuyo `acciones_aplicadas` contiene esa serie con `estado_nuevo: 'Instalado en cliente'`
  (`payload.cliente.nombre_completo`, `payload.direccion.direccion` + `comuna`); si no hay datos,
  quedan `null` y el front muestra lo disponible ("No registrado").
- **Aviso de garantía vigente (CU-95)** → `aviso-garantia.ts`: al registrar `'Dado de baja'` o
  `'En revisión'` sobre una unidad con garantía vigente (hoy en `America/Santiago` ≤
  `fecha_venc_garantia`), `exigirConfirmacionGarantia` responde **409** `{ codigo: 'AVISO_GARANTIA',
  message }` sin ejecutar nada, con el texto exacto `'AVISO: El equipo [NS] ([MARCA] [MODELO]) tiene
  garantía vigente hasta [DD/MM/YYYY]. Considere contactar al proveedor [NOMBRE_PROVEEDOR] antes de
  proceder. ¿Desea continuar de todas formas?'` (proveedor vacío → `no registrado`; varias unidades →
  un aviso por línea). Con `forzar_aviso_garantia: true` en el body, `auditarAvisoGarantiaIgnorado`
  registra `AVISO_GARANTIA_IGNORADO` (NS, estado solicitado, vencimiento, proveedor, fecha/hora) y se
  ejecuta la transición. Se aplica en `transicionarEstado` (solo desde `PATCH cambiar-estado`, vía el
  parámetro `avisoGarantia`), `registrarDevolucion` (CU-71), `registrarResultadoRevision` Baja
  (CU-72), `registrarRetornoReparacion` (CU-76), `BajasService.registrar` (CU-78, antes de la baja
  directa o la solicitud del técnico; la aprobación posterior no repite el aviso) y
  `PrestamosService.registrarRetorno` (CU-82). El webhook de G3 no lo aplica (no hay usuario).
- **`registrarDevolucion` (CU-71):** misma precondición/Excepción 1. Valida `fecha_devolucion`
  (YYYY-MM-DD, no futura según `America/Santiago`), `estado_visual` ∈ {`Sin daño visible`, `Daño
  leve`, `Daño grave`, `No enciende`, `Incompleto`} (constante `ESTADOS_VISUALES_DEVOLUCION`),
  `nombre_tecnico_retiro` obligatorio y bodega de destino activa de la empresa (reutiliza
  `validarDestinoOperativo`). Transacción `QueryRunner`: estado → `'En revisión'`,
  `id_bodega_actual` = bodega destino, historial con cliente, dirección, fecha DD/MM/YYYY, estado
  visual, técnico y bodega. Audita `DEVOLUCION_CLIENTE` sobre `unidad_equipo`.
- **`registrarResultadoRevision` (CU-72):** precondición estado `'En revisión'` (mensaje
  `'Transición de estado no permitida para este equipo. Estado actual: [ESTADO].'`, distinto al de
  CU-35). Tres resultados: (A) `OPERATIVO` → bodega destino activa + ubicación física (≤60,
  CU-47) → `'En bodega'`. (B) `REPARACION_EXTERNA` → nombre receptor (3-80), fecha estimada de
  retorno (posterior a hoy), descripción de falla (5-300) → `'En préstamo externo'` + crea registro
  en `prestamo_externo` (`tipo: 'REPARACION_EXTERNA'`, entidad compartida con CU-75/81). (C) `BAJA`
  → motivo (obligatorio, ≤200); **Excepción 1:** si la garantía está vigente exige
  `forzar_aviso_garantia: true` en el body (aviso unificado de CU-95; el front ya preguntó) → `'Dado de baja'`. Transacción
  `QueryRunner` (estado + historial + efecto del resultado). Audita `CAMBIAR_ESTADO` sobre
  `unidad_equipo`.


### 3. Entidades

- **`tipo_equipo`** → `tipo-equipo.entity.ts`: `id_tipo_equipo`, `id_empresa`, `nombre`, `categoria`,
  `marca`, `modelo`, `descripcionTecnica`/`descripcion_tecnica`, `unidadMedida`/`unidad_medida`,
  `garantiaDias`/`garantia_dias`, `requiereSerialNumber`/`requiere_serie_individual`,
  `fichaTecnicaPdfUrl`/`ficha_tecnica_pdf_url`, `fichaTecnicaNombre`/`ficha_tecnica_nombre` (CU-29),
  `activo`. `OneToMany` → unidades.
- **`unidad_equipo`** → `unidad-equipo.entity.ts`: `id_unidad`, `id_tipo_equipo`, `id_empresa`,
  `serialNumber`/`numero_serie` (unique, NOT NULL), `modelo`, `estado`, `fechaAdquisicion`,
  `fechaVencGarantia`, `diagnosticoTecnico`, `id_cliente_instalado`, `id_bodega_actual`, `numeroPoste`,
  `id_caja_nap`, `macAddress`/`mac_address` (unique), `proveedor`, `observaciones` (300),
  `ubicacionFisica`/`ubicacion_fisica` (60). Relaciones: `ManyToOne TipoEquipo` (eager),
  `OneToMany HistorialEstado`.
- **`historial_estado_equipo`** → `historial-estado.entity.ts`: `id_historial`, `id_unidad`,
  `id_usuario`, `estadoAnterior`, `estadoNuevo`, `motivo`, `fechaHora`. `ManyToOne UnidadEquipo`
  con `onDelete: CASCADE`.
- **`prestamo_externo`** → `prestamo-externo.entity.ts`: `id_prestamo`, `tipo`
  (`REPARACION_EXTERNA`/`PRESTAMO_EXTERNO`), `id_empresa`, `id_unidad` (nullable, `ManyToOne`
  `UnidadEquipo`), `nombreReceptor`/`nombre_receptor`, `rutReceptor`/`rut_receptor` (nullable),
  `fechaSalida`/`fecha_salida`, `fechaRetornoEstimada`/`fecha_retorno_estimada`,
  `fechaRetornoReal`/`fecha_retorno_real` (nullable), `detalle`, `estado`
  (`ACTIVO`/`CERRADO`), `idUsuarioRegistro`/`id_usuario_registro`. Entidad mínima, compartida y
  extensible por CU-75/CU-81.


### 4. DTOs
- `editar-datos-unidad.dto.ts`: `observaciones` (≤300, CU-34), `ubicacion_fisica` (≤60, CU-34),
  `id_bodega_actual` (IsInt+IsPositive), `numero_poste` (≤30), `modelo` (≤80). Todos opcionales,
  mensajes en español.

---

## CU cubiertos
CU-24..CU-31 (catálogo y ficha técnica), CU-32..CU-40 (unidades, estados, garantía, historial,
diagnóstico). Detalle exacto de cada restricción en los diagramas de secuencia
(`diagramas/diagramas-secuencia/CU24/` … `CU40/`).

CU-71 (devolución de equipo desde cliente → `'En revisión'`).

CU-95 (aviso de garantía vigente al registrar `'Dado de baja'` o `'En revisión'`).

CU-72 (resultado de revisión de equipo: operativo/reparación externa/baja).

CU-48 (ubicación externa en la ficha — sc-139): `GET /api/unidades/:id/ficha` incluye
`ubicacion_externa` resuelta por estado:
- `Asignado a técnico` → `tipo: TECNICO` con nombre completo y RUT del `usuario` (nuevo campo
  `usuario.rut`, migración `ADD COLUMN IF NOT EXISTS`; sin dato queda en `campos_faltantes`).
- `Instalado en cliente` → `tipo: CLIENTE` con RUT/nombre/dirección/comuna persistidos por el
  cierre (CU-64); si hay `G3_INTEGRACION_URL` + `G3_INTEGRACION_API_KEY`, enriquece con
  `GET {G3}/clientes/rut/{rut}?id_empresa=N` (timeout 2 s) y **degrada a lo persistido** si G3 no
  responde.
- `En préstamo externo` → `tipo: PRESTAMO_EXTERNO` con receptor, RUT, `PE-XXXXX` (`correlativo`)
  y motivo (`detalle`) del `prestamo_externo` ACTIVO de la unidad.
- `En bodega` / `Dado de baja` → `null`.
- Excepción 1: `campos_faltantes` lista las claves sin registrar y la ficha las marca
  ("Campos sin registrar: ..."). Solo lectura, sin auditoría. Variables G3 por entorno (sin
  credenciales en el repo).
