import { api } from './client';
import type { LoginDto, LoginResponse, Usuario, EquipoEnRevision, VerificacionSerie, ItemSalida, SalidaResumen, InventarioTecnico } from '$lib/types';

export async function login(dto: LoginDto): Promise<LoginResponse> {
	return api.post<LoginResponse>('/auth/login', dto);
}

// CU-11/CU-12: el motivo distingue el cierre manual del cierre por inactividad
export async function logout(motivo: 'manual' | 'inactividad' = 'manual'): Promise<void> {
	await api.post<void>('/auth/logout', { motivo });
}

// CU-10: establecer nueva contraseña tras un restablecimiento
export function cambiarPassword(dto: {
	nombre_usuario: string;
	password_actual: string;
	nueva_password: string;
}): Promise<{ message: string }> {
	return api.post<{ message: string }>('/auth/cambiar-password', dto);
}

export async function restablecerPassword(id: number): Promise<{ password_temporal: string }> {
	return api.post<{ password_temporal: string }>(`/auth/restablecer-password/${id}`);
}

export function getUsers(filtros?: { activo?: boolean; buscar?: string; rol?: string }): Promise<Usuario[]> {
	const params = new URLSearchParams();
	if (filtros?.activo !== undefined) params.set('activo', String(filtros.activo));
	if (filtros?.buscar) params.set('buscar', filtros.buscar);
	if (filtros?.rol) params.set('rol', filtros.rol);
	const qs = params.toString();
	return api.get<Usuario[]>(`/usuario${qs ? '?' + qs : ''}`);
}

export function getEmpresas() {
	return api.get<{ id: number; nombre: string }[]>('/empresas');
}

export function getUser(id: number): Promise<Usuario> {
	return api.get<Usuario>(`/usuario/${id}`);
}

export function createUser(data: Record<string, unknown>): Promise<Usuario> {
	return api.post<Usuario>('/usuario', data);
}

export function updateUser(id: number, data: Record<string, unknown>): Promise<Usuario> {
	return api.patch<Usuario>(`/usuario/${id}`, data);
}

export function deleteUser(id: number): Promise<void> {
	return api.delete<void>(`/usuario/${id}`);
}

export function getRoles() {
	return api.get<{ id_rol: number; nombre_rol: string; descripcion: string }[]>('/roles');
}

export function getCatalog(params?: { categoria?: string; activo?: boolean; buscar?: string }) {
	const qs = new URLSearchParams();
	if (params?.categoria) qs.set('categoria', params.categoria);
	if (params?.activo !== undefined) qs.set('activo', String(params.activo));
	if (params?.buscar) qs.set('buscar', params.buscar);
	const query = qs.toString();
	return api.get<any[]>(`/catalogo${query ? '?' + query : ''}`);
}

export function createCatalogItem(data: Record<string, unknown>) {
	return api.post<any>('/catalogo', data);
}

export function updateCatalogItem(id: number, data: Record<string, unknown>) {
	return api.patch<any>(`/catalogo/${id}`, data);
}

export function deleteCatalogItem(id: number) {
	return api.delete<void>(`/catalogo/${id}`);
}

// CU-27: eliminación física (el backend la rechaza si hay unidades registradas)
export function hardDeleteCatalogItem(id: number) {
	return api.delete<any>(`/catalogo/${id}/fisico`);
}

export function uploadFichaTecnica(id: number, file: File) {
	const form = new FormData();
	form.append('file', file);
	return api.post<any>(`/catalogo/${id}/ficha-tecnica`, form);
}

// CU-30: descarga autenticada de la ficha técnica PDF
export function downloadFichaTecnica(id: number, fallbackName = 'ficha-tecnica.pdf') {
	return api.download(`/catalogo/${id}/ficha-tecnica/archivo`, fallbackName);
}

export function getUnits(params?: { estado?: string; buscar?: string }) {
	const qs = new URLSearchParams();
	if (params?.estado) qs.set('estado', params.estado);
	if (params?.buscar) qs.set('buscar', params.buscar);
	const query = qs.toString();
	return api.get<any[]>(`/unidades${query ? '?' + query : ''}`);
}

export function getUnidadesEnRevision() {
	return api.get<EquipoEnRevision[]>('/unidades/en-revision');
}

export function getUnit(id: number) {
	return api.get<any>(`/unidades/${id}/ficha`);
}

export function createUnit(data: Record<string, unknown>) {
	return api.post<any>('/unidades', data);
}

// CU-28/CU-31: ingreso de consumibles por cantidad y unidad de medida
export function ingresarConsumible(data: { id_tipo_equipo: number; id_bodega: number; cantidad: number }) {
	return api.post<any>('/unidades/consumibles', data);
}

// CU-28/CU-31: edición del stock de un consumible (cantidad y umbral)
export function updateConsumible(id_stock: number, data: { cantidad_disponible?: number; umbral_minimo?: number }) {
	return api.patch<any>(`/unidades/consumibles/${id_stock}`, data);
}

export function updateUnit(id: number, data: Record<string, unknown>) {
	return api.patch<any>(`/unidades/${id}`, data);
}

