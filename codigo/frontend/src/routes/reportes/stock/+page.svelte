<script lang="ts">
	import { onMount } from 'svelte';
	import { getEmpresas, generarReporteStock, getWarehouses, getCatalog, exportarReporteExcel } from '$lib/api/index';
	import type { Bodega, Empresa, ReporteStockFila, TipoEquipo } from '$lib/types';
	import Button from '$lib/components/Button.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { userRoles, currentUser } from '$lib/stores/auth';
	import { RotateCw, Filter, FileSpreadsheet } from '@lucide/svelte';

	let filas = $state<ReporteStockFila[]>([]);
	let empresas = $state<Empresa[]>([]);
	let bodegas = $state<Bodega[]>([]);
	let tipos = $state<TipoEquipo[]>([]);
	let loading = $state(false);
	let error = $state('');
	let exporting = $state(false);
	let exportError = $state('');
	let filters = $state({ id_empresa: '', id_bodega: '', id_tipo_equipo: '' });
	const esSuperusuario = $derived($userRoles.includes('SUPERUSUARIO'));
	const empresaActual = $derived($currentUser?.id_empresa);

	const filteredBodegas = $derived(
		bodegas.filter((bodega) => {
			const empresaFiltro = esSuperusuario ? filters.id_empresa : String(empresaActual ?? '');
			return !empresaFiltro || String(bodega.id_empresa) === empresaFiltro;
		}),
	);

	const filteredTipos = $derived(
		tipos.filter((tipo) => {
			const empresaFiltro = esSuperusuario ? filters.id_empresa : String(empresaActual ?? '');
			return !empresaFiltro || String(tipo.id_empresa) === empresaFiltro;
		}),
	);

	function resetFilters() {
		filters = { id_empresa: '', id_bodega: '', id_tipo_equipo: '' };
	}

	async function loadFilters() {
		try {
			empresas = esSuperusuario ? await getEmpresas() : [];
		} catch {
			empresas = [];
		}
		try {
			bodegas = await getWarehouses();
		} catch {
			bodegas = [];
		}
		try {
			tipos = await getCatalog();
		} catch {
			tipos = [];
		}
	}

	async function loadReport() {
		loading = true;
		error = '';
		try {
			filas = await generarReporteStock({
				id_empresa: filters.id_empresa || undefined,
				id_bodega: filters.id_bodega || undefined,
				id_tipo_equipo: filters.id_tipo_equipo || undefined,
			});
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'No se pudo cargar el reporte de stock.';
			filas = [];
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		await loadFilters();
		await loadReport();
	});

	function onEmpresaChange() {
		if (filters.id_bodega && !filteredBodegas.some((bodega) => String(bodega.id_bodega) === filters.id_bodega)) {
			filters.id_bodega = '';
		}
		if (
			filters.id_tipo_equipo &&
			!filteredTipos.some((tipo) => String(tipo.id_tipo_equipo) === filters.id_tipo_equipo)
		) {
			filters.id_tipo_equipo = '';
		}
	}

	async function handleExportExcel() {
		exporting = true;
		exportError = '';
		try {
			await exportarReporteExcel('stock', {
				id_empresa: filters.id_empresa || undefined,
				id_bodega: filters.id_bodega || undefined,
				id_tipo_equipo: filters.id_tipo_equipo || undefined,
			});
		} catch (err: unknown) {
			exportError = err instanceof Error ? err.message : 'No se pudo exportar el reporte a Excel.';
		} finally {
			exporting = false;
		}
	}

	$effect(() => {
		if (!esSuperusuario && filters.id_empresa) filters.id_empresa = '';
	});
</script>

