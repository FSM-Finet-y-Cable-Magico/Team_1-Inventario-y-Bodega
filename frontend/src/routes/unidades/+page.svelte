<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getUnits, getCatalog, createUnit } from '$lib/api/index';
	import type { UnidadEquipo, TipoEquipo } from '$lib/types';
	import Button from '$lib/components/Button.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import SearchInput from '$lib/components/SearchInput.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { Plus, RotateCw } from '@lucide/svelte';

	let units = $state<UnidadEquipo[]>([]);
	let tipos = $state<TipoEquipo[]>([]);
	let loading = $state(true);
	let error = $state('');
	let search = $state('');
	let estadoFilter = $state('');

	let showCreate = $state(false);
	let createForm = $state({
		id_tipo_equipo: 0, numero_serie: '', modelo: '', estado: 'En bodega' as string,
		fecha_adquisicion: '', fecha_venc_garantia: '', id_bodega_actual: 0
	});
	let createError = $state('');
	let creating = $state(false);

	const estados = [
		'En bodega', 'Asignado a tecnico', 'Instalado en cliente',
		'En revision', 'En prestamo externo', 'Dado de baja'
	];

	const estadoBadge: Record<string, string> = {
		'En bodega': 'default',
		'Asignado a tecnico': 'info',
		'Instalado en cliente': 'success',
		'En revision': 'warning',
		'En prestamo externo': 'info',
		'Dado de baja': 'danger'
	};

	async function load() {
		loading = true;
		error = '';
		try {
			const [unitsData, tiposData] = await Promise.all([
				getUnits({ estado: estadoFilter || undefined, buscar: search || undefined }),
				getCatalog({ activo: true })
			]);
			units = unitsData;
			tipos = tiposData;
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cargar unidades';
		} finally {
			loading = false;
		}
	}

	onMount(load);

	$effect(() => { search; estadoFilter; load(); });

	async function handleCreate() {
		createError = '';
		creating = true;
		try {
			await createUnit(createForm as unknown as Record<string, unknown>);
			showCreate = false;
			createForm = { id_tipo_equipo: 0, numero_serie: '', modelo: '', estado: 'En bodega',
				fecha_adquisicion: '', fecha_venc_garantia: '', id_bodega_actual: 0 };
			await load();
		} catch (err: unknown) {
			createError = err instanceof Error ? err.message : 'Error al registrar unidad';
		} finally {
			creating = false;
		}
	}
</script>

<div class="max-w-6xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-xl font-bold text-foreground">Unidades de Equipo</h1>
		<div class="flex items-center gap-3">
			<Button variant="secondary" onclick={load}>
				<RotateCw class="h-4 w-4" />
				Actualizar
			</Button>
			<Button onclick={() => (showCreate = true)}>
				<Plus class="h-4 w-4" />
				Registrar unidad
			</Button>
		</div>
	</div>

	<div class="flex items-center gap-4 mb-4">
		<div class="flex-1 max-w-xs">
			<SearchInput bind:value={search} placeholder="Buscar por serie o modelo..." />
		</div>
		<select bind:value={estadoFilter}
			class="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
			<option value="">Todos los estados</option>
			{#each estados as est}
				<option value={est}>{est}</option>
			{/each}
		</select>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4">{error}</div>
	{/if}

	<div class="bg-white rounded-lg border border-border overflow-hidden">
		{#if loading}
			<div class="p-8 text-center text-sm text-muted">Cargando...</div>
		{:else if units.length === 0}
			<EmptyState message="No hay unidades registradas" action={() => (showCreate = true)} actionlabel="Registrar unidad" />
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border bg-surface/50">
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Serie</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Tipo</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Modelo</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Estado</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Garantía</th>
							<th class="text-right px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#each units as unit, i}
							<tr class="border-b border-border transition-colors hover:bg-surface-alt/50 {i % 2 === 0 ? 'bg-white' : 'bg-surface/30'}">
								<td class="px-4 py-3 font-mono text-sm font-medium text-foreground">{unit.numero_serie}</td>
								<td class="px-4 py-3 text-foreground">{unit.tipo_equipo?.nombre || '-'}</td>
								<td class="px-4 py-3 text-muted">{unit.modelo || '-'}</td>
								<td class="px-4 py-3">
									<Badge variant={estadoBadge[unit.estado] as 'default' | 'info' | 'success' | 'warning' | 'danger'}>
										{unit.estado}
									</Badge>
								</td>
								<td class="px-4 py-3">
									{#if unit.fecha_venc_garantia}
										<span class="text-xs text-muted">{unit.fecha_venc_garantia}</span>
									{:else}
										<span class="text-xs text-muted">Sin garantía</span>
									{/if}
								</td>
								<td class="px-4 py-3 text-right">
									<Button variant="ghost" size="sm" onclick={() => goto(`/unidades/${unit.id_unidad}`)}>
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

<Modal title="Registrar unidad" open={showCreate} onclose={() => (showCreate = false)}>
	<form onsubmit={(e: Event) => { e.preventDefault(); handleCreate(); }} class="space-y-4">
		{#if createError}
			<div class="bg-red-50 border border-red-200 text-destructive text-sm rounded-md px-3 py-2">{createError}</div>
		{/if}

		<FormField label="Tipo de equipo" name="tipo" required>
			<select id="tipo" required bind:value={createForm.id_tipo_equipo}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
				<option value={0} disabled>Seleccionar tipo</option>
				{#each tipos as t}
					<option value={t.id_tipo_equipo}>{t.nombre} {t.categoria ? `(${t.categoria})` : ''}</option>
				{/each}
			</select>
		</FormField>

		<FormField label="Número de serie" name="serie" required
			helper="4-30 caracteres, mayúsculas, números y guiones">
			<input id="serie" type="text" required bind:value={createForm.numero_serie}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
				placeholder="Ej: ONT-2024-0001" pattern="^[A-Z0-9-]{4,30}$"
				title="4-30 caracteres, solo mayúsculas, números y guiones" />
		</FormField>

		<FormField label="Modelo" name="mod">
			<input id="mod" type="text" bind:value={createForm.modelo}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				placeholder="Ej: HG8245H" />
		</FormField>

		<FormField label="Estado inicial" name="est">
			<select id="est" bind:value={createForm.estado}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
				{#each estados as est}
					<option value={est}>{est}</option>
				{/each}
			</select>
		</FormField>

		<div class="grid grid-cols-2 gap-4">
			<FormField label="Fecha adquisición" name="fec_adq">
				<input id="fec_adq" type="date" bind:value={createForm.fecha_adquisicion}
					class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
			</FormField>
			<FormField label="Venc. garantía" name="fec_gar">
				<input id="fec_gar" type="date" bind:value={createForm.fecha_venc_garantia}
					class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
			</FormField>
		</div>

		<div class="flex justify-end gap-3 pt-2">
			<Button variant="secondary" onclick={() => (showCreate = false)} type="button">Cancelar</Button>
			<Button type="submit" loading={creating}>Registrar unidad</Button>
		</div>
	</form>
</Modal>