export function changeUnitState(id: number, data: Record<string, unknown>) {
	return api.patch<any>(`/unidades/${id}/cambiar-estado`, data);
}

export function registrarResultadoRevision(id: number, data: Record<string, unknown>) {
	return api.post<any>(`/unidades/${id}/resultado-revision`, data);
}

// CU-74: reacondicionar equipo "En revisión" directo a "En bodega" (Operativo)
export function reacondicionarUnidad(id: number, data: Record<string, unknown>) {
	return api.post<any>(`/unidades/${id}/reacondicionar`, data);
}


export function getUnitHistory(serialNumber: string) {
	return api.get<any[]>(`/unidades/${serialNumber}/historial`);
}

export function getWarehouses(params?: { activa?: boolean; nombre?: string }) {
	const qs = new URLSearchParams();
	if (params?.activa !== undefined) qs.set('activa', String(params.activa));
	if (params?.nombre) qs.set('nombre', params.nombre);
	const query = qs.toString();
	return api.get<any[]>(`/bodegas${query ? '?' + query : ''}`);
}

export function getWarehouse(id: number) {
	return api.get<any>(`/bodegas/${id}`);
}

// CU-20: bodegas activas de la empresa destino de una transferencia
export function getWarehousesByEmpresa(idEmpresa: number) {
	return api.get<any[]>(`/bodegas/empresa/${idEmpresa}`);
}

export function createWarehouse(data: Record<string, unknown>) {
	return api.post<any>('/bodegas', data);
}

export function updateWarehouse(id: number, data: Record<string, unknown>) {
	return api.patch<any>(`/bodegas/${id}`, data);
}

export function deactivateWarehouse(id: number) {
	return api.delete<void>(`/bodegas/${id}/desactivar`);
}

export function getWarehouseStock(id: number) {
	return api.get<any[]>(`/bodegas/${id}/stock`);
}

export function setStockThreshold(id: number, data: { id_tipo_equipo: number; umbral: number }) {
	return api.post<any>(`/bodegas/${id}/umbral`, data);
}

// CU-23: filtros por estado, rango de fechas o empresa
export function getTransfers(params?: { estado?: string; id_empresa?: string; fecha_inicio?: string; fecha_fin?: string }) {
	const qs = new URLSearchParams();
	if (params?.estado) qs.set('estado', params.estado);
	if (params?.id_empresa) qs.set('id_empresa', params.id_empresa);
	if (params?.fecha_inicio) qs.set('fecha_inicio', params.fecha_inicio);
	if (params?.fecha_fin) qs.set('fecha_fin', params.fecha_fin);
	const query = qs.toString();
	return api.get<any[]>(`/transferencias${query ? '?' + query : ''}`);
}

// CU-21: detalle completo de una transferencia (empresas, bodegas, unidades, motivo, solicitante)
export function getTransferDetail(id: number) {
	return api.get<import('$lib/types').TransferenciaDetalle>(`/transferencias/${id}`);
}

export function createTransfer(data: Record<string, unknown>) {
	return api.post<any>('/transferencias', data);
}

export function approveTransfer(id: number) {
	return api.patch<any>(`/transferencias/${id}/aprobar`);
}

export function rejectTransfer(id: number, data: { observaciones: string }) {
	// el backend espera el motivo en el campo 'observaciones'
	return api.patch<any>(`/transferencias/${id}/rechazar`, data);
}

export function getDashboard() {
	return api.get<any>('/empresas/dashboard');
}

export function getMyDashboard() {
	return api.get<any>('/empresas/mi-dashboard');
}

export function getAuditLog(filters?: Record<string, string | number | undefined>) {
	const qs = new URLSearchParams();
	if (filters) {
		for (const [k, v] of Object.entries(filters)) {
			if (v !== undefined) qs.set(k, String(v));
		}
	}
	const query = qs.toString();
	return api.get<any>(`/auditoria${query ? '?' + query : ''}`);
}

// CU-59: validación en vivo del NS para la salida de bodega (la validación de
// verdad la re-ejecuta el backend en la transacción de la salida)
export function verificarSerie(numeroSerie: string, idBodega?: number): Promise<VerificacionSerie> {
	const qs = idBodega !== undefined ? `?id_bodega=${idBodega}` : '';
	return api.get<VerificacionSerie>(`/unidades/serie/${encodeURIComponent(numeroSerie)}${qs}`);
}

// CU-57/CU-60: registrar salida de bodega a técnico (transacción atómica)
export function crearSalida(data: { id_tecnico: number; id_bodega_origen: number; items: ItemSalida[] }) {
	return api.post<{ success: boolean; id_salida: number; message: string }>('/salidas', data);
}

export function listarSalidas(): Promise<SalidaResumen[]> {
	return api.get<SalidaResumen[]>('/salidas');
}

// CU-58: inventario personal del técnico (NS asignados + saldos de consumibles)
export function getInventarioTecnico(id: number, empresa?: number): Promise<InventarioTecnico> {
	const qs = empresa !== undefined ? `?empresa=${empresa}` : '';
	return api.get<InventarioTecnico>(`/tecnicos/${id}/inventario${qs}`);
}
