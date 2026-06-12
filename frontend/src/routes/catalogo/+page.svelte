<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getCatalog, createCatalogItem, deleteCatalogItem, hardDeleteCatalogItem, downloadFichaTecnica } from '$lib/api/index';
	import type { TipoEquipo } from '$lib/types';
	import Button from '$lib/components/Button.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import SearchInput from '$lib/components/SearchInput.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { Plus, RotateCw, Pencil, Trash2, FileText, Ban } from '@lucide/svelte';

	let items = $state<TipoEquipo[]>([]);
	let loading = $state(true);
	let error = $state('');
	let search = $state('');
	let categFilter = $state('');
	// CU-25: filtro por estado (Activo/Inactivo/Todos)
	let estadoFilter = $state('true');

	let showCreate = $state(false);
	// CU-24: nombre, categoría, marca, modelo, descripción técnica,
	// requiere serie, unidad de medida (solo si no requiere serie) y garantía
	let createForm = $state({
		nombre: '',
		categoria: '',
		marca: '',
		modelo: '',
		descripcionTecnica: '',
		requiereSerialNumber: true,
		unidadMedida: '',
		garantiaDias: 0
	});
	let createError = $state('');
	let creating = $state(false);

	// CU-27: desactivación lógica vs eliminación física
	let deletingItem = $state<TipoEquipo | null>(null);
	let hardDeletingItem = $state<TipoEquipo | null>(null);

	// CU-24: categorías y unidades de medida definidas en el caso de uso
	const categorias = ['ONT/ONU', 'Decodificador', 'Splitter', 'Herramienta', 'Consumible fibra óptica', 'Consumible conector', 'Consumible otro', 'Otro'];
	const unidadesMedida = ['Unidad', 'Metro', 'Rollo'];

	async function load() {
		loading = true;
		error = '';
		try {
			items = await getCatalog({
				activo: estadoFilter === '' ? undefined : estadoFilter === 'true',
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

	$effect(() => { search; categFilter; estadoFilter; load(); });

	async function handleCreate() {
		createError = '';
		creating = true;
		try {
			await createCatalogItem(createForm as unknown as Record<string, unknown>);
			showCreate = false;
			createForm = { nombre: '', categoria: '', marca: '', modelo: '', descripcionTecnica: '', requiereSerialNumber: true, unidadMedida: '', garantiaDias: 0 };
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

	// CU-27 Excepción 1: el backend impide eliminar con unidades registradas
	async function handleHardDelete() {
		if (!hardDeletingItem) return;
		try {
			await hardDeleteCatalogItem(hardDeletingItem.id_tipo_equipo);
			await load();
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al eliminar tipo de equipo';
		} finally {
			hardDeletingItem = null;
		}
	}

	// CU-30: descarga autenticada de la ficha técnica
	async function handleDownloadFicha(item: TipoEquipo) {
		error = '';
		try {
			await downloadFichaTecnica(item.id_tipo_equipo, item.fichaTecnicaNombre ?? 'ficha-tecnica.pdf');
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al descargar ficha técnica';
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
			<SearchInput bind:value={search} placeholder="Buscar por nombre, marca o modelo..." />
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
		<select bind:value={estadoFilter} aria-label="Filtrar por estado"
			class="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
			<option value="">Todos los estados</option>
			<option value="true">Activo</option>
			<option value="false">Inactivo</option>
		</select>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4">{error}</div>
	{/if}

	<div class="bg-white rounded-lg border border-border overflow-hidden">
		{#if loading}
			<div class="p-8 text-center text-sm text-muted">Cargando...</div>
		{:else if items.length === 0}
			<EmptyState message="No se encontraron tipos de equipo con los filtros seleccionados." action={() => (showCreate = true)} actionlabel="Crear tipo" />
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border bg-surface/50">
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Nombre</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Categoría</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Marca</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Modelo</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Estado</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Req. N° serie</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">U. medida</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Garantía (días)</th>
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
								<td class="px-4 py-3 text-foreground">{item.marca || '-'}</td>
								<td class="px-4 py-3 text-foreground">{item.modelo || '-'}</td>
								<td class="px-4 py-3">
									<Badge variant={item.activo ? 'success' : 'danger'}>{item.activo ? 'Activo' : 'Inactivo'}</Badge>
								</td>
								<td class="px-4 py-3">
									<Badge variant={item.requiereSerialNumber ? 'info' : 'default'}>
										{item.requiereSerialNumber ? 'Sí' : 'No'}
									</Badge>
								</td>
								<td class="px-4 py-3 text-muted">{item.unidadMedida || '-'}</td>
								<td class="px-4 py-3 text-muted">{item.garantiaDias ?? 0}</td>
								<td class="px-4 py-3">
									{#if item.fichaTecnicaPdfUrl}
										<!-- CU-30: descarga autenticada del PDF -->
										<button onclick={() => handleDownloadFicha(item)}
											class="inline-flex items-center gap-1 text-accent hover:text-accent-hover"
											title={item.fichaTecnicaNombre ?? 'Descargar ficha técnica'}>
											<FileText class="h-4 w-4" />
											<span class="text-xs">Descargar PDF</span>
										</button>
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
										{#if item.activo}
											<!-- CU-27: desactivación lógica, solo para tipos activos -->
											<button onclick={() => (deletingItem = item)}
												class="p-1.5 rounded-md hover:bg-amber-50 text-muted hover:text-amber-600 transition-colors"
												aria-label="Desactivar">
												<Ban class="h-4 w-4" />
											</button>
										{/if}
										<!-- CU-27 Excepción 1: eliminación física -->
										<button onclick={() => (hardDeletingItem = item)}
											class="p-1.5 rounded-md hover:bg-red-50 text-muted hover:text-destructive transition-colors"
											aria-label="Eliminar">
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

		<FormField label="Nombre del tipo" name="nom" required helper="3-80 caracteres">
			<input id="nom" type="text" required bind:value={createForm.nombre}
				minlength={3} maxlength={80}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				placeholder="Ej: ONT Huawei EchoLife" />
		</FormField>

		<FormField label="Categoría" name="cat" required>
			<select id="cat" required bind:value={createForm.categoria}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
				<option value="" disabled>Seleccionar...</option>
				{#each categorias as cat}
					<option value={cat}>{cat}</option>
				{/each}
			</select>
		</FormField>

		<div class="grid grid-cols-2 gap-4">
			<FormField label="Marca" name="mar" required helper="2-50 caracteres">
				<input id="mar" type="text" required bind:value={createForm.marca}
					minlength={2} maxlength={50}
					class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
					placeholder="Ej: Huawei" />
			</FormField>
			<FormField label="Modelo" name="mod" required helper="1-50 caracteres">
				<input id="mod" type="text" required bind:value={createForm.modelo}
					minlength={1} maxlength={50}
					class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
					placeholder="Ej: EG8145V5" />
			</FormField>
		</div>

		<FormField label="Descripción técnica" name="desc" helper="Opcional, máximo 500 caracteres">
			<textarea id="desc" bind:value={createForm.descripcionTecnica} maxlength={500} rows="2"
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"></textarea>
		</FormField>

		<FormField label="¿Requiere número de serie individual?" name="nat" required>
			<div class="flex gap-4">
				<label class="flex items-center gap-2 text-sm cursor-pointer">
					<input type="radio" name="naturaleza" bind:group={createForm.requiereSerialNumber} value={true} class="text-accent" />
					Sí
				</label>
				<label class="flex items-center gap-2 text-sm cursor-pointer">
					<input type="radio" name="naturaleza" bind:group={createForm.requiereSerialNumber} value={false} class="text-accent" />
					No
				</label>
			</div>
		</FormField>

		<!-- CU-24: la unidad de medida solo aplica (y es obligatoria) si NO requiere serie -->
		{#if createForm.requiereSerialNumber === false}
			<FormField label="Unidad de medida" name="um" required>
				<select id="um" required bind:value={createForm.unidadMedida}
					class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
					<option value="" disabled>Seleccionar...</option>
					{#each unidadesMedida as um}
						<option value={um}>{um}</option>
					{/each}
				</select>
			</FormField>
		{/if}

		<FormField label="Duración de garantía (días)" name="gar" helper="0 a 3650; 0 significa sin garantía">
			<input id="gar" type="number" min={0} max={3650} step={1} bind:value={createForm.garantiaDias}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
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
	message={deletingItem ? `¿Desactivar "${deletingItem.nombre}"? Dejará de aparecer en las listas de selección; sus registros históricos y unidades existentes se conservan.` : ''}
	confirmlabel="Desactivar"
	onconfirm={handleDelete}
	oncancel={() => (deletingItem = null)}
/>

<!-- CU-27: la eliminación física solo procede si no hay unidades registradas -->
<ConfirmDialog
	open={hardDeletingItem !== null}
	title="Eliminar tipo de equipo"
	message={hardDeletingItem ? `¿Eliminar definitivamente "${hardDeletingItem.nombre}" del catálogo? Esta acción no se puede deshacer.` : ''}
	confirmlabel="Eliminar"
	onconfirm={handleHardDelete}
	oncancel={() => (hardDeletingItem = null)}
/>
