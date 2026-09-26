export interface Usuario {
	id_usuario: number;
	id_empresa: number | null;
	nombre_completo: string;
	nombre_usuario: string;
	email: string | null;
	activo: boolean;
	intentos_fallidos: number;
	bloqueado_hasta: string | null;
	debe_cambiar_password: boolean;
	fecha_creacion: string;
	roles?: Rol[];
	empresa?: Empresa | null;
	// CU-05: nombre de empresa en el listado consolidado del Superusuario
	empresa_nombre?: string | null;
}

export interface CreateUsuarioDto {
	nombre_usuario: string;
	nombre_completo: string;
	email?: string;
	password: string;
	roles: number[];
}

export interface UpdateUsuarioDto {
	nombre_completo?: string;
	email?: string;
	activo?: boolean;
	roles?: number[];
	id_empresa?: number;
}

export interface Empresa {
	id: number;
	nombre: string;
}

export interface Rol {
	id_rol: number;
	nombre_rol: RolNombre;
	descripcion: string;
}

export type RolNombre = 'SUPERUSUARIO' | 'ADMIN' | 'ADMIN_BODEGA' | 'TECNICO_TERRENO';

export interface LoginDto {
	nombre_usuario: string;
	password: string;
}

export interface LoginResponse {
	access_token?: string;
	usuario?: Usuario;
	// CU-10: cuenta marcada con cambio obligatorio de contraseña
	debe_cambiar_password?: boolean;
}

export interface TipoEquipo {
	id_tipo_equipo: number;
	id_empresa: number | null;
	nombre: string;
	categoria: string | null;
	// la API serializa la propiedad de la entidad (requiereSerialNumber)
	requiereSerialNumber?: boolean | null;
	requiere_serie_individual?: boolean | null;
	// CU-24
	marca?: string | null;
	modelo?: string | null;
	descripcionTecnica?: string | null;
	unidadMedida?: string | null;
	garantiaDias?: number | null;
	ficha_tecnica_pdf_url?: string | null;
	fichaTecnicaPdfUrl?: string | null;
	// CU-29: nombre original del archivo PDF adjunto
	fichaTecnicaNombre?: string | null;
	activo: boolean;
}

export interface CreateTipoEquipoDto {
	nombre: string;
	categoria?: string;
	requiereSerialNumber: boolean;
}

export interface UpdateTipoEquipoDto {
	nombre?: string;
	categoria?: string;
	requiereSerialNumber?: boolean;
}

// Deben coincidir exactamente (tildes incluidas) con los estados del backend
export type EstadoUnidad =
	| 'En bodega'
	| 'Asignado a técnico'
	| 'Instalado en cliente'
	| 'En revisión'
	| 'En préstamo externo'
	| 'Dado de baja';

// CU-48: ubicación externa de una unidad fuera de bodega, resuelta por el backend
// según el estado (E1: campos_faltantes indica lo que no está registrado).
export type UbicacionExterna =
	| {
			tipo: 'TECNICO';
			datos: {
				id_usuario: number | null;
				nombre_completo: string | null;
				rut: string | null;
			};
			campos_faltantes: string[];
	  }
	| {
			tipo: 'CLIENTE';
			datos: {
				rut: string | null;
				nombre: string | null;
				direccion: string | null;
				comuna: string | null;
			};
			campos_faltantes: string[];
	  }
	| {
			tipo: 'PRESTAMO_EXTERNO';
			datos: {
				nombre_receptor: string | null;
				rut_receptor: string | null;
				numero_prestamo: string | null;
				motivo: string | null;
			};
			campos_faltantes: string[];
	  };

