import { api } from './client';
import type { LoginDto, LoginResponse, Usuario } from '$lib/types';

export async function login(dto: LoginDto): Promise<LoginResponse> {
	return api.post<LoginResponse>('/auth/login', dto);
}

export async function logout(): Promise<void> {
	await api.post<void>('/auth/logout');
}

export async function restablecerPassword(id: number): Promise<{ nueva_password: string }> {
	return api.post<{ nueva_password: string }>(`/auth/restablecer-password/${id}`);
}

export function getUsers(activo?: boolean, buscar?: string): Promise<Usuario[]> {
	const params = new URLSearchParams();
	if (activo !== undefined) params.set('activo', String(activo));
	if (buscar) params.set('buscar', buscar);
	const qs = params.toString();
	return api.get<Usuario[]>(`/usuario${qs ? '?' + qs : ''}`);
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

export function uploadFichaTecnica(id: number, file: File) {
	const form = new FormData();
	form.append('file', file);
	return api.post<any>(`/catalogo/${id}/ficha-tecnica`, form);
}

export function getUnits(params?: { estado?: string; buscar?: string }) {
	const qs = new URLSearchParams();
	if (params?.estado) qs.set('estado', params.estado);
	if (params?.buscar) qs.set('buscar', params.buscar);
	const query = qs.toString();
	return api.get<any[]>(`/unidades${query ? '?' + query : ''}`);
}

export function getUnit(id: number) {
	return api.get<any>(`/unidades/${id}/ficha`);
}

export function createUnit(data: Record<string, unknown>) {
	return api.post<any>('/unidades', data);
}

export function updateUnit(id: number, data: Record<string, unknown>) {
	return api.patch<any>(`/unidades/${id}`, data);
}

export function changeUnitState(id: number, data: Record<string, unknown>) {
	return api.patch<any>(`/unidades/${id}/cambiar-estado`, data);
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

export function getTransfers(params?: { estado?: string }) {
	const qs = params?.estado ? `?estado=${params.estado}` : '';
	return api.get<any[]>(`/transferencias${qs}`);
}

export function createTransfer(data: Record<string, unknown>) {
	return api.post<any>('/transferencias', data);
}

export function approveTransfer(id: number) {
	return api.patch<any>(`/transferencias/${id}/aprobar`);
}

export function rejectTransfer(id: number, data: { motivo: string }) {
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
