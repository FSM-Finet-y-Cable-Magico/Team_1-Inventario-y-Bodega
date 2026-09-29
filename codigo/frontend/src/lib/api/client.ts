import { goto } from '$app/navigation';
import { authStore } from '$lib/stores/auth';
import { get } from 'svelte/store';

const BASE = '/api';

class ApiError extends Error {
	status: number;
	// CU-95: código opcional del backend (p. ej. 'AVISO_GARANTIA' en un 409)
	codigo?: string;
	constructor(message: string, status: number, codigo?: string) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.codigo = codigo;
	}
}

// CU-95: el backend interrumpe con 409 + codigo 'AVISO_GARANTIA' cuando la unidad
// tiene garantía vigente y el actor aún no eligió "Continuar sin garantía"
export function esAvisoGarantia(err: unknown): err is ApiError {
	return err instanceof ApiError && err.status === 409 && err.codigo === 'AVISO_GARANTIA';
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
		const codigo =
			typeof data === 'object' && data !== null
				? ((data as Record<string, unknown>).codigo as string | undefined)
				: undefined;
		throw new ApiError(msg, res.status, codigo);
	}

	return data;
}

// Descarga autenticada de archivos (el token viaja en el header Authorization,
// por lo que un enlace <a href> directo no sirve). CU-29/CU-30/CU-92.
async function download(
	path: string,
	fallbackName: string,
	timeoutMs?: number
): Promise<void> {
	const token = get(authStore).token;
	const headers: Record<string, string> = {};
	if (token) headers['Authorization'] = `Bearer ${token}`;

	const controller = new AbortController();
	let timer: ReturnType<typeof setTimeout> | undefined;

	if (timeoutMs && timeoutMs > 0) {
		timer = setTimeout(() => {
			controller.abort();
		}, timeoutMs);
	}

	let res: Response;
	try {
		res = await fetch(`${BASE}${path}`, {
			headers,
			signal: controller.signal
		});
	} catch (err: unknown) {
		if (err instanceof Error && err.name === 'AbortError') {
			throw new ApiError(
				'La generación del archivo superó los 15 segundos sin completarse. Por favor intente nuevamente.',
				408
			);
		}
		throw err;
	} finally {
		if (timer) clearTimeout(timer);
	}

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