export interface UnidadEquipo {	id_unidad: number;
	id_tipo_equipo: number | null;
	id_empresa: number | null;
	numero_serie: string;
	modelo: string | null;
	estado: EstadoUnidad;
	fecha_adquisicion: string | null;
	fecha_venc_garantia: string | null;
	diagnostico_tecnico: string | null;
	id_cliente_instalado: number | null;
	id_bodega_actual: number | null;
	numero_poste: string | null;
	id_caja_nap: number | null;
	tipo_equipo?: TipoEquipo;
	// CU-32/CU-33
	mac_address?: string | null;
	proveedor?: string | null;
	observaciones?: string | null;
	ubicacion_fisica?: string | null;
	// CU-78: motivo con el que se registró la baja definitiva
	motivo_baja?: string | null;
	motivo_baja_detalle?: string | null;
	marca?: string | null;
	empresa?: string | null;
	bodega?: string | null;
	// CU-64: cliente/dirección persistidos del cierre de instalación y SRV vigente
	cliente_rut?: string | null;
	cliente_nombre?: string | null;
	direccion_instalacion?: string | null;
	comuna_instalacion?: string | null;
	srv?: string | null;
	// CU-48: ubicación externa resuelta por estado (técnico/cliente/préstamo)
	ubicacion_externa?: UbicacionExterna | null;
	garantia?: {
		posee_garantia: boolean;
		garantia_vigente: boolean;
		// CU-38 Excepción 1: garantía no calculable
		no_calculable?: boolean;
		dias_restantes: number;
		mensaje_alerta: string;
	};
	// CU-38 Excepción 1 (listado)
	garantia_no_calculable?: boolean;
	// CU-28/CU-31: marca para filas de stock consumible mostradas en el listado
	es_consumible?: boolean;
	id_stock_consumible?: number;
	cantidad_disponible?: number;
	unidad_medida?: string | null;
	umbral_minimo?: number | null;
}

export interface CreateUnidadDto {
	id_tipo_equipo: number;
	numero_serie: string;
	modelo?: string;
	estado: EstadoUnidad;
	fecha_adquisicion?: string;
	fecha_venc_garantia?: string;
	id_bodega_actual?: number;
	numero_poste?: string;
}

// CU-78: motivos de baja definitiva (lista cerrada, debe coincidir con el backend)
export const MOTIVOS_BAJA = [
	'Pérdida no recuperable',
	'Robo confirmado',
	'Falla irreparable',
	'Obsolescencia',
	'Donación a institución',
	'Otro'
] as const;

export type EstadoSolicitudBaja = 'Pendiente de aprobación' | 'Aprobada' | 'Rechazada';

export interface SolicitudBaja {
	id_solicitud: number;
	id_unidad: number;
	numero_serie: string | null;
	estado_unidad: string | null;
	empresa: string | null;
	motivo: string;
	motivo_otro: string | null;
	estado: EstadoSolicitudBaja;
	solicitante: string | null;
	aprobador: string | null;
	fecha_solicitud: string | null;
	fecha_resolucion: string | null;
	motivo_rechazo: string | null;
}

// CU-80: donación de equipos dados de baja
export interface Donacion {
	id_donacion: number;
	nombre_institucion: string;
	rut_institucion: string;
	fecha_donacion: string;
	numero_resolucion: string | null;
	empresa: string | null;
	registrada_por: string | null;
	fecha_creacion: string | null;
	equipos: number;
}

export interface UnidadDonable {
	id_unidad: number;
	numero_serie: string;
	tipo_equipo: string | null;
	categoria: string | null;
	marca: string | null;
	modelo: string | null;
	fecha_adquisicion: string | null;
	motivo_baja: string | null;
	estado: string;
}

// CU-81: préstamo externo de equipos
export interface PrestamoExterno {
	id_prestamo: number;
	correlativo: string;
	tipo: string;
	nombre_receptor: string;
	rut_receptor: string | null;
	fecha_salida: string;
	fecha_estimada_retorno: string;
	motivo: string;
	estado: string;
	empresa: string | null;
	registrado_por: string | null;
	equipos: number;
	consumibles: number;
	// CU-83: negativo si ya venció; null cuando el préstamo está cerrado
	dias_restantes?: number | null;
	items_resumen?: { tipo: string; descripcion: string | null; cantidad: number }[];
}

