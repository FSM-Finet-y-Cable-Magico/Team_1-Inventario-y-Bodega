<script lang="ts">
	import { onMount } from 'svelte';
	import { getAuditLog } from '$lib/api/index';
	import type { LogAuditoria } from '$lib/types';
	import Pagination from '$lib/components/Pagination.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { RotateCw } from '@lucide/svelte';

	let logs = $state<LogAuditoria[]>([]);
	let loading = $state(true);
	let error = $state('');
	let page = $state(1);
	let total = $state(0);
	const limit = 30;

	let filters = $state({ accion: '', entidad_afectada: '', fecha_inicio: '', fecha_fin: '' });

	const acciones = ['LOGIN', 'LOGOUT', 'CREAR', 'ACTUALIZAR', 'DESACTIVAR', 'RESTABLECER_PASSWORD'];
	const entidades = ['usuario', 'bodega', 'transferencia_equipo', 'unidad_equipo', 'tipo_equipo', 'stock_consumible'];

	async function load(p?: number) {
		loading = true;
		error = '';
		page = p ?? page;
		try {
			const params: Record<string, string | number | undefined> = {
				pagina: page,
				limite: limit
			};
			if (filters.accion) params.accion = filters.accion;
			if (filters.entidad_afectada) params.entidad_afectada = filters.entidad_afectada;
			if (filters.fecha_inicio) params.fecha_inicio = filters.fecha_inicio;
			if (filters.fecha_fin) params.fecha_fin = filters.fecha_fin;

			const data = await getAuditLog(params);
			if (Array.isArray(data)) {
				logs = data;
				total = data.length;
			} else {
				logs = (data as { data: LogAuditoria[]; total: number }).data ?? [];
				total = (data as { total: number }).total ?? logs.length;
			}
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cargar auditoría';
		} finally {
			loading = false;
		}
	}

	onMount(() => load());

	$effect(() => { filters; load(1); });

	const accionBadge: Record<string, string> = {
		LOGIN: 'info', LOGOUT: 'default', CREAR: 'success',
		ACTUALIZAR: 'info', DESACTIVAR: 'danger', RESTABLECER_PASSWORD: 'warning'
	};
</script>

<div class="max-w-6xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-xl font-bold text-foreground">Auditoría</h1>
		<button onclick={() => load()}
			class="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-surface-alt transition-colors">
			<RotateCw class="h-4 w-4" />
			Actualizar
		</button>
	</div>

	<div class="flex flex-wrap items-center gap-3 mb-4">
		<select bind:value={filters.accion}
			class="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
			<option value="">Todas las acciones</option>
			{#each acciones as a}
				<option value={a}>{a}</option>
			{/each}
		</select>
		<select bind:value={filters.entidad_afectada}
			class="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
			<option value="">Todas las entidades</option>
			{#each entidades as e}
				<option value={e}>{e}</option>
			{/each}
		</select>
		<input type="date" bind:value={filters.fecha_inicio}
			class="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
			aria-label="Fecha inicio" />
		<input type="date" bind:value={filters.fecha_fin}
			class="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
			aria-label="Fecha fin" />
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4">{error}</div>
	{/if}

	<div class="bg-white rounded-lg border border-border overflow-hidden">
		{#if loading}
			<div class="p-8 text-center text-sm text-muted">Cargando...</div>
		{:else if logs.length === 0}
			<EmptyState message="No hay registros de auditoría con los filtros seleccionados" />
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border bg-surface/50">
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Fecha</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Usuario</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Acción</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Entidad</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">ID</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">IP</th>
						</tr>
					</thead>
					<tbody>
						{#each logs as log, i}
							<tr class="border-b border-border {i % 2 === 0 ? 'bg-white' : 'bg-surface/30'}">
								<td class="px-4 py-3 text-muted whitespace-nowrap">
									{new Date(log.fecha_hora).toLocaleString('es-CL')}
								</td>
								<td class="px-4 py-3 font-mono text-xs text-foreground">#{log.id_usuario}</td>
								<td class="px-4 py-3">
									<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
										{accionBadge[log.accion] === 'info' ? 'bg-blue-50 text-blue-700' :
										 accionBadge[log.accion] === 'success' ? 'bg-emerald-50 text-emerald-700' :
										 accionBadge[log.accion] === 'danger' ? 'bg-red-50 text-destructive' :
										 accionBadge[log.accion] === 'warning' ? 'bg-amber-50 text-amber-700' :
										 'bg-surface-alt text-foreground'}">
										{log.accion}
									</span>
								</td>
								<td class="px-4 py-3 text-muted">{log.entidad_afectada || '-'}</td>
								<td class="px-4 py-3 font-mono text-xs text-foreground">{log.id_entidad_afectada}</td>
								<td class="px-4 py-3 text-muted font-mono text-xs">{log.ip_origen || '-'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<div class="px-4 py-3 border-t border-border">
				<Pagination {page} {total} {limit} onpagechange={(p) => load(p)} />
			</div>
		{/if}
	</div>
</div>