<div class="max-w-7xl mx-auto">
	{#if exportError}
		<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 flex justify-between items-center">
			<span>{exportError}</span>
			<button type="button" class="text-xs font-semibold underline ml-2 cursor-pointer" onclick={() => (exportError = '')}>Cerrar</button>
		</div>
	{/if}

	<div class="flex items-center justify-between mb-6">
		<div>
			<p class="text-sm font-medium text-accent">Reportes</p>
			<h1 class="text-xl font-bold text-foreground">Stock actual</h1>
		</div>
		<div class="flex items-center gap-3">
			<Button variant="secondary" onclick={loadReport}>
				<RotateCw class="h-4 w-4" />
				Actualizar
			</Button>
			{#if filas.length > 0}
				<Button variant="secondary" onclick={handleExportExcel} disabled={exporting}>
					<FileSpreadsheet class="h-4 w-4 text-emerald-600" />
					{exporting ? 'Exportando...' : 'Exportar → Excel'}
				</Button>
			{/if}
		</div>
	</div>

	<div class="bg-white border border-border rounded-lg p-4 mb-6">
		<div class="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
			{#if esSuperusuario}
			<div>
				<label for="empresa-filter" class="block text-xs font-medium text-muted mb-1">Empresa</label>
				<select id="empresa-filter" bind:value={filters.id_empresa} onchange={onEmpresaChange}
					class="w-full px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary">
					<option value="">Todas</option>
					{#each empresas as empresa}
						<option value={String(empresa.id)}>{empresa.nombre}</option>
					{/each}
				</select>
			</div>
			{/if}

			<div>
				<label for="bodega-filter" class="block text-xs font-medium text-muted mb-1">Bodega</label>
				<select id="bodega-filter" bind:value={filters.id_bodega}
					class="w-full px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary">
					<option value="">Todas</option>
					{#each filteredBodegas as bodega}
						<option value={String(bodega.id_bodega)}>{bodega.nombre}</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="tipo-filter" class="block text-xs font-medium text-muted mb-1">Tipo de equipo</label>
				<select id="tipo-filter" bind:value={filters.id_tipo_equipo}
					class="w-full px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary">
					<option value="">Todos</option>
					{#each filteredTipos as tipo}
						<option value={String(tipo.id_tipo_equipo)}>{tipo.nombre}</option>
					{/each}
				</select>
			</div>

			<div class="flex gap-2">
				<Button onclick={loadReport}>
					<Filter class="h-4 w-4" />
					Generar
				</Button>
				<Button variant="secondary" onclick={resetFilters}>
					Limpiar
				</Button>
			</div>
		</div>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4">{error}</div>
	{/if}

	{#if loading}
		<div class="bg-white border border-border rounded-lg overflow-hidden">
			<div class="animate-pulse p-4 space-y-3">
				<div class="h-4 w-28 bg-surface-alt rounded"></div>
				<div class="h-10 bg-surface-alt rounded"></div>
				<div class="h-10 bg-surface-alt rounded"></div>
			</div>
		</div>
	{:else if filas.length === 0}
		<EmptyState message="No se encontraron datos para los filtros seleccionados." />
	{:else}
		<div class="bg-white border border-border rounded-lg overflow-hidden shadow-sm">
			<div class="overflow-x-auto">
				<table class="min-w-full text-sm">
					<thead class="bg-surface-alt text-left text-muted">
						<tr>
							<th class="px-4 py-3 font-medium">Tipo</th>
							<th class="px-4 py-3 font-medium">Bodega</th>
							<th class="px-4 py-3 font-medium">En bodega</th>
							<th class="px-4 py-3 font-medium">Asignado</th>
							<th class="px-4 py-3 font-medium">En revisión</th>
							<th class="px-4 py-3 font-medium">Préstamo</th>
							<th class="px-4 py-3 font-medium">Total activo</th>
							<th class="px-4 py-3 font-medium">Umbral</th>
							<th class="px-4 py-3 font-medium">Estado</th>
						</tr>
					</thead>
					<tbody>
						{#each filas as fila}
							<tr
								class="border-t border-border hover:bg-surface-alt/50"
								class:bg-red-50={fila.bajo_umbral}
								class:text-red-900={fila.bajo_umbral}
							>
								<td class="px-4 py-3">
									<div class="font-medium text-foreground">{fila.tipo_equipo}</div>
									{#if fila.unidad_medida}
										<div class="text-xs text-muted">{fila.unidad_medida}</div>
									{/if}
								</td>
								<td class="px-4 py-3 text-foreground">{fila.bodega}</td>
								<td class="px-4 py-3">{fila.en_bodega}</td>
								<td class="px-4 py-3">{fila.asignado_a_tecnico}</td>
								<td class="px-4 py-3">{fila.en_revision}</td>
								<td class="px-4 py-3">{fila.en_prestamo_externo}</td>
								<td class="px-4 py-3 font-medium text-foreground">{fila.total_activo}</td>
									<td class="px-4 py-3">{fila.umbral_minimo}</td>
								<td class="px-4 py-3">
									<Badge variant={fila.bajo_umbral ? 'danger' : 'success'}>
										{fila.bajo_umbral ? 'Bajo umbral' : 'Normal'}
									</Badge>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
