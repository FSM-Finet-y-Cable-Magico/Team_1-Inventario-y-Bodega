<script lang="ts">
	import { authStore } from '$lib/stores/auth';
	import { login as apiLogin } from '$lib/api/index';
	import { goto } from '$app/navigation';
	import { LogIn } from '@lucide/svelte';

	let nombre_usuario = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;
		try {
			const res = await apiLogin({ nombre_usuario, password });
			authStore.login(res.access_token, res.usuario);
			goto('/dashboard');
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al iniciar sesión';
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-dvh flex items-center justify-center bg-surface px-4">
	<div class="w-full max-w-sm">
		<div class="text-center mb-8">
			<h1 class="text-2xl font-bold text-primary">Inventario y Bodega</h1>
			<p class="text-sm text-muted mt-1">Sistema de gestión de inventario</p>
		</div>

		<form
			onsubmit={handleSubmit}
			class="bg-white rounded-lg border border-border p-6 shadow-sm space-y-4"
		>
			<h2 class="text-lg font-semibold text-foreground">Iniciar sesión</h2>

			{#if error}
				<div class="bg-red-50 border border-red-200 text-destructive text-sm rounded-md px-3 py-2" role="alert">
					{error}
				</div>
			{/if}

			<div>
				<label for="nombre_usuario" class="block text-sm font-medium text-foreground mb-1">
					Usuario
				</label>
				<input
					id="nombre_usuario"
					type="text"
					bind:value={nombre_usuario}
					required
					autocomplete="username"
					class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
					placeholder="nombre de usuario"
				/>
			</div>

			<div>
				<label for="password" class="block text-sm font-medium text-foreground mb-1">
					Contraseña
				</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					required
					autocomplete="current-password"
					class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
					placeholder="contraseña"
				/>
			</div>

			<button
				type="submit"
				disabled={loading}
				class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white rounded-md text-sm font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				{#if loading}
					<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
					</svg>
					<span>Ingresando...</span>
				{:else}
					<LogIn class="h-4 w-4" />
					<span>Ingresar</span>
				{/if}
			</button>
		</form>
	</div>
</div>
