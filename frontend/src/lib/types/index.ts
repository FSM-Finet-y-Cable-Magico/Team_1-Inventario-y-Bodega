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

export interface UnidadEquipo {
	id_unidad: number;
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
	marca?: string | null;
	empresa?: string | null;
	bodega?: string | null;
	garantia?: {
		posee_garantia: boolean;
		garantia_vigente: boolean;
		dias_restantes: number;
		mensaje_alerta: string;
	};
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

export interface CambioEstadoDto {
	estado_nuevo: EstadoUnidad;
	diagnostico?: string;
	motivoPayload?: string;
}

export interface HistorialEstado {
	id_historial: number;
	id_unidad: number;
	id_usuario: number | null;
	estado_anterior: string | null;
	estado_nuevo: string | null;
	motivo: string | null;
	fecha_hora: string;
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
