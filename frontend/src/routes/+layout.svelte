<script lang="ts">
	import '../app.css';
	import { authStore } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Header from '$lib/components/Header.svelte';

	let { children } = $props();

	const isLoginPage = $derived($page.url.pathname === '/login');

	$effect(() => {
		const token = $page.url.searchParams.get('token');
		if (token) {
			try {
				const payload = JSON.parse(atob(token.split('.')[1]));
				const usuario = payload.usuario || {
					id_usuario: payload.sub,
					nombre_usuario: payload.nombre_usuario,
					nombre_completo: payload.nombre_usuario || 'Usuario',
					activo: true,
					intentos_fallidos: 0,
					debe_cambiar_password: false,
					fecha_creacion: new Date().toISOString()
				};
				authStore.login(token, usuario);
				goto('/dashboard');
			} catch {
				// ignore invalid token
			}
		}
	});

	$effect(() => {
		if (!isLoginPage && !$authStore.token) {
			goto('/login');
		}
	});
</script>

{#if isLoginPage}
	{@render children()}
{:else if $authStore.token}
	<div class="flex h-dvh overflow-hidden">
		<Sidebar />
		<div class="flex-1 flex flex-col overflow-hidden">
			<Header />
			<main class="flex-1 overflow-y-auto p-6">
				{@render children()}
			</main>
		</div>
	</div>
{/if}
