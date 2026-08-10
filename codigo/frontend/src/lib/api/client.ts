import { goto } from '$app/navigation';
import { authStore } from '$lib/stores/auth';
import { get } from 'svelte/store';

const BASE = import.meta.env.VITE_PUBLIC_API_URL || '/api';

class ApiError extends Error {
	status: number;
	constructor(message: string, status: number) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
	}
}

async function request<T>(
	method: string,
	path: string,
	body?: unknown
): Promise<T> {
	const token = get(authStore).token;
	const headers: Record<string, string> = {};
	if (token) headers['Authorization'] = `Bearer ${token}`;
	if (body && !(body instanceof FormData)) {
		headers['Content-Type'] = 'application/json';
	}

	const res = await fetch(`${BASE}${path}`, {
		method,
		headers,
		body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined
	});

	// Un 401 del propio login son credenciales inválidas, no una sesión expirada:
	// debe mostrar el mensaje del backend (CU-01) sin redirigir.
	if (res.status === 401 && !path.startsWith('/auth/login')) {
		authStore.logout();
		goto('/login');
		throw new ApiError('Sesión expirada', 401);
	}

	const text = await res.text();
	let data: T;
	try {
		data = JSON.parse(text);
	} catch {
		data = text as T;
	}

	if (!res.ok) {
		// ValidationPipe de NestJS devuelve message como string[]
		const raw =
			typeof data === 'object' && data !== null
				? (data as Record<string, unknown>).message
				: undefined;
		const msg = Array.isArray(raw)
			? [...new Set(raw)].join('. ')
			: (raw as string) || 'Error del servidor';
		throw new ApiError(msg, res.status);
	}

	return data;
}

// Descarga autenticada de archivos (el token viaja en el header Authorization,
// por lo que un enlace <a href> directo no sirve). CU-29/CU-30.
async function download(path: string, fallbackName: string): Promise<void> {
	const token = get(authStore).token;
	const headers: Record<string, string> = {};
	if (token) headers['Authorization'] = `Bearer ${token}`;

	const res = await fetch(`${BASE}${path}`, { headers });

	if (res.status === 401) {
		authStore.logout();
		goto('/login');
		throw new ApiError('Sesión expirada', 401);
	}

	if (!res.ok) {
		let msg = 'Error al descargar el archivo';
		try {
			const data = await res.json();
			const raw = (data as Record<string, unknown>).message;
			msg = Array.isArray(raw) ? raw.join('. ') : ((raw as string) || msg);
		} catch {
			/* cuerpo no JSON: se mantiene el mensaje genérico */
		}
		throw new ApiError(msg, res.status);
	}

	const disposition = res.headers.get('Content-Disposition') ?? '';
	const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
	const filename = match ? decodeURIComponent(match[1]) : fallbackName;

	const blob = await res.blob();
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

export const api = {
	get: <T>(path: string) => request<T>('GET', path),
	post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
	patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
	delete: <T>(path: string) => request<T>('DELETE', path),
	download
};

export { ApiError };
