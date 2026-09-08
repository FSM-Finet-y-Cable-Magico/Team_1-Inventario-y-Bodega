<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getUnidadesEnRevision } from '$lib/api/index';
	import type { EquipoEnRevision } from '$lib/types';
	import Button from '$lib/components/Button.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { ArrowLeft, RotateCw, ArrowUpDown } from '@lucide/svelte';

	let equipos = $state<EquipoEnRevision[]>([]);
	let loading = $state(true);
	let error = $state('');

	type Columna = 'numero_serie' | 'tipo_equipo' | 'empresa' | 'bodega' | 'fecha_ingreso_revision' | 'dias_en_revision' | 'diagnostico_tecnico';
	const columnas: { key: Columna; label: string }[] = [
		{ key: 'numero_serie', label: 'NS' },
		{ key: 'tipo_equipo', label: 'Tipo de equipo' },
		{ key: 'empresa', label: 'Empresa' },
		{ key: 'bodega', label: 'Bodega' },
		{ key: 'fecha_ingreso_revision', label: 'Ingreso a revisión' },
		{ key: 'dias_en_revision', label: 'Días transcurridos' },
		{ key: 'diagnostico_tecnico', label: 'Diagnóstico' }
	];
	let ordenColumna = $state<Columna>('dias_en_revision');
	let ordenAsc = $state(false);

	async function load() {
		loading = true;
		error = '';
		try {
			equipos = await getUnidadesEnRevision();
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cargar equipos en revisión';
		} finally {
			loading = false;
		}
	}

	onMount(load);

	// CU-77: fecha DD/MM/YYYY HH:MM:SS, zona America/Santiago
	function fmtFechaHora(fecha: string | null): string {
		if (!fecha) return '-';
		return new Date(fecha).toLocaleString('en-GB', {
			day: '2-digit', month: '2-digit', year: 'numeric',
			hour: '2-digit', minute: '2-digit', second: '2-digit',
			hour12: false, timeZone: 'America/Santiago'
		}).replace(',', '');
	}

	function valorColumna(e: EquipoEnRevision, col: Columna): string | number {
		switch (col) {
			case 'numero_serie': return e.numero_serie;
			case 'tipo_equipo': return e.tipo_equipo?.nombre ?? '';
			case 'empresa': return e.empresa ?? '';
			case 'bodega': return e.bodega ?? '';
			case 'fecha_ingreso_revision': return e.fecha_ingreso_revision ?? '';
			case 'dias_en_revision': return e.dias_en_revision ?? -1;
			case 'diagnostico_tecnico': return e.diagnostico_tecnico ?? '';
		}
	}

	function ordenarPor(col: Columna) {
		if (ordenColumna === col) {
			ordenAsc = !ordenAsc;
		} else {
			ordenColumna = col;
			ordenAsc = true;
		}
	}

	const equiposOrdenados = $derived(
		[...equipos].sort((a, b) => {
			const va = valorColumna(a, ordenColumna);
			const vb = valorColumna(b, ordenColumna);
			const cmp = typeof va === 'number' && typeof vb === 'number'
				? va - vb
				: String(va).localeCompare(String(vb));
			return ordenAsc ? cmp : -cmp;
		})
	);
</script>

<div class="max-w-6xl mx-auto">
	<button onclick={() => goto('/unidades')}
		class="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-4">
		<ArrowLeft class="h-4 w-4" />
		Volver a unidades
	</button>

	<div class="flex items-center justify-between mb-6">
		<h1 class="text-xl font-bold text-foreground">Equipos en revisión</h1>
		<Button variant="secondary" onclick={load}>
			<RotateCw class="h-4 w-4" />
			Actualizar
		</Button>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4">{error}</div>
	{/if}

	<div class="bg-white rounded-lg border border-border overflow-hidden">
		{#if loading}
			<div class="p-8 text-center text-sm text-muted">Cargando...</div>
		{:else if equipos.length === 0}
			<EmptyState message="No hay equipos en revisión actualmente." />
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border bg-surface/50">
							{#each columnas as col}
								<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">
									<button onclick={() => ordenarPor(col.key)}
										class="flex items-center gap-1 hover:text-foreground transition-colors">
										{col.label}
										<ArrowUpDown class="h-3 w-3" />
									</button>
								</th>
							{/each}
							<th class="text-right px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#each equiposOrdenados as equipo, i (equipo.id_unidad)}
							<tr class="border-b border-border transition-colors hover:bg-surface-alt/50 {(equipo.dias_en_revision ?? 0) > 30 ? 'bg-amber-50' : (i % 2 === 0 ? 'bg-white' : 'bg-surface/30')}">
								<td class="px-4 py-3 font-mono text-sm font-medium text-foreground">{equipo.numero_serie}</td>
								<td class="px-4 py-3 text-foreground">{equipo.tipo_equipo?.nombre || '-'}</td>
								<td class="px-4 py-3 text-muted">{equipo.empresa || '-'}</td>
								<td class="px-4 py-3 text-muted">{equipo.bodega || '-'}</td>
								<td class="px-4 py-3 text-muted">{fmtFechaHora(equipo.fecha_ingreso_revision)}</td>
								<td class="px-4 py-3 text-foreground">{equipo.dias_en_revision ?? '-'}</td>
								<td class="px-4 py-3 text-muted">{equipo.diagnostico_tecnico || '-'}</td>
								<td class="px-4 py-3 text-right">
									<Button variant="ghost" size="sm" onclick={() => goto(`/unidades/${equipo.id_unidad}`)}>
										Ver detalle
									</Button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>
