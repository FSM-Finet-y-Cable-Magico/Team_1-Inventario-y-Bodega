<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { abrirTomaInventario, getWarehouses, listarTomasInventario } from '$lib/api/index';
	import type { Bodega, TomaInventarioResumen } from '$lib/types';
	import Badge from '$lib/components/Badge.svelte';
	import Button from '$lib/components/Button.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { Plus, RotateCw } from '@lucide/svelte';

	// CU-97: tomas de inventario físico de las bodegas de la empresa
	let tomas = $state<TomaInventarioResumen[]>([]);
	let bodegas = $state<Bodega[]>([]);
	let loading = $state(true);
	let error = $state('');

	let showAbrir = $state(false);
	let idBodega = $state(0);
	let abrirError = $state('');
	let abriendo = $state(false);

	const estadoBadge: Record<string, 'warning' | 'success' | 'default'> = {
		ABIERTA: 'warning',
		CONFIRMADA: 'success',
		CANCELADA: 'default'
	};
	const estadoLabel: Record<string, string> = {
		ABIERTA: 'Abierta',
		CONFIRMADA: 'Confirmada',
		CANCELADA: 'Cancelada'
	};

	function fmtFecha(fecha: string | null): string {
		return fecha ? new Date(fecha).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }) : '—';
	}

	async function load() {
		loading = true;
		error = '';
		try {
			[tomas, bodegas] = await Promise.all([listarTomasInventario(), getWarehouses({ activa: true })]);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cargar las tomas de inventario';
		} finally {
			loading = false;
		}
	}

	onMount(load);

	async function abrir() {
		abrirError = '';
		if (!idBodega) {
			abrirError = 'Seleccione una bodega.';
			return;
		}
		abriendo = true;
		try {
			const toma = await abrirTomaInventario(idBodega);
			showAbrir = false;
			goto(`/tomas-inventario/${toma.id_toma}`);
		} catch (err: unknown) {
			abrirError = err instanceof Error ? err.message : 'Error al abrir la toma';
		} finally {
			abriendo = false;
		}
	}
</script>

<div class="max-w-6xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-xl font-bold text-foreground">Toma de inventario</h1>
		<div class="flex items-center gap-3">
			<Button variant="secondary" onclick={load}>
				<RotateCw class="h-4 w-4" />
				Actualizar
			</Button>
			<Button onclick={() => { idBodega = 0; abrirError = ''; showAbrir = true; }}>
				<Plus class="h-4 w-4" />
				Nueva toma
			</Button>
		</div>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4">{error}</div>
	{/if}

	<div class="bg-white rounded-lg border border-border">
		{#if loading}
			<div class="p-6 animate-pulse space-y-4">
				<div class="h-4 w-full bg-surface-alt rounded"></div>
				<div class="h-4 w-full bg-surface-alt rounded"></div>
			</div>
		{:else if tomas.length === 0}
			<EmptyState message="Aún no hay tomas de inventario" />
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border text-left text-muted text-xs uppercase">
							<th class="px-4 py-3 font-medium">Toma</th>
							<th class="px-4 py-3 font-medium">Bodega</th>
							<th class="px-4 py-3 font-medium">Estado</th>
							<th class="px-4 py-3 font-medium">Apertura</th>
							<th class="px-4 py-3 font-medium">Cierre</th>
						</tr>
					</thead>
					<tbody>
						{#each tomas as t}
							<tr class="border-b border-border last:border-0 cursor-pointer hover:bg-surface-alt"
								onclick={() => goto(`/tomas-inventario/${t.id_toma}`)}>
								<td class="px-4 py-3 font-mono">#{t.id_toma}</td>
								<td class="px-4 py-3">{t.bodega_nombre}</td>
								<td class="px-4 py-3"><Badge variant={estadoBadge[t.estado]}>{estadoLabel[t.estado]}</Badge></td>
								<td class="px-4 py-3">{fmtFecha(t.fecha_apertura)}</td>
								<td class="px-4 py-3">{fmtFecha(t.fecha_cierre)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<Modal open={showAbrir} title="Nueva toma de inventario" onclose={() => (showAbrir = false)}>
	<div class="space-y-4">
		{#if abrirError}
			<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-3 text-sm">{abrirError}</div>
		{/if}
		<p class="text-sm text-muted">El sistema guarda lo que debería haber en la bodega en este momento, para compararlo con lo que se cuente.</p>
		<FormField label="Bodega" required>
			<select bind:value={idBodega} aria-label="Bodega"
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary">
				<option value={0}>Seleccione una bodega</option>
				{#each bodegas as b}
					<option value={b.id_bodega}>{b.nombre}</option>
				{/each}
			</select>
		</FormField>
		<div class="flex justify-end gap-2">
			<Button variant="secondary" onclick={() => (showAbrir = false)}>Cancelar</Button>
			<Button loading={abriendo} onclick={abrir}>Abrir toma</Button>
		</div>
	</div>
</Modal>
