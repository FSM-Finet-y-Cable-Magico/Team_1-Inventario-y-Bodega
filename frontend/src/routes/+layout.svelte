<script lang="ts">
	import '../app.css';
	import { authStore } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Header from '$lib/components/Header.svelte';
	import { logout as apiLogout } from '$lib/api/index';
	import { Clock } from '@lucide/svelte';

	let { children } = $props();

	const isLoginPage = $derived($page.url.pathname === '/login');

	// CU-11: cierre de sesión automático por inactividad.
	// Aviso a los (total - 2) minutos; cierre a los INACTIVIDAD_MINUTOS.
	const INACTIVIDAD_MINUTOS = 5;
	const TOTAL_MS = INACTIVIDAD_MINUTOS * 60 * 1000;
	const AVISO_MS = TOTAL_MS - 2 * 60 * 1000;

	let ultimaActividad = Date.now();
	let showIdleWarning = $state(false);

	function marcarActividad() {
		// Con el aviso visible solo "Continuar sesión" reinicia el temporizador
		if (!showIdleWarning) ultimaActividad = Date.now();
	}

	function continuarSesion() {
		ultimaActividad = Date.now();
		showIdleWarning = false;
	}

	async function cerrarSesion(motivo: 'manual' | 'inactividad') {
		showIdleWarning = false;
		try { await apiLogout(motivo); } catch { /* ignore */ }
		authStore.logout();
		goto('/login');
	}

	$effect(() => {
		if (isLoginPage || !$authStore.token) return;
		ultimaActividad = Date.now();
		// CU-11: la actividad considerada es clic, desplazamiento y teclado
		const eventos = ['click', 'keydown', 'scroll', 'wheel', 'touchstart'];
		eventos.forEach((e) => window.addEventListener(e, marcarActividad, true));
		const timer = setInterval(() => {
			const inactivo = Date.now() - ultimaActividad;
			if (inactivo >= TOTAL_MS) {
				// Excepción 1: sin respuesta al aviso, cierre automático
				cerrarSesion('inactividad');
			} else if (inactivo >= AVISO_MS) {
				showIdleWarning = true;
			}
		}, 5000);
		return () => {
			eventos.forEach((e) => window.removeEventListener(e, marcarActividad, true));
			clearInterval(timer);
		};
	});

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

	<!-- CU-11: aviso previo de cierre de sesión por inactividad -->
	{#if showIdleWarning}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="alertdialog" aria-modal="true" aria-label="Sesión por expirar">
			<div class="bg-white rounded-lg border border-border shadow-lg w-full max-w-sm mx-4 p-6">
				<div class="flex items-center gap-2 mb-2">
					<Clock class="h-5 w-5 text-amber-600" />
					<h3 class="text-base font-semibold text-foreground">Sesión por expirar</h3>
				</div>
				<p class="text-sm text-muted mb-6">
					Su sesión se cerrará en 2 minutos por inactividad. ¿Desea continuar?
				</p>
				<div class="flex justify-end gap-3">
					<button
						onclick={() => cerrarSesion('manual')}
						class="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-surface-alt transition-colors"
					>
						Cerrar sesión
					</button>
					<button
						onclick={continuarSesion}
						class="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-md transition-colors"
					>
						Continuar sesión
					</button>
				</div>
			</div>
		</div>
	{/if}
{/if}
