<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { getUser, getRoles, updateUser, restablecerPassword } from '$lib/api/index';
	import type { Usuario, Rol } from '$lib/types';
	import Button from '$lib/components/Button.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { ArrowLeft, Save, KeyRound } from '@lucide/svelte';

	let usuario = $state<Usuario | null>(null);
	let roles = $state<Rol[]>([]);
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');
	let success = $state('');

	let editForm = $state({ nombre_completo: '', email: '', activo: true, roles: [] as number[] });
	let selectedRoles = $state<number[]>([]);

	let showResetConfirm = $state(false);
	let resetResult = $state('');
	let resetting = $state(false);

	async function load() {
		loading = true;
		error = '';
		const id = Number($page.params.id);
		try {
			const [userData, rolesData] = await Promise.all([getUser(id), getRoles()]);
			usuario = userData;
			roles = rolesData;
			editForm.nombre_completo = userData.nombre_completo;
			editForm.email = userData.email ?? '';
			editForm.activo = userData.activo;
			selectedRoles = userData.roles?.map((r: Rol) => r.id_rol) ?? [];
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cargar usuario';
		} finally {
			loading = false;
		}
	}

	onMount(load);

	async function handleResetPassword() {
		resetting = true;
		error = '';
		resetResult = '';
		try {
			const res = await restablecerPassword(Number($page.params.id));
			resetResult = res.nueva_password;
			showResetConfirm = false;
			success = 'Contraseña restablecida correctamente';
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al restablecer contraseña';
		} finally {
			resetting = false;
		}
	}

	async function handleSave() {
		saving = true;
		error = '';
		success = '';
		const id = Number($page.params.id);
		try {
			await updateUser(id, {
				nombre_completo: editForm.nombre_completo,
				email: editForm.email || undefined,
				activo: editForm.activo,
				roles: selectedRoles
			});
			success = 'Usuario actualizado correctamente';
			await load();
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al actualizar usuario';
		} finally {
			saving = false;
		}
	}
</script>

<div class="max-w-3xl mx-auto">
	<button
		onclick={() => goto('/usuarios')}
		class="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-4"
	>
		<ArrowLeft class="h-4 w-4" />
		Volver a usuarios
	</button>

	{#if loading}
		<div class="bg-white rounded-lg border border-border p-6 animate-pulse space-y-4">
			<div class="h-6 w-48 bg-surface-alt rounded"></div>
			<div class="h-4 w-full bg-surface-alt rounded"></div>
			<div class="h-4 w-3/4 bg-surface-alt rounded"></div>
		</div>
	{:else if !usuario}
		<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm">
			Usuario no encontrado
		</div>
	{:else}
		<div class="bg-white rounded-lg border border-border">
			<div class="px-6 py-4 border-b border-border flex items-center justify-between">
				<div>
					<h1 class="text-lg font-semibold text-foreground">{usuario.nombre_completo}</h1>
					<p class="text-sm text-muted">@{usuario.nombre_usuario}</p>
				</div>
				<div class="flex items-center gap-2">
					<Badge variant={usuario.activo ? 'success' : 'danger'}>
						{usuario.activo ? 'Activo' : 'Inactivo'}
					</Badge>
					<Button variant="secondary" size="sm" onclick={() => (showResetConfirm = true)}>
						<KeyRound class="h-4 w-4" />
						Reset password
					</Button>
				</div>
			</div>

			{#if resetResult}
				<div class="mx-6 mt-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-md px-4 py-3">
					<p class="font-medium mb-1">Nueva contraseña temporal:</p>
					<p class="font-mono text-base font-bold tracking-wider select-all">{resetResult}</p>
					<p class="text-xs mt-1 text-amber-600">El usuario deberá cambiar esta contraseña al iniciar sesión.</p>
				</div>
			{/if}

			{#if error}
				<div class="mx-6 mt-4 bg-red-50 border border-red-200 text-destructive text-sm rounded-md px-3 py-2">{error}</div>
			{/if}
			{#if success}
				<div class="mx-6 mt-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-md px-3 py-2">{success}</div>
			{/if}

			<form onsubmit={(e: Event) => { e.preventDefault(); handleSave(); }} class="p-6 space-y-4">
				<FormField label="Nombre completo" name="nc" required>
					<input id="nc" type="text" required bind:value={editForm.nombre_completo}
						class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
				</FormField>

				<FormField label="Email" name="em">
					<input id="em" type="email" bind:value={editForm.email}
						class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
				</FormField>

				<FormField label="Estado" name="st">
					<label class="flex items-center gap-2 text-sm cursor-pointer">
						<input type="checkbox" bind:checked={editForm.activo} class="rounded border-border" />
						<span>Usuario activo</span>
					</label>
				</FormField>

				<FormField label="Roles" name="rl">
					<div class="space-y-2">
						{#each roles as rol}
							<label class="flex items-center gap-2 text-sm cursor-pointer">
								<input type="checkbox" value={rol.id_rol}
									checked={selectedRoles.includes(rol.id_rol)}
									onchange={(e) => {
										const checked = (e.target as HTMLInputElement).checked;
										selectedRoles = checked
											? [...selectedRoles, rol.id_rol]
											: selectedRoles.filter((id) => id !== rol.id_rol);
									}}
									class="rounded border-border" />
								<span class="font-medium">{rol.nombre_rol}</span>
							</label>
						{/each}
					</div>
				</FormField>

				<div class="flex justify-end gap-3 pt-2">
					<Button variant="secondary" onclick={() => goto('/usuarios')} type="button">Cancelar</Button>
					<Button type="submit" loading={saving}>
						<Save class="h-4 w-4" />
						Guardar cambios
					</Button>
				</div>
			</form>
		</div>
	{/if}
</div>

<ConfirmDialog
	open={showResetConfirm}
	title="Restablecer contraseña"
	message={usuario ? `¿Restablecer contraseña de "${usuario.nombre_completo}"? Se generará una contraseña temporal de 10 caracteres.` : ''}
	confirmlabel="Restablecer"
	variant="primary"
	onconfirm={handleResetPassword}
	oncancel={() => (showResetConfirm = false)}
/>
