<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { getUser, getRoles, getEmpresas, updateUser, restablecerPassword } from '$lib/api/index';
	import type { Usuario, Rol, Empresa } from '$lib/types';
	import Button from '$lib/components/Button.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { currentUser, userRoles } from '$lib/stores/auth';
	import { ArrowLeft, Save, KeyRound } from '@lucide/svelte';

	let usuario = $state<Usuario | null>(null);
	let roles = $state<Rol[]>([]);
	let empresas = $state<Empresa[]>([]);
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');
	let success = $state('');

	// CU-06: campos editables: nombre completo, empresa, rol y estado
	let editForm = $state({ nombre_completo: '', id_empresa: null as number | null, activo: true });
	let selectedRoles = $state<number[]>([]);

	let showResetConfirm = $state(false);
	let showDeactivateConfirm = $state(false);
	let resetResult = $state('');
	let resetting = $state(false);

	// CU-07 Excepción 1: no se puede desactivar la cuenta propia
	const esCuentaPropia = $derived(usuario?.id_usuario === $currentUser?.id_usuario);
	// Solo el Superusuario puede cambiar la empresa de un usuario
	const esSuperusuario = $derived($userRoles.includes('SUPERUSUARIO'));

	async function load() {
		loading = true;
		error = '';
		const id = Number($page.params.id);
		try {
			const [userData, rolesData, empresasData] = await Promise.all([
				getUser(id),
				getRoles(),
				getEmpresas()
			]);
			usuario = userData;
			roles = rolesData as Rol[];
			empresas = empresasData;
			editForm.nombre_completo = userData.nombre_completo;
			editForm.id_empresa = userData.id_empresa;
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
			resetResult = res.password_temporal;
			showResetConfirm = false;
			success = 'Contraseña restablecida correctamente';
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al restablecer contraseña';
		} finally {
			resetting = false;
		}
	}

	function handleSave() {
		// CU-07: desactivar una cuenta activa requiere confirmación explícita
		if (usuario?.activo && !editForm.activo) {
			showDeactivateConfirm = true;
			return;
		}
		doSave();
	}

	async function doSave() {
		showDeactivateConfirm = false;
		saving = true;
		error = '';
		success = '';
		const id = Number($page.params.id);
		try {
			await updateUser(id, {
				nombre_completo: editForm.nombre_completo,
				activo: editForm.activo,
				roles: selectedRoles,
				...(editForm.id_empresa != null ? { id_empresa: editForm.id_empresa } : {})
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
					<!-- CU-10 Excepción 1: no se restablece la contraseña de un usuario inactivo -->
					<Button
						variant="secondary"
						size="sm"
						disabled={!usuario.activo}
						title={!usuario.activo
							? 'No es posible restablecer la contraseña de un usuario inactivo.'
							: undefined}
						onclick={() => (showResetConfirm = true)}
					>
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
						class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
						pattern={'^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]{2,80}$'}
						title="2-80 caracteres, solo letras, espacios y tildes" />
				</FormField>

				<!-- CU-06: empresa del usuario; solo el Superusuario puede cambiarla -->
				<FormField label="Empresa" name="emp">
					<select id="emp" bind:value={editForm.id_empresa} disabled={!esSuperusuario}
						class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white disabled:bg-surface-alt disabled:text-muted">
						<option value={null}>Sin empresa asignada</option>
						{#each empresas as emp}
							<option value={emp.id}>{emp.nombre}</option>
						{/each}
					</select>
					{#if !esSuperusuario}
						<p class="text-xs text-muted mt-1">Solo un Superusuario puede cambiar la empresa.</p>
					{/if}
				</FormField>

				<FormField label="Estado" name="st">
					<label class="flex items-center gap-2 text-sm {esCuentaPropia ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}">
						<input type="checkbox" bind:checked={editForm.activo} disabled={esCuentaPropia} class="rounded border-border" />
						<span>Usuario activo</span>
					</label>
					{#if esCuentaPropia}
						<p class="text-xs text-muted mt-1">No es posible desactivar su propia cuenta.</p>
					{/if}
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

<!-- CU-07: confirmación al desactivar la cuenta desde la edición -->
<ConfirmDialog
	open={showDeactivateConfirm}
	title="Desactivar usuario"
	message={usuario ? `¿Está seguro que desea desactivar la cuenta de ${usuario.nombre_usuario}? Esta acción impedirá futuros inicios de sesión.` : ''}
	confirmlabel="Desactivar"
	onconfirm={doSave}
	oncancel={() => (showDeactivateConfirm = false)}
/>

<ConfirmDialog
	open={showResetConfirm}
	title="Restablecer contraseña"
	message={usuario ? `¿Restablecer contraseña de "${usuario.nombre_completo}"? Se generará una contraseña temporal de 10 caracteres.` : ''}
	confirmlabel="Restablecer"
	variant="primary"
	onconfirm={handleResetPassword}
	oncancel={() => (showResetConfirm = false)}
/>
