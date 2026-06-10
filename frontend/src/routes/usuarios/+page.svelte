<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getUsers, getRoles, createUser, deleteUser } from '$lib/api/index';
	import type { Usuario, Rol } from '$lib/types';
	import Button from '$lib/components/Button.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import SearchInput from '$lib/components/SearchInput.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { Plus, RotateCw, Pencil, Trash2 } from '@lucide/svelte';

	let usuarios = $state<Usuario[]>([]);
	let roles = $state<Rol[]>([]);
	let loading = $state(true);
	let error = $state('');
	let search = $state('');
	let showInactivos = $state(false);

	let showCreate = $state(false);
	let createForm = $state({ nombre_usuario: '', nombre_completo: '', email: '', password: '', roles: [] as number[] });
	let createError = $state('');
	let creating = $state(false);

	let deletingUser = $state<Usuario | null>(null);

	async function load() {
		loading = true;
		error = '';
		try {
			const [usersData, rolesData] = await Promise.all([
				getUsers(showInactivos ? undefined : true, search || undefined),
				getRoles()
			]);
			usuarios = usersData;
			roles = rolesData;
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cargar usuarios';
		} finally {
			loading = false;
		}
	}

	onMount(load);

	$effect(() => {
		search; showInactivos;
		load();
	});

	async function handleCreate() {
		createError = '';
		creating = true;
		try {
			await createUser(createForm as unknown as Record<string, unknown>);
			showCreate = false;
			createForm = { nombre_usuario: '', nombre_completo: '', email: '', password: '', roles: [] };
			await load();
		} catch (err: unknown) {
			createError = err instanceof Error ? err.message : 'Error al crear usuario';
		} finally {
			creating = false;
		}
	}

	async function handleDelete() {
		if (!deletingUser) return;
		try {
			await deleteUser(deletingUser.id_usuario);
			await load();
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al desactivar usuario';
		} finally {
			deletingUser = null;
		}
	}
</script>

<div class="max-w-6xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-xl font-bold text-foreground">Usuarios</h1>
		<div class="flex items-center gap-3">
			<Button variant="secondary" onclick={load}>
				<RotateCw class="h-4 w-4" />
				Actualizar
			</Button>
			<Button onclick={() => (showCreate = true)}>
				<Plus class="h-4 w-4" />
				Nuevo usuario
			</Button>
		</div>
	</div>

	<div class="flex items-center gap-4 mb-4">
		<div class="flex-1 max-w-xs">
			<SearchInput bind:value={search} placeholder="Buscar usuarios..." />
		</div>
		<label class="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
			<input type="checkbox" bind:checked={showInactivos} class="rounded border-border" />
			Mostrar inactivos
		</label>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4">{error}</div>
	{/if}

	<div class="bg-white rounded-lg border border-border overflow-hidden">
		{#if loading}
			<div class="p-8 text-center text-sm text-muted">Cargando...</div>
		{:else if usuarios.length === 0}
			<EmptyState message="No se encontraron usuarios" action={() => (showCreate = true)} actionlabel="Crear usuario" />
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border bg-surface/50">
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Usuario</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Nombre completo</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Email</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Estado</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Roles</th>
							<th class="text-right px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#each usuarios as user, i}
							<tr class="border-b border-border transition-colors hover:bg-surface-alt/50 {i % 2 === 0 ? 'bg-white' : 'bg-surface/30'}">
								<td class="px-4 py-3 font-medium text-foreground">{user.nombre_usuario}</td>
								<td class="px-4 py-3 text-foreground">{user.nombre_completo}</td>
								<td class="px-4 py-3 text-muted">{user.email || '-'}</td>
								<td class="px-4 py-3">
									<Badge variant={user.activo ? 'success' : 'danger'}>{user.activo ? 'Activo' : 'Inactivo'}</Badge>
								</td>
								<td class="px-4 py-3">
									<div class="flex flex-wrap gap-1">
										{#each user.roles ?? [] as rol}
											<Badge variant="info">{rol.nombre_rol}</Badge>
										{/each}
										{#if !user.roles?.length}
											<span class="text-muted text-xs">-</span>
										{/if}
									</div>
								</td>
								<td class="px-4 py-3 text-right">
									<div class="flex items-center justify-end gap-1">
										<button
											onclick={() => goto(`/usuarios/${user.id_usuario}`)}
											class="p-1.5 rounded-md hover:bg-surface-alt text-muted hover:text-foreground transition-colors"
											aria-label="Editar usuario"
										>
											<Pencil class="h-4 w-4" />
										</button>
										<button
											onclick={() => (deletingUser = user)}
											class="p-1.5 rounded-md hover:bg-red-50 text-muted hover:text-destructive transition-colors"
											aria-label="Desactivar usuario"
										>
											<Trash2 class="h-4 w-4" />
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<Modal title="Nuevo usuario" open={showCreate} onclose={() => (showCreate = false)}>
	<form onsubmit={(e: Event) => { e.preventDefault(); handleCreate(); }} class="space-y-4">
		{#if createError}
			<div class="bg-red-50 border border-red-200 text-destructive text-sm rounded-md px-3 py-2">{createError}</div>
		{/if}

		<FormField label="Nombre de usuario" name="nu" required>
			<input id="nu" type="text" required bind:value={createForm.nombre_usuario}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				placeholder="ej: jperez" pattern="^[a-z0-9_]{4,20}$"
				title="4-20 caracteres, minúsculas, números y guión bajo" />
		</FormField>

		<FormField label="Nombre completo" name="nc" required>
			<input id="nc" type="text" required bind:value={createForm.nombre_completo}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				placeholder="Juan Pérez" />
		</FormField>

		<FormField label="Email" name="em">
			<input id="em" type="email" bind:value={createForm.email}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				placeholder="juan@ejemplo.cl" />
		</FormField>

		<FormField label="Contraseña" name="pw" required>
			<input id="pw" type="password" required bind:value={createForm.password}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				placeholder="Mín. 8 caracteres" minlength={8} />
		</FormField>

		<FormField label="Roles" name="rl" required>
			<div class="space-y-2 max-h-40 overflow-y-auto">
				{#each roles as rol}
					<label class="flex items-center gap-2 text-sm cursor-pointer">
						<input type="checkbox" value={rol.id_rol}
							checked={createForm.roles.includes(rol.id_rol)}
							onchange={(e) => {
								const checked = (e.target as HTMLInputElement).checked;
								createForm.roles = checked
									? [...createForm.roles, rol.id_rol]
									: createForm.roles.filter((id) => id !== rol.id_rol);
							}}
							class="rounded border-border" />
						<span class="font-medium">{rol.nombre_rol}</span>
					</label>
				{/each}
			</div>
		</FormField>

		<div class="flex justify-end gap-3 pt-2">
			<Button variant="secondary" onclick={() => (showCreate = false)} type="button">Cancelar</Button>
			<Button type="submit" loading={creating}>Crear usuario</Button>
		</div>
	</form>
</Modal>

<ConfirmDialog
	open={deletingUser !== null}
	title="Desactivar usuario"
	message={deletingUser ? `¿Desactivar a "${deletingUser.nombre_completo}"? Esta acción no se puede revertir.` : ''}
	confirmlabel="Desactivar"
	onconfirm={handleDelete}
	oncancel={() => (deletingUser = null)}
/>
