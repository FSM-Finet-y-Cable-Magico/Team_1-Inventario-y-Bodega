<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getCatalog, createCatalogItem, deleteCatalogItem } from '$lib/api/index';
	import type { TipoEquipo } from '$lib/types';
	import Button from '$lib/components/Button.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import SearchInput from '$lib/components/SearchInput.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { Plus, RotateCw, Pencil, Trash2, FileText } from '@lucide/svelte';

	let items = $state<TipoEquipo[]>([]);
	let loading = $state(true);
	let error = $state('');
	let search = $state('');
	let categFilter = $state('');

	let showCreate = $state(false);
	let createForm = $state({ nombre: '', categoria: '', requiereSerialNumber: true });
	let createError = $state('');
	let creating = $state(false);

	let deletingItem = $state<TipoEquipo | null>(null);

	const categorias = ['ONT/ONU', 'Decodificador', 'Splitter', 'Router', 'Fuente de poder', 'Fibra óptica', 'Conector', 'Otro'];

	async function load() {
		loading = true;
		error = '';
		try {
			items = await getCatalog({
				activo: true,
				buscar: search || undefined,
				categoria: categFilter || undefined
			});
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cargar catálogo';
		} finally {
			loading = false;
		}
	}

	onMount(load);

	$effect(() => { search; categFilter; load(); });

	async function handleCreate() {
		createError = '';
		creating = true;
		try {
			await createCatalogItem(createForm as unknown as Record<string, unknown>);
			showCreate = false;
			createForm = { nombre: '', categoria: '', requiereSerialNumber: true };
			await load();
		} catch (err: unknown) {
			createError = err instanceof Error ? err.message : 'Error al crear tipo de equipo';
		} finally {
			creating = false;
		}
	}

	async function handleDelete() {
		if (!deletingItem) return;
		try {
			await deleteCatalogItem(deletingItem.id_tipo_equipo);
			await load();
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al desactivar equipo';
		} finally {
			deletingItem = null;
		}
	}
</script>

<div class="max-w-6xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-xl font-bold text-foreground">Catálogo de Equipos</h1>
		<div class="flex items-center gap-3">
			<Button variant="secondary" onclick={load}>
				<RotateCw class="h-4 w-4" />
				Actualizar
			</Button>
			<Button onclick={() => (showCreate = true)}>
				<Plus class="h-4 w-4" />
				Nuevo tipo
			</Button>
		</div>
	</div>

	<div class="flex items-center gap-4 mb-4">
		<div class="flex-1 max-w-xs">
			<SearchInput bind:value={search} placeholder="Buscar por nombre..." />
		</div>
		<select
			bind:value={categFilter}
			class="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
		>
			<option value="">Todas las categorías</option>
			{#each categorias as cat}
				<option value={cat}>{cat}</option>
			{/each}
		</select>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4">{error}</div>
	{/if}

	<div class="bg-white rounded-lg border border-border overflow-hidden">
		{#if loading}
			<div class="p-8 text-center text-sm text-muted">Cargando...</div>
		{:else if items.length === 0}
			<EmptyState message="No hay tipos de equipo registrados" action={() => (showCreate = true)} actionlabel="Crear tipo" />
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border bg-surface/50">
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Nombre</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Categoría</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Naturaleza</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Ficha técnica</th>
							<th class="text-right px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#each items as item, i}
							<tr class="border-b border-border transition-colors hover:bg-surface-alt/50 {i % 2 === 0 ? 'bg-white' : 'bg-surface/30'}">
								<td class="px-4 py-3 font-medium text-foreground">{item.nombre}</td>
								<td class="px-4 py-3">
									<Badge>{item.categoria || 'Sin categoría'}</Badge>
								</td>
								<td class="px-4 py-3">
									<Badge variant={item.requiere_serie_individual ? 'info' : 'default'}>
										{item.requiere_serie_individual ? 'Individualizable' : 'Consumible'}
									</Badge>
								</td>
								<td class="px-4 py-3">
									{#if item.ficha_tecnica_pdf_url}
										<a href={item.ficha_tecnica_pdf_url} target="_blank" class="inline-flex items-center gap-1 text-accent hover:text-accent-hover">
											<FileText class="h-4 w-4" />
											<span class="text-xs">Ver PDF</span>
										</a>
									{:else}
										<span class="text-muted text-xs">Sin ficha</span>
									{/if}
								</td>
								<td class="px-4 py-3 text-right">
									<div class="flex items-center justify-end gap-1">
										<button onclick={() => goto(`/catalogo/${item.id_tipo_equipo}`)}
											class="p-1.5 rounded-md hover:bg-surface-alt text-muted hover:text-foreground transition-colors"
											aria-label="Editar">
											<Pencil class="h-4 w-4" />
										</button>
										<button onclick={() => (deletingItem = item)}
											class="p-1.5 rounded-md hover:bg-red-50 text-muted hover:text-destructive transition-colors"
											aria-label="Desactivar">
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

<Modal title="Nuevo tipo de equipo" open={showCreate} onclose={() => (showCreate = false)}>
	<form onsubmit={(e: Event) => { e.preventDefault(); handleCreate(); }} class="space-y-4">
		{#if createError}
			<div class="bg-red-50 border border-red-200 text-destructive text-sm rounded-md px-3 py-2">{createError}</div>
		{/if}

		<FormField label="Nombre" name="nom" required>
			<input id="nom" type="text" required bind:value={createForm.nombre}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				placeholder="Ej: ONT Huawei" />
		</FormField>

		<FormField label="Categoría" name="cat">
			<select id="cat" bind:value={createForm.categoria}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
				<option value="">Sin categoría</option>
				{#each categorias as cat}
					<option value={cat}>{cat}</option>
				{/each}
			</select>
		</FormField>

		<FormField label="Naturaleza" name="nat">
			<div class="flex gap-4">
				<label class="flex items-center gap-2 text-sm cursor-pointer">
					<input type="radio" name="naturaleza" bind:group={createForm.requiereSerialNumber} value={true} class="text-accent" />
					Individualizable (con serie)
				</label>
				<label class="flex items-center gap-2 text-sm cursor-pointer">
					<input type="radio" name="naturaleza" bind:group={createForm.requiereSerialNumber} value={false} class="text-accent" />
					Consumible / Volumen
				</label>
			</div>
		</FormField>

		<div class="flex justify-end gap-3 pt-2">
			<Button variant="secondary" onclick={() => (showCreate = false)} type="button">Cancelar</Button>
			<Button type="submit" loading={creating}>Crear tipo</Button>
		</div>
	</form>
</Modal>

<ConfirmDialog
	open={deletingItem !== null}
	title="Desactivar tipo de equipo"
	message={deletingItem ? `¿Desactivar "${deletingItem.nombre}"? Los equipos existentes no se eliminarán.` : ''}
	confirmlabel="Desactivar"
	onconfirm={handleDelete}
	oncancel={() => (deletingItem = null)}
/>
