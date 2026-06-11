<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { getWarehouse, getWarehouseStock, updateWarehouse, setStockThreshold, getCatalog, getUsers } from '$lib/api/index';
	import type { Bodega, TipoEquipo, Usuario } from '$lib/types';
	import Button from '$lib/components/Button.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import DataTable from '$lib/components/DataTable.svelte';
	import { ArrowLeft, Save, Settings } from '@lucide/svelte';

	let wh = $state<Bodega | null>(null);
	// CU-45: cada fila trae cantidad, desglose por estado (serializados)
	// o unidad de medida (consumibles)
	let stock = $state<any[]>([]);
	let tipos = $state<TipoEquipo[]>([]);
	let usuarios = $state<Usuario[]>([]);
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');
	let success = $state('');

	// CU-42: nombre, descripción de ubicación y responsable
	let editForm = $state({ nombre: '', direccion: '', id_usuario_responsable: 0 });
	let showEdit = $state(false);

	let showThreshold = $state(false);
	let thresholdForm = $state({ id_tipo_equipo: 0, umbral: 0 });
	let thresholdError = $state('');
	let thresholdSaving = $state(false);

	async function load() {
		loading = true;
		error = '';
		const id = Number($page.params.id);
		try {
			const [whData, stockData, tiposData] = await Promise.all([
				getWarehouse(id),
				getWarehouseStock(id),
				getCatalog({ activo: true })
			]);
			wh = whData;
			stock = stockData;
			tipos = tiposData;
			if (wh) {
				editForm.nombre = wh.nombre;
				editForm.direccion = wh.direccion ?? '';
				editForm.id_usuario_responsable = wh.id_usuario_responsable ?? 0;
			}
			try { usuarios = await getUsers({ activo: true }); } catch { /* sin permiso */ }
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cargar bodega';
		} finally {
			loading = false;
		}
	}

	onMount(load);

	async function handleSave() {
		saving = true;
		error = '';
		success = '';
		try {
			await updateWarehouse(Number($page.params.id), {
				nombre: editForm.nombre,
				direccion: editForm.direccion,
				...(editForm.id_usuario_responsable ? { id_usuario_responsable: editForm.id_usuario_responsable } : {})
			});
			success = 'Bodega actualizada';
			showEdit = false;
			await load();
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al actualizar';
		} finally {
			saving = false;
		}
	}

	async function handleThreshold() {
		thresholdError = '';
		thresholdSaving = true;
		try {
			await setStockThreshold(Number($page.params.id), thresholdForm);
			success = 'Umbral configurado';
			showThreshold = false;
			thresholdForm = { id_tipo_equipo: 0, umbral: 0 };
			await load();
		} catch (err: unknown) {
			thresholdError = err instanceof Error ? err.message : 'Error al configurar umbral';
		} finally {
			thresholdSaving = false;
		}
	}

	const stockColumns = [
		{ key: 'tipo_equipo_nombre', label: 'Tipo de equipo' },
		{ key: 'cantidad_disponible', label: 'Cantidad disponible' },
		{ key: 'umbral_minimo', label: 'Umbral mínimo' },
		{ key: 'alerta', label: 'Estado' }
	];
</script>