export interface PrestamoItem {
	id_detalle: number;
	es_consumible: boolean;
	numero_serie: string | null;
	tipo_equipo: string | null;
	marca: string | null;
	modelo: string | null;
	unidad_medida: string | null;
	cantidad: number | null;
	cantidad_retornada: number;
	estado_unidad: string | null;
	// CU-82: retornos ya registrados para este ítem
	retornos_previos?: { fecha_retorno: string; cantidad: number | null; observacion: string | null }[];
}

export interface PrestamoDetalleCompleto extends Omit<PrestamoExterno, 'equipos' | 'consumibles'> {
	bodega_origen: string | null;
	items: PrestamoItem[];
}

export interface CambioEstadoDto {
	estado_nuevo: EstadoUnidad;
	diagnostico?: string;
	motivoPayload?: string;
}

export interface ResultadoRevisionDto {
	resultado: 'OPERATIVO' | 'REPARACION_EXTERNA' | 'BAJA';
	id_bodega_actual?: number;
	ubicacion_fisica?: string;
	nombre_receptor?: string;
	fecha_retorno_estimada?: string;
	descripcion_falla?: string;
	motivo?: string;
	confirmar_garantia?: boolean;
}


export interface HistorialEstado {
	id_historial: number;
	id_unidad?: number;
	id_usuario?: number | null;
	estado_anterior: string | null;
	estado_nuevo: string | null;
	motivo: string | null;
	fecha_hora: string;
	// CU-36/CU-37: nombre del usuario responsable y empresa del movimiento
	usuario?: string | null;
	empresa?: string | null;
}

export interface EquipoEnRevision {
	id_unidad: number;
	numero_serie: string;
	tipo_equipo: { nombre: string } | null;
	empresa: string | null;
	bodega: string | null;
	fecha_ingreso_revision: string | null;
	dias_en_revision: number | null;
	diagnostico_tecnico: string | null;
}

export interface Bodega {
	id_bodega: number;
	id_empresa: number | null;
	nombre: string;
	direccion: string | null;
	activa: boolean;
	// CU-44: campos del listado
	empresa?: string;
	responsable?: string | null;
	estado?: string;
	resumen_stock_total?: number;
	id_usuario_responsable?: number | null;
}

export interface CreateBodegaDto {
	nombre: string;
	id_empresa: number;
	direccion?: string;
}

export interface UpdateBodegaDto {
	nombre?: string;
	direccion?: string;
}

export interface StockConsumible {
	id_stock: number;
	id_tipo_equipo: number;
	id_bodega: number;
	cantidad_disponible: number;
	umbral_minimo: number | null;
	tipo_equipo?: TipoEquipo;
}

export interface ConfigurarUmbralDto {
	id_tipo_equipo: number;
	umbral: number;
}

// CU-85: fila del reporte de stock (versión con empresa y unidad de medida)
export interface ReporteStockFila {
	id_empresa: number | null;
	empresa: string | null;
	id_bodega: number;
	bodega: string;
	id_tipo_equipo: number;
	tipo_equipo: string;
	unidad_medida: string | null;
	en_bodega: number;
	asignado_a_tecnico: number;
	en_revision: number;
	en_prestamo_externo: number;
	total_activo: number;
	umbral_minimo: number;
	bajo_umbral: boolean;
}

// CU-85: fila del reporte de stock (versión simple)
export interface ReporteStock {
	id_tipo_equipo: number;
	tipo_equipo: string;
	id_bodega: number;
	bodega: string;
	en_bodega: number;
	asignado_a_tecnico: number;
	en_revision: number;
	en_prestamo_externo: number;
	total_activo: number;
	umbral_minimo: number;
	bajo_umbral: boolean;
}

