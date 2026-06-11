<script lang="ts">
	import { authStore } from '$lib/stores/auth';
	import { login as apiLogin, cambiarPassword } from '$lib/api/index';
	import { goto } from '$app/navigation';
	import { LogIn, KeyRound } from '@lucide/svelte';

	let nombre_usuario = $state('');
	let password = $state('');
	let error = $state('');
	let info = $state('');
	let loading = $state(false);

	// CU-10: con la bandera de cambio obligatorio activa se pide nueva contraseña
	let modoCambioPassword = $state(false);
	let nueva_password = $state('');
	let confirmar_password = $state('');
	const REGEX_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d\W_]{8,64}$/;

	// CU-01 Excepción 1: formato inválido muestra el mensaje genérico
	// sin especificar cuál campo falló.
	const MSG_GENERICO = 'Usuario o contraseña incorrectos.';

	function formatoValido() {
		return /^[a-z0-9_]{4,20}$/.test(nombre_usuario) && password.length >= 8 && password.length <= 64;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		if (!formatoValido()) {
			error = MSG_GENERICO;
			return;
		}
		loading = true;
		try {
			const res = await apiLogin({ nombre_usuario, password });
			// CU-10: el acceso se bloquea hasta establecer una contraseña propia
			if (res.debe_cambiar_password) {
				modoCambioPassword = true;
				info = 'Su contraseña fue restablecida. Debe establecer una nueva contraseña antes de continuar.';
				return;
			}
			if (res.access_token && res.usuario) {
				authStore.login(res.access_token, res.usuario);
				goto('/dashboard');
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : '';
			// 400 de validación del backend también se traduce al genérico (CU-01)
			error = msg.includes('must') || !msg ? MSG_GENERICO : msg;
		} finally {
			loading = false;
		}
	}

	async function handleCambioPassword(e: Event) {
		e.preventDefault();
		error = '';
		if (nueva_password !== confirmar_password) {
			error = 'Las contraseñas no coinciden.';
			return;
		}
		if (!REGEX_PASSWORD.test(nueva_password)) {
			error = 'La nueva contraseña debe tener entre 8 y 64 caracteres, e incluir al menos una mayúscula, una minúscula y un número.';
			return;
		}
		loading = true;
		try {
			await cambiarPassword({ nombre_usuario, password_actual: password, nueva_password });
			// Iniciar sesión automáticamente con la contraseña recién establecida
			const res = await apiLogin({ nombre_usuario, password: nueva_password });
			if (res.access_token && res.usuario) {
				authStore.login(res.access_token, res.usuario);
				goto('/dashboard');
			}
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cambiar la contraseña';
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

		{#if modoCambioPassword}
			<!-- CU-10: cambio obligatorio de contraseña tras restablecimiento -->
			<form
				onsubmit={handleCambioPassword}
				class="bg-white rounded-lg border border-border p-6 shadow-sm space-y-4"
				autocomplete="off"
			>
				<h2 class="text-lg font-semibold text-foreground">Establecer nueva contraseña</h2>

				{#if info}
					<div class="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-md px-3 py-2">
						{info}
					</div>
				{/if}
				{#if error}
					<div class="bg-red-50 border border-red-200 text-destructive text-sm rounded-md px-3 py-2" role="alert">
						{error}
					</div>
				{/if}

				<div>
					<label for="nueva_password" class="block text-sm font-medium text-foreground mb-1">
						Nueva contraseña
					</label>
					<input
						id="nueva_password"
						type="password"
						bind:value={nueva_password}
						required
						autocomplete="new-password"
						class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
						placeholder="8-64 caracteres, mayúscula, minúscula y número"
					/>
				</div>

				<div>
					<label for="confirmar_password" class="block text-sm font-medium text-foreground mb-1">
						Confirmar nueva contraseña
					</label>
					<input
						id="confirmar_password"
						type="password"
						bind:value={confirmar_password}
						required
						autocomplete="new-password"
						class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
						placeholder="repita la nueva contraseña"
					/>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white rounded-md text-sm font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					<KeyRound class="h-4 w-4" />
					<span>{loading ? 'Guardando...' : 'Guardar y entrar'}</span>
				</button>

				<button
					type="button"
					onclick={() => { modoCambioPassword = false; error = ''; info = ''; nueva_password = ''; confirmar_password = ''; }}
					class="w-full text-sm text-muted hover:text-foreground transition-colors"
				>
					Volver al inicio de sesión
				</button>
			</form>
		{:else}
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
		{/if}
	</div>
</div>