<div class="max-w-6xl mx-auto">
	<button onclick={() => goto('/bodegas')}
		class="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-4">
		<ArrowLeft class="h-4 w-4" />
		Volver a bodegas
	</button>

	{#if loading}
		<div class="bg-white rounded-lg border border-border p-6 animate-pulse space-y-4">
			<div class="h-6 w-48 bg-surface-alt rounded"></div>
			<div class="h-4 w-full bg-surface-alt rounded"></div>
		</div>
	{:else if !wh}
		<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm">Bodega no encontrada</div>
	{:else}
		{#if error}
			<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4">{error}</div>
		{/if}
		{#if success}
			<div class="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md p-4 text-sm mb-4">{success}</div>
		{/if}

		<div class="bg-white rounded-lg border border-border p-6 mb-6">
			<div class="flex items-center justify-between mb-4">
				<div>
					<h1 class="text-lg font-semibold text-foreground">{wh.nombre}</h1>
					<p class="text-sm text-muted">{wh.direccion || 'Sin dirección'}</p>
				</div>
				<div class="flex items-center gap-2">
					<Badge variant={wh.activa ? 'success' : 'danger'}>{wh.activa ? 'Activa' : 'Inactiva'}</Badge>
					<Button variant="secondary" size="sm" onclick={() => (showEdit = true)}>
						<Save class="h-4 w-4" />
						Editar
					</Button>
				</div>
			</div>
		</div>

		<div class="bg-white rounded-lg border border-border">
			<div class="px-6 py-4 border-b border-border flex items-center justify-between">
				<h2 class="text-base font-semibold text-foreground">Stock</h2>
				<Button variant="secondary" size="sm" onclick={() => (showThreshold = true)}>
					<Settings class="h-4 w-4" />
					Configurar umbral
				</Button>
			</div>

			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border bg-surface/50">
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Tipo de equipo</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Cantidad disponible</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Desglose por estado</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Umbral mínimo</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Estado</th>
						</tr>
					</thead>
					<tbody>
						{#each stock as item, i}
							<tr class="border-b border-border {i % 2 === 0 ? 'bg-white' : 'bg-surface/30'}">
								<td class="px-4 py-3 text-foreground">{item.tipo_equipo?.nombre || `ID: ${item.id_tipo_equipo}`}</td>
								<!-- CU-45: los consumibles se expresan en su unidad de medida -->
								<td class="px-4 py-3 font-medium">
									{item.cantidad_disponible}{!item.requiere_serie && item.unidad_medida ? ` ${item.unidad_medida}` : ''}
								</td>
								<td class="px-4 py-3 text-xs text-muted">
									{#if item.requiere_serie && item.desglose_estados}
										<!-- CU-45: cantidades por estado; los dados de baja van en reportes históricos -->
										En bodega: {item.desglose_estados['En bodega'] ?? 0} ·
										Asignado: {item.desglose_estados['Asignado a técnico'] ?? 0} ·
										En revisión: {item.desglose_estados['En revisión'] ?? 0} ·
										Préstamo: {item.desglose_estados['En préstamo externo'] ?? 0}
									{:else}
										Consumible
									{/if}
								</td>
								<td class="px-4 py-3">{item.umbral_minimo ?? 'No configurado'}</td>
								<td class="px-4 py-3">
									{#if item.umbral_minimo !== null && item.cantidad_disponible <= item.umbral_minimo}
										<Badge variant="danger">Stock bajo</Badge>
									{:else}
										<Badge variant="success">Normal</Badge>
									{/if}
								</td>
							</tr>
						{/each}
						{#if stock.length === 0}
							<tr>
								<td colspan="5" class="px-4 py-8 text-center text-sm text-muted">
									Sin stock registrado en esta bodega
								</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<Modal title="Editar bodega" open={showEdit} onclose={() => (showEdit = false)}>
	<form onsubmit={(e: Event) => { e.preventDefault(); handleSave(); }} class="space-y-4">
		<FormField label="Nombre" name="edit_nom" required>
			<input id="edit_nom" type="text" required bind:value={editForm.nombre}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
		</FormField>
		<FormField label="Descripción de ubicación" name="edit_dir" helper="Máximo 200 caracteres">
			<input id="edit_dir" type="text" bind:value={editForm.direccion} maxlength={200}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
		</FormField>
		<!-- CU-42: responsable editable -->
		<FormField label="Responsable" name="edit_resp">
			<select id="edit_resp" bind:value={editForm.id_usuario_responsable}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
				<option value={0} disabled>Seleccionar responsable...</option>
				{#each usuarios as u}
					<option value={u.id_usuario}>{u.nombre_completo}</option>
				{/each}
			</select>
		</FormField>
		<div class="flex justify-end gap-3 pt-2">
			<Button variant="secondary" onclick={() => (showEdit = false)} type="button">Cancelar</Button>
			<Button type="submit" loading={saving}>
				<Save class="h-4 w-4" />
				Guardar
			</Button>
		</div>
	</form>
</Modal>

<Modal title="Configurar umbral de stock" open={showThreshold} onclose={() => (showThreshold = false)}>
	<form onsubmit={(e: Event) => { e.preventDefault(); handleThreshold(); }} class="space-y-4">
		{#if thresholdError}
			<div class="bg-red-50 border border-red-200 text-destructive text-sm rounded-md px-3 py-2">{thresholdError}</div>
		{/if}
		<FormField label="Tipo de equipo" name="te" required>
			<select id="te" required bind:value={thresholdForm.id_tipo_equipo}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
				<option value={0} disabled>Seleccionar...</option>
				{#each tipos.filter((t) => t.requiereSerialNumber === false) as t}
					<option value={t.id_tipo_equipo}>{t.nombre}</option>
				{/each}
			</select>
		</FormField>
		<FormField label="Umbral mínimo" name="umb" required helper="Valor entre 0 y 9999">
			<input id="umb" type="number" required bind:value={thresholdForm.umbral}
				min={0} max={9999}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
		</FormField>
		<div class="flex justify-end gap-3 pt-2">
			<Button variant="secondary" onclick={() => (showThreshold = false)} type="button">Cancelar</Button>
			<Button type="submit" loading={thresholdSaving}>Configurar</Button>
		</div>
	</form>
</Modal>