export interface ReporteMovimientoFila {
	id_movimiento: number;
	fecha: string | null;
	tipo_movimiento: string;
	item: string | null;
	cantidad: number;
	tipo_equipo: string | null;
	id_empresa: number | null;
	empresa: string | null;
	id_bodega: number | null;
	bodega: string | null;
	usuario: string | null;
	referencia_id: number | null;
	referencia_tipo: string | null;
}

export interface ReporteGarantiaFila {
	numero_serie: string;
	tipo_equipo: string;
	marca: string | null;
	modelo: string | null;
	proveedor: string | null;
	fecha_adquisicion: string | null;
	duracion_garantia_dias: number;
	fecha_vencimiento: string | null;
	dias: number | null;
	dias_restantes: number | null;
	dias_vencidos: number | null;
	estado: string;
	empresa: string | null;
}

export interface ReporteInventarioTecnico {
	tecnico: {
		id_usuario: number;
		nombre_completo: string;
		empresa: string | null;
	};
	equipos_individualizables: {
		numero_serie: string;
		tipo_equipo: string;
		fecha_asignacion: string | null;
		dias_transcurridos: number;
	}[];
	consumibles: {
		id_tipo_equipo: number;
		tipo_equipo: string;
		cantidad_disponible: number;
		unidad_medida: string | null;
	}[];
}

export interface ReporteConsumoFila {
	id_tipo_equipo: number;
	tipo_consumible: string;
	unidad_medida: string | null;
	cantidad_ingresada: number;
	cantidad_entregada: number;
	cantidad_usada_en_cierres: number;
	cantidad_devuelta: number;
	diferencia: number;
	desvio: boolean;
}

// Respuesta de GET /transferencias (CU-23)
export interface Transferencia {
	id_transferencia: number;
	empresa_origen: string;
	empresa_destino: string;
	fecha: string | null;
	estado: string;
	unidades: number;
	solicitante: string | null;
	observaciones: string | null;
}

// CU-21: detalle completo al seleccionar una transferencia
export interface TransferenciaDetalle {
	id_transferencia: number;
	empresa_origen: string;
	empresa_destino: string;
	bodega_origen: string | null;
	bodega_destino: string | null;
	fecha: string | null;
	estado: string;
	motivo: string | null;
	solicitante: string | null;
	unidades: { id_unidad: number; numero_serie: string; tipo_equipo: string | null; estado: string }[];
}

export interface CreateTransferenciaDto {
	id_empresa_destino: number;
	id_bodega_origen: number;
	id_bodega_destino: number;
	ids_unidades: number[];
	observaciones?: string;
}

export interface MovimientoInventario {
	id_movimiento: number;
	id_tipo_equipo: number | null;
	id_unidad: number | null;
	id_empresa_origen: number | null;
	id_empresa_destino: number | null;
	id_bodega_origen: number | null;
	id_bodega_destino: number | null;
	id_usuario: number | null;
	tipo_movimiento: string | null;
	cantidad: number;
	fecha: string | null;
	referencia_id: number | null;
}

// CU-49: proveedores
export interface Proveedor {
	id_proveedor: number;
	nombre_comercial: string;
	rut: string;
	nombre_contacto: string | null;
	telefono: string | null;
	email: string | null;
	activa: boolean;
	fecha_creacion: string;
	tipos_equipo: { id_tipo_equipo: number; nombre: string }[];
}

export interface CreateProveedorDto {
	nombre_comercial: string;
	rut: string;
	nombre_contacto?: string;
	telefono?: string;
	email?: string;
	ids_tipos_equipo?: number[];
}

// CU-52: órdenes de ingreso desde proveedor
export interface OrdenIngresoDetalle {
	id_detalle: number;
	id_orden: number;
	id_tipo_equipo: number;
	cantidad_esperada: number;
	garantia_dias: number;
	cantidad_recibida: number;
	nombre_tipo_equipo: string | null;
	// CU-55: los ítems individualizables piden un número de serie por unidad recibida
	requiere_serie_individual: boolean;
}

