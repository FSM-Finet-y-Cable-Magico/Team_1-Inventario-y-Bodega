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
	access_token: string;
	usuario: Usuario;
}

export interface TipoEquipo {
	id_tipo_equipo: number;
	id_empresa: number | null;
	nombre: string;
	categoria: string | null;
	requiere_serie_individual: boolean | null;
	ficha_tecnica_pdf_url: string | null;
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

export type EstadoUnidad =
	| 'En bodega'
	| 'Asignado a tecnico'
	| 'Instalado en cliente'
	| 'En revision'
	| 'En prestamo externo'
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

export interface Transferencia {
	id_transferencia: number;
	id_empresa_origen: number | null;
	id_empresa_destino: number | null;
	id_usuario_registro: number | null;
	fecha_transferencia: string | null;
	observaciones: string | null;
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
