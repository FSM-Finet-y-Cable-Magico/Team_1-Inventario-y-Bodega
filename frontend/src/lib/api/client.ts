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

	if (res.status === 401) {
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
		const msg =
			typeof data === 'object' && data !== null
				? (data as Record<string, unknown>).message as string || 'Error del servidor'
				: 'Error del servidor';
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