export interface OrdenIngreso {
	id_orden: number;
	correlativo: string;
	id_proveedor: number;
	numero_documento: string;
	fecha_documento: string;
	id_empresa_destino: number;
	id_bodega_destino: number;
	estado: string;
	id_usuario_registro: number;
	fecha_creacion: string;
	nombre_proveedor: string | null;
	nombre_bodega: string | null;
	nombre_empresa: string | null;
	detalles: OrdenIngresoDetalle[];
}

export interface ItemOrdenIngresoDto {
	id_tipo_equipo: number;
	cantidad_esperada: number;
	garantia_dias: number;
}

export interface CreateOrdenIngresoDto {
	id_proveedor: number;
	numero_documento: string;
	fecha_documento: string;
	id_empresa_destino: number;
	id_bodega_destino: number;
	items: ItemOrdenIngresoDto[];
}

export interface LogAuditoria {
	id_log: number;
	id_usuario: number;
	usuario_nombre?: string | null;
	empresa?: string | null;
	descripcion?: string;
	accion: string;
	entidad_afectada: string | null;
	id_entidad_afectada: number;
	valor_anterior: unknown;
	valor_nuevo: unknown;
	ip_origen: string | null;
	fecha_hora: string;
}

export interface FiltrosAuditoria {
	fecha_inicio?: string;
	fecha_fin?: string;
	id_usuario?: number;
	entidad_afectada?: string;
	accion?: string;
	pagina?: number;
	limite?: number;
}

export interface DashboardEmpresa {
	empresa: string;
	total_equipos: number;
	por_estado: Record<string, number>;
	total_bodegas: number;
}

export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	pagina: number;
	limite: number;
}

export interface DecodedToken {
	sub: number;
	nombre_usuario: string;
	id_empresa: number | null;
	roles: RolNombre[];
	iat: number;
	exp: number;
}

// CU-57/59/60/62: salidas de bodega a técnico
export interface VerificacionSerie {
	existe: boolean;
	numero_serie?: string;
	estado?: EstadoUnidad;
	id_bodega_actual?: number | null;
	disponible: boolean;
}

export interface ItemSalida {
	tipo: 'UNIDAD' | 'CONSUMIBLE';
	numero_serie?: string;
	id_tipo_equipo?: number;
	cantidad?: number;
}

export interface SalidaResumen {
	id_salida: number;
	tecnico: string;
	bodega: string;
	fecha_hora: string;
	items: {
		id_detalle: number;
		id_unidad: number | null;
		id_tipo_equipo: number | null;
		cantidad: number | null;
	}[];
}

export interface InventarioTecnico {
	tecnico: {
		id_usuario: number;
		nombre_completo: string;
		nombre_usuario: string | null;
		empresa: string | null;
	};
	ns_asignados: {
		numero_serie: string;
		id_unidad: number;
		tipo: string | null;
		estado: string;
	}[];
	saldos: {
		id_tipo_equipo: number;
		tipo: string | null;
		saldo: number;
		unidad_medida: string | null;
	}[];
}

// CU-61: vista móvil del técnico — trabajos del día desde G3 + inventario personal
export interface TrabajoDelDia {
	id_ot: number | null;
	tipo_ot: string | null;
	estado: string | null;
	prioridad: string | null;
	fecha_programada: string | null;
	observaciones: string | null;
	cliente: {
		id_cliente: number | null;
		rut: string | null;
		nombre_completo: string | null;
		telefono: string | null;
	};
	direccion: {
		direccion: string | null;
		comuna: string | null;
		referencia: string | null;
	};
}

export interface JornadaTecnico {
	fecha: string;
	trabajos_estado: 'OK' | 'NO_DISPONIBLE';
	trabajos: TrabajoDelDia[];
	inventario: InventarioTecnico;
}
