import type { RequestHandler } from '@sveltejs/kit';

const BASE = '/api';
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.BACKEND_URL || 'http://backend:3003';

export const fallback: RequestHandler = async ({ request, url }) => {
	const targetUrl = `${BACKEND_URL.replace(/\/$/, '')}${url.pathname}${url.search}`;

	const headers = new Headers(request.headers);
	headers.delete('host');

	try {
		const res = await fetch(targetUrl, {
			method: request.method,
			headers,
			body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.arrayBuffer() : undefined
		});

		return new Response(res.body, {
			status: res.status,
			statusText: res.statusText,
			headers: res.headers
		});
	} catch (error) {
		console.error('Error en proxy de SvelteKit hacia el backend:', error);
		return new Response(JSON.stringify({ message: 'Error de conexión con el backend' }), {
			status: 502,
			headers: { 'content-type': 'application/json' }
		});
	}
};
