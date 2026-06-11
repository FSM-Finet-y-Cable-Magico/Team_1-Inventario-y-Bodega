import { goto } from '$app/navigation';
import { authStore } from '$lib/stores/auth';
import { get } from 'svelte/store';

const BASE = '/api';

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

export const api = {
	get: <T>(path: string) => request<T>('GET', path),
	post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
	patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
	delete: <T>(path: string) => request<T>('DELETE', path)
};

export { ApiError };
