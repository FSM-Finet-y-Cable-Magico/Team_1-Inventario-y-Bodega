<script lang="ts">
	import { onMount } from 'svelte';
	import { getProveedores, createProveedor, getCatalog } from '$lib/api/index';
	import type { Proveedor, TipoEquipo } from '$lib/types';
	import { userRoles } from '$lib/stores/auth';
	import SearchInput from '$lib/components/SearchInput.svelte';
	import Button from '$lib/components/Button.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { Plus, RotateCw } from '@lucide/svelte';

	let proveedores = $state<Proveedor[]>([]);
	let tiposEquipo = $state<TipoEquipo[]>([]);
	let loading = $state(true);
	let error = $state('');
	let search = $state('');

	let showCreate = $state(false);
	let createForm = $state({
		nombre_comercial: '',
		rut: '',
		nombre_contacto: '',
		telefono: '',
		email: '',
		ids_tipos_equipo: [] as number[]
	});
	let createError = $state('');
	let creating = $state(false);

	const rutPattern = '^\\d{7,8}-[\\dKk]$';
	const telPattern = '^\\d{8,15}$';

	async function load() {
		loading = true;
		error = '';
		try {
			proveedores = await getProveedores({ buscar: search || undefined });
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cargar proveedores';
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		load();
		try {
			tiposEquipo = (await getCatalog({ activo: true })) as TipoEquipo[];
		} catch { /* sin permiso */ }
	});

	$effect(() => { search; load(); });

	function toggleTipoEquipo(id: number) {
		if (createForm.ids_tipos_equipo.includes(id)) {
			createForm.ids_tipos_equipo = createForm.ids_tipos_equipo.filter((x) => x !== id);
		} else {
			createForm.ids_tipos_equipo = [...createForm.ids_tipos_equipo, id];
		}
	}

	async function handleCreate() {
		createError = '';
		creating = true;
		try {
			const payload: Record<string, unknown> = {
				nombre_comercial: createForm.nombre_comercial,
				rut: createForm.rut,
			};
			if (createForm.nombre_contacto) payload.nombre_contacto = createForm.nombre_contacto;
			if (createForm.telefono) payload.telefono = createForm.telefono;
			if (createForm.email) payload.email = createForm.email;
			if (createForm.ids_tipos_equipo.length > 0) payload.ids_tipos_equipo = createForm.ids_tipos_equipo;

			await createProveedor(payload as any);
			showCreate = false;
			createForm = {
				nombre_comercial: '',
				rut: '',
				nombre_contacto: '',
				telefono: '',
				email: '',
				ids_tipos_equipo: []
			};
			await load();
		} catch (err: unknown) {
			createError = err instanceof Error ? err.message : 'Error al crear proveedor';
		} finally {
			creating = false;
		}
	}
</script>

