<script lang="ts">
	import { onMount } from 'svelte';
	import { generarReporteStock, getCatalog, getEmpresas, getWarehouses } from '$lib/api/index';
	import { hasRole } from '$lib/stores/auth';
	import type { Bodega, Empresa, ReporteStock, TipoEquipo } from '$lib/types';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Badge from '$lib/components/Badge.svelte';

	const esSuperusuario = hasRole('SUPERUSUARIO');
	let empresas = $state<Empresa[]>([]);
	let bodegas = $state<Bodega[]>([]);
	let tipos = $state<TipoEquipo[]>([]);
	let reporte = $state<ReporteStock[]>([]);
	let loading = $state(true);
	let error = $state('');
	let opcionesCargadas = $state(false);
	let filtros = $state({ id_empresa: '', id_bodega: '', id_tipo_equipo: '' });

	async function cargarOpciones() {
		try {
			const [bodegasResult, tiposResult] = await Promise.all([
				getWarehouses({ activa: true }),
				getCatalog({ activo: true })
			]);
			bodegas = bodegasResult;
			tipos = tiposResult;
			if (esSuperusuario) empresas = await getEmpresas();
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cargar los filtros del reporte';
		} finally {
			opcionesCargadas = true;
		}
	}

	async function cargarReporte() {
		loading = true;
		error = '';
		try {
			reporte = await generarReporteStock({
				id_empresa: filtros.id_empresa ? Number(filtros.id_empresa) : undefined,
				id_bodega: filtros.id_bodega ? Number(filtros.id_bodega) : undefined,
				id_tipo_equipo: filtros.id_tipo_equipo ? Number(filtros.id_tipo_equipo) : undefined
			});
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al generar el reporte';
			reporte = [];
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		await cargarOpciones();
	});

	$effect(() => {
		filtros.id_empresa;
		filtros.id_bodega;
		filtros.id_tipo_equipo;
		if (opcionesCargadas) cargarReporte();
	});
</script>

<div class="max-w-7xl mx-auto">
	<div class="mb-6">
		<h1 class="text-xl font-bold text-foreground">Reporte de stock actual</h1>
		<p class="text-sm text-muted mt-1">Existencias activas por tipo de equipo y bodega.</p>
	</div>

	<div class="bg-white rounded-lg border border-border p-4 mb-4">
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			{#if esSuperusuario}
				<label class="text-sm text-foreground">
					<span class="block mb-1 font-medium">Empresa</span>
					<select bind:value={filtros.id_empresa} class="w-full px-3 py-2 border border-border rounded-md bg-white">
						<option value="">Todas las empresas</option>
						{#each empresas as empresa}
							<option value={String(empresa.id)}>{empresa.nombre}</option>
						{/each}
					</select>
				</label>
			{/if}
			<label class="text-sm text-foreground">
				<span class="block mb-1 font-medium">Bodega</span>
				<select bind:value={filtros.id_bodega} class="w-full px-3 py-2 border border-border rounded-md bg-white">
					<option value="">Todas las bodegas</option>
					{#each bodegas as bodega}
						<option value={String(bodega.id_bodega)}>{bodega.nombre}</option>
					{/each}
				</select>
			</label>
			<label class="text-sm text-foreground">
				<span class="block mb-1 font-medium">Tipo de equipo</span>
				<select bind:value={filtros.id_tipo_equipo} class="w-full px-3 py-2 border border-border rounded-md bg-white">
					<option value="">Todos los tipos</option>
					{#each tipos as tipo}
						<option value={String(tipo.id_tipo_equipo)}>{tipo.nombre}</option>
					{/each}
				</select>
			</label>
		</div>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4" role="alert">{error}</div>
	{/if}

	<div class="bg-white rounded-lg border border-border overflow-hidden">
		{#if loading}
			<div class="p-8 text-center text-sm text-muted">Generando reporte...</div>
		{:else if reporte.length === 0}
			<EmptyState message="No se encontraron datos para los filtros seleccionados." />
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border bg-surface/50">
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase">Tipo de equipo</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase">Bodega</th>
							<th class="text-right px-4 py-3 font-medium text-muted text-xs uppercase">En bodega</th>
							<th class="text-right px-4 py-3 font-medium text-muted text-xs uppercase">Asignado a técnico</th>
							<th class="text-right px-4 py-3 font-medium text-muted text-xs uppercase">En revisión</th>
							<th class="text-right px-4 py-3 font-medium text-muted text-xs uppercase">En préstamo externo</th>
							<th class="text-right px-4 py-3 font-medium text-muted text-xs uppercase">Total activo</th>
							<th class="text-right px-4 py-3 font-medium text-muted text-xs uppercase">Umbral mínimo</th>
						</tr>
					</thead>
					<tbody>
						{#each reporte as fila}
							<tr class:border-red-200={fila.bajo_umbral} class:bg-red-50={fila.bajo_umbral} class="border-b border-border">
								<td class="px-4 py-3 font-medium">{fila.tipo_equipo}</td>
								<td class="px-4 py-3">{fila.bodega}</td>
								<td class="px-4 py-3 text-right">{fila.en_bodega}</td>
								<td class="px-4 py-3 text-right">{fila.asignado_a_tecnico}</td>
								<td class="px-4 py-3 text-right">{fila.en_revision}</td>
								<td class="px-4 py-3 text-right">{fila.en_prestamo_externo}</td>
								<td class="px-4 py-3 text-right font-semibold">
									{fila.total_activo}
									{#if fila.bajo_umbral}<Badge variant="danger">Bajo umbral</Badge>{/if}
								</td>
								<td class="px-4 py-3 text-right">{fila.umbral_minimo}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>
