<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getUsers, getRoles, createUser, deleteUser, getEmpresas } from '$lib/api/index';
	import type { Usuario, Rol, Empresa } from '$lib/types';
	import Button from '$lib/components/Button.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import SearchInput from '$lib/components/SearchInput.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { currentUser, userRoles } from '$lib/stores/auth';
	import { Plus, RotateCw, Pencil, Trash2, X } from '@lucide/svelte';

	let usuarios = $state<Usuario[]>([]);
	let roles = $state<Rol[]>([]);
	let loading = $state(true);
	let error = $state('');
	let search = $state('');
	let filtroRol = $state('');
	let filtroEstado = $state('');

	// CU-05: fecha de creación en formato DD/MM/YYYY
	function fmtFecha(fecha: string): string {
		if (!fecha) return '-';
		return new Date(fecha).toLocaleDateString('en-GB', {
			day: '2-digit', month: '2-digit', year: 'numeric',
			timeZone: 'America/Santiago'
		});
	}

	let showCreate = $state(false);
	// CU-04: nombre completo, usuario, contraseña, empresa, rol y estado
	let createForm = $state({ nombre_usuario: '', nombre_completo: '', password: '', roles: [] as number[], id_empresa: 0, activo: true });
	let empresas = $state<Empresa[]>([]);
	// Solo el Superusuario puede asignar otra empresa (CU-04)
	const esSuperusuario = $derived($userRoles.includes('SUPERUSUARIO'));
	const hayFiltrosActivos = $derived(Boolean(search || filtroRol || filtroEstado !== ''));
	let createError = $state('');
	let creating = $state(false);

	let deletingUser = $state<Usuario | null>(null);

	async function load() {
		loading = true;
		error = '';
		try {
			const [usersData, rolesData] = await Promise.all([
				getUsers({
					activo: filtroEstado === '' ? undefined : filtroEstado === 'true',
					buscar: search || undefined,
					rol: filtroRol || undefined
				}),
				getRoles()
			]);
			usuarios = usersData;
			roles = rolesData as Rol[];
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cargar usuarios';
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		load();
		try { empresas = await getEmpresas(); } catch { /* sin permiso */ }
	});

	$effect(() => {
		search; filtroRol; filtroEstado;
		load();
	});

	async function handleCreate() {
		createError = '';
		creating = true;
		try {
			const { id_empresa, ...rest } = createForm;
			// la empresa solo se envía si el Superusuario eligió una distinta
			const payload: Record<string, unknown> = esSuperusuario && id_empresa ? { ...rest, id_empresa } : rest;
			await createUser(payload);
			showCreate = false;
			createForm = { nombre_usuario: '', nombre_completo: '', password: '', roles: [], id_empresa: 0, activo: true };
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

	function limpiarFiltros() {
		search = '';
		filtroRol = '';
		filtroEstado = '';
	}
</script>

<div class="max-w-6xl mx-auto">
	<div class="flex items-center justify-between mb-2">
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
	<p class="text-sm text-muted mb-6">
		{#if esSuperusuario}
			Listado consolidado de usuarios de todas las empresas.
		{:else}
			Mostrando usuarios de <span class="font-medium text-foreground">{$currentUser?.empresa?.nombre ?? 'su empresa'}</span>.
		{/if}
	</p>

	<!-- CU-05: filtros por rol, estado o nombre (completo o de usuario) -->
	<div class="flex flex-wrap items-center gap-3 mb-4">
		<div class="flex-1 max-w-xs">
			<SearchInput bind:value={search} placeholder="Buscar por nombre o usuario..." />
		</div>
		<select bind:value={filtroRol} aria-label="Filtrar por rol"
			class="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
			<option value="">Todos los roles</option>
			{#each roles as rol}
				<option value={rol.nombre_rol}>{rol.nombre_rol}</option>
			{/each}
		</select>
		<select bind:value={filtroEstado} aria-label="Filtrar por estado"
			class="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
			<option value="">Todos los estados</option>
			<option value="true">Activo</option>
			<option value="false">Inactivo</option>
		</select>
		{#if hayFiltrosActivos}
			<button
				onclick={limpiarFiltros}
				class="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
				type="button">
				<X class="h-3 w-3" />
				Limpiar filtros
			</button>
		{/if}
	</div>

	{#if hayFiltrosActivos}
		<div class="flex flex-wrap items-center gap-2 mb-4">
			<span class="text-xs text-muted">Filtros activos:</span>
			{#if search}
				<Badge variant="default">Búsqueda: {search}</Badge>
			{/if}
			{#if filtroRol}
				<Badge variant="default">Rol: {filtroRol}</Badge>
			{/if}
			{#if filtroEstado !== ''}
				<Badge variant="default">Estado: {filtroEstado === 'true' ? 'Activo' : 'Inactivo'}</Badge>
			{/if}
		</div>
	{/if}

	{#if error}
		<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4">{error}</div>
	{/if}

	<div class="bg-white rounded-lg border border-border overflow-hidden">
		{#if loading}
			<div class="p-8 text-center text-sm text-muted">Cargando...</div>
		{:else if usuarios.length === 0}
			<EmptyState
				message={hayFiltrosActivos ? 'No se encontraron usuarios con los filtros seleccionados.' : 'No hay usuarios registrados en esta empresa.'}
				action={() => (showCreate = true)}
				actionlabel="Crear usuario"
			/>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<!-- CU-05: nombre completo, nombre de usuario, rol, estado y fecha de creación -->
						<tr class="border-b border-border bg-surface/50">
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Nombre completo</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Nombre de usuario</th>
							{#if esSuperusuario}
								<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Empresa</th>
							{/if}
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Rol</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Estado</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Fecha de creación</th>
							<th class="text-right px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#each usuarios as user, i}
							<tr class="border-b border-border transition-colors hover:bg-surface-alt/50 {i % 2 === 0 ? 'bg-white' : 'bg-surface/30'}">
								<td class="px-4 py-3 font-medium text-foreground">{user.nombre_completo}</td>
								<td class="px-4 py-3 text-foreground">{user.nombre_usuario}</td>
								{#if esSuperusuario}
									<td class="px-4 py-3 text-foreground">{user.empresa_nombre || '-'}</td>
								{/if}
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
								<td class="px-4 py-3">
									<Badge variant={user.activo ? 'success' : 'danger'}>{user.activo ? 'Activo' : 'Inactivo'}</Badge>
								</td>
								<td class="px-4 py-3 text-muted whitespace-nowrap">{fmtFecha(user.fecha_creacion)}</td>
								<td class="px-4 py-3 text-right">
									<div class="flex items-center justify-end gap-1">
										<button
											onclick={() => goto(`/usuarios/${user.id_usuario}`)}
											class="p-1.5 rounded-md hover:bg-surface-alt text-muted hover:text-foreground transition-colors"
											aria-label="Editar usuario"
										>
											<Pencil class="h-4 w-4" />
										</button>
										<!-- CU-07 Excepción 1: no se puede desactivar la cuenta propia -->
										{#if user.activo && user.id_usuario !== $currentUser?.id_usuario}
											<button
												onclick={() => (deletingUser = user)}
												class="p-1.5 rounded-md hover:bg-red-50 text-muted hover:text-destructive transition-colors"
												aria-label="Desactivar usuario"
											>
												<Trash2 class="h-4 w-4" />
											</button>
										{/if}
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
	<!-- autocomplete=off + new-password: evita que el navegador autocomplete las
	     credenciales del admin en el formulario y que ofrezca guardar la contraseña -->
	<form onsubmit={(e: Event) => { e.preventDefault(); handleCreate(); }} class="space-y-4" autocomplete="off">
		{#if createError}
			<div class="bg-red-50 border border-red-200 text-destructive text-sm rounded-md px-3 py-2">{createError}</div>
		{/if}

		<FormField label="Nombre de usuario" name="nu" required>
			<input id="nu" type="text" required bind:value={createForm.nombre_usuario}
				autocomplete="off"
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				placeholder="ej: jperez" pattern={'^[a-z0-9_]{4,20}$'}
				title="4-20 caracteres, minúsculas, números y guión bajo" />
		</FormField>

		<FormField label="Nombre completo" name="nc" required>
			<input id="nc" type="text" required bind:value={createForm.nombre_completo}
				autocomplete="off"
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				placeholder="Juan Pérez" pattern={'^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]{2,80}$'}
				title="2-80 caracteres, solo letras, espacios y tildes" />
		</FormField>

		<!-- CU-04: empresa asignada; un Administrador solo crea en su propia empresa -->
		<FormField label="Empresa" name="emp">
			{#if esSuperusuario}
				<select id="emp" bind:value={createForm.id_empresa}
					class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
					<option value={$currentUser?.empresa?.id ?? 0}>Mi empresa ({$currentUser?.empresa?.nombre ?? '—'})</option>
					{#each empresas as emp}
						{#if emp.id !== ($currentUser?.empresa?.id ?? 0)}
							<option value={emp.id}>{emp.nombre}</option>
						{/if}
					{/each}
				</select>
			{:else}
				<input id="emp" type="text" disabled value={$currentUser?.empresa?.nombre ?? '—'}
					class="w-full px-3 py-2 border border-border rounded-md text-sm bg-surface-alt text-muted" />
			{/if}
		</FormField>

		<FormField label="Contraseña" name="pw" required>
			<input id="pw" type="password" required bind:value={createForm.password}
				autocomplete="new-password"
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				placeholder="Mín. 8 caracteres" minlength={8} maxlength={64}
				pattern={'^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[A-Za-z\\d\\W_]{8,64}$'}
				title="8-64 caracteres, con al menos una mayúscula, una minúscula y un número" />
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

		<!-- CU-04: estado inicial de la cuenta -->
		<FormField label="Estado" name="est">
			<label class="flex items-center gap-2 text-sm cursor-pointer">
				<input type="checkbox" bind:checked={createForm.activo} class="rounded border-border" />
				<span>Usuario activo</span>
			</label>
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
	message={deletingUser ? `¿Está seguro que desea desactivar la cuenta de ${deletingUser.nombre_usuario}? Esta acción impedirá futuros inicios de sesión.` : ''}
	confirmlabel="Desactivar"
	onconfirm={handleDelete}
	oncancel={() => (deletingUser = null)}
/>