<div class="max-w-6xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-xl font-bold text-foreground">Proveedores</h1>
		<div class="flex items-center gap-3">
			<Button variant="secondary" onclick={load}>
				<RotateCw class="h-4 w-4" />
				Actualizar
			</Button>
			<Button onclick={() => (showCreate = true)}>
				<Plus class="h-4 w-4" />
				Nuevo proveedor
			</Button>
		</div>
	</div>

	<div class="flex items-center gap-4 mb-4">
		<div class="flex-1 max-w-xs">
			<SearchInput bind:value={search} placeholder="Buscar por nombre o RUT..." />
		</div>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4">{error}</div>
	{/if}

	<div class="bg-white rounded-lg border border-border overflow-hidden">
		{#if loading}
			<div class="p-8 text-center text-sm text-muted">Cargando...</div>
		{:else if proveedores.length === 0}
			<EmptyState
				message="No se encontraron proveedores."
				action={() => (showCreate = true)}
				actionlabel="Nuevo proveedor"
			/>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border bg-surface/50">
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Nombre comercial</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">RUT</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Contacto</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Tipos de equipo</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Estado</th>
						</tr>
					</thead>
					<tbody>
						{#each proveedores as p, i}
							<tr class="border-b border-border transition-colors hover:bg-surface-alt/50 {i % 2 === 0 ? 'bg-white' : 'bg-surface/30'}">
								<td class="px-4 py-3 font-medium text-foreground">{p.nombre_comercial}</td>
								<td class="px-4 py-3 text-muted font-mono">{p.rut}</td>
								<td class="px-4 py-3 text-muted">
									{#if p.nombre_contacto}
										<span>{p.nombre_contacto}</span>
										{#if p.telefono}<span class="block text-xs">{p.telefono}</span>{/if}
										{#if p.email}<span class="block text-xs">{p.email}</span>{/if}
									{:else}
										<span class="text-xs italic">Sin contacto</span>
									{/if}
								</td>
								<td class="px-4 py-3">
									{#if p.tipos_equipo.length > 0}
										<div class="flex flex-wrap gap-1">
											{#each p.tipos_equipo as te}
												<Badge>{te.nombre}</Badge>
											{/each}
										</div>
									{:else}
										<span class="text-xs text-muted italic">Sin especificar</span>
									{/if}
								</td>
								<td class="px-4 py-3">
									<Badge variant={p.activa ? 'success' : 'danger'}>
										{p.activa ? 'Activo' : 'Inactivo'}
									</Badge>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<!-- CU-49: modal nuevo proveedor -->
<Modal title="Nuevo proveedor" open={showCreate} onclose={() => (showCreate = false)}>
	<form onsubmit={(e: Event) => { e.preventDefault(); handleCreate(); }} class="space-y-4">
		{#if createError}
			<div class="bg-red-50 border border-red-200 text-destructive text-sm rounded-md px-3 py-2">
				{createError}
			</div>
		{/if}

		<FormField label="Nombre comercial" name="nc" required helper="3–100 caracteres">
			<input
				id="nc" type="text" required
				bind:value={createForm.nombre_comercial}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				placeholder="Ej: Distribuidora TechNet"
				minlength={3} maxlength={100}
			/>
		</FormField>

		<FormField label="RUT" name="rut" required helper="Formato: XXXXXXXX-X (con dígito verificador)">
			<input
				id="rut" type="text" required
				bind:value={createForm.rut}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
				placeholder="Ej: 76543210-K"
				pattern={rutPattern}
			/>
		</FormField>

		<FormField label="Nombre de contacto" name="ncontacto" helper="Opcional, 2–80 caracteres">
			<input
				id="ncontacto" type="text"
				bind:value={createForm.nombre_contacto}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				placeholder="Ej: Juan Pérez"
				minlength={2} maxlength={80}
			/>
		</FormField>

		<FormField label="Teléfono" name="tel" helper="Opcional, 8–15 dígitos">
			<input
				id="tel" type="tel"
				bind:value={createForm.telefono}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				placeholder="Ej: 56912345678"
				pattern={telPattern}
			/>
		</FormField>

		<FormField label="Correo electrónico" name="email" helper="Opcional">
			<input
				id="email" type="email"
				bind:value={createForm.email}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				placeholder="Ej: contacto@proveedor.cl"
			/>
		</FormField>

		<!-- CU-49: tipos de equipo suministrados (selección múltiple del catálogo, opcional) -->
		{#if tiposEquipo.length > 0}
			<FormField label="Tipos de equipo suministrados" name="tipos" helper="Opcional — selección múltiple">
				<div class="border border-border rounded-md p-3 max-h-40 overflow-y-auto space-y-1">
					{#each tiposEquipo as te}
						<label class="flex items-center gap-2 cursor-pointer text-sm hover:bg-surface-alt/50 rounded px-1 py-0.5">
							<input
								type="checkbox"
								checked={createForm.ids_tipos_equipo.includes(te.id_tipo_equipo)}
								onchange={() => toggleTipoEquipo(te.id_tipo_equipo)}
								class="rounded border-border"
							/>
							<span>{te.nombre}</span>
						</label>
					{/each}
				</div>
			</FormField>
		{/if}

		<div class="flex justify-end gap-3 pt-2">
			<Button variant="secondary" onclick={() => (showCreate = false)} type="button">Cancelar</Button>
			<Button type="submit" loading={creating}>Crear proveedor</Button>
		</div>
	</form>
</Modal>
