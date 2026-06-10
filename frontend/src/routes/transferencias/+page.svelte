<script lang="ts">
	import { onMount } from 'svelte';
	import { getTransfers, createTransfer, approveTransfer, rejectTransfer, getUnits, getWarehouses } from '$lib/api/index';
	import type { Transferencia, Bodega, UnidadEquipo } from '$lib/types';
	import Button from '$lib/components/Button.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { userRoles } from '$lib/stores/auth';
	import { Plus, RotateCw, CheckCircle, XCircle } from '@lucide/svelte';

	let transfers = $state<Transferencia[]>([]);
	let warehouses = $state<Bodega[]>([]);
	let units = $state<UnidadEquipo[]>([]);
	let loading = $state(true);
	let error = $state('');
	let roles: string[] = [];
	userRoles.subscribe((r) => (roles = r));

	let showCreate = $state(false);
	let createForm = $state({ id_empresa_destino: 2, id_bodega_origen: 0, id_bodega_destino: 0, ids_unidades: [] as number[], observaciones: '' });
	let createError = $state('');
	let creating = $state(false);

	let rejectForm = $state({ id: 0, motivo: '' });
	let showReject = $state(false);
	let rejectError = $state('');
	let rejecting = $state(false);

	const estadoBadge: Record<string, string> = {
		'TRANSFERENCIA_PENDIENTE': 'warning',
		'TRANSFERENCIA_APROBADA': 'success',
		'TRANSFERENCIA_RECHAZADA': 'danger'
	};

	async function load() {
		loading = true;
		error = '';
		try {
			const [transfersData, whData, unitsData] = await Promise.all([
				getTransfers(),
				getWarehouses({ activa: true }),
				getUnits()
			]);
			transfers = transfersData;
			warehouses = whData;
			units = unitsData.filter((u: UnidadEquipo) => u.estado === 'En bodega');
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cargar transferencias';
		} finally {
			loading = false;
		}
	}

	onMount(load);

	async function handleCreate() {
		createError = '';
		creating = true;
		try {
			await createTransfer(createForm as unknown as Record<string, unknown>);
			showCreate = false;
			createForm = { id_empresa_destino: 2, id_bodega_origen: 0, id_bodega_destino: 0, ids_unidades: [], observaciones: '' };
			await load();
		} catch (err: unknown) {
			createError = err instanceof Error ? err.message : 'Error al crear transferencia';
		} finally {
			creating = false;
		}
	}

	async function handleApprove(id: number) {
		try {
			await approveTransfer(id);
			await load();
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al aprobar transferencia';
		}
	}

	async function handleReject() {
		rejectError = '';
		rejecting = true;
		try {
			await rejectTransfer(rejectForm.id, { motivo: rejectForm.motivo });
			showReject = false;
			rejectForm = { id: 0, motivo: '' };
			await load();
		} catch (err: unknown) {
			rejectError = err instanceof Error ? err.message : 'Error al rechazar transferencia';
		} finally {
			rejecting = false;
		}
	}
</script>

<div class="max-w-6xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-xl font-bold text-foreground">Transferencias</h1>
		<div class="flex items-center gap-3">
			<Button variant="secondary" onclick={load}>
				<RotateCw class="h-4 w-4" />
				Actualizar
			</Button>
			<Button onclick={() => (showCreate = true)}>
				<Plus class="h-4 w-4" />
				Nueva transferencia
			</Button>
		</div>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4">{error}</div>
	{/if}

	<div class="bg-white rounded-lg border border-border overflow-hidden">
		{#if loading}
			<div class="p-8 text-center text-sm text-muted">Cargando...</div>
		{:else if transfers.length === 0}
			<EmptyState message="No hay transferencias registradas" action={() => (showCreate = true)} actionlabel="Nueva transferencia" />
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border bg-surface/50">
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">ID</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Empresa origen</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Empresa destino</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Fecha</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Observaciones</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#each transfers as tr, i}
							<tr class="border-b border-border {i % 2 === 0 ? 'bg-white' : 'bg-surface/30'}">
								<td class="px-4 py-3 font-mono text-foreground">#{tr.id_transferencia}</td>
								<td class="px-4 py-3 text-foreground">Empresa {tr.id_empresa_origen}</td>
								<td class="px-4 py-3 text-foreground">Empresa {tr.id_empresa_destino}</td>
								<td class="px-4 py-3 text-muted">{tr.fecha_transferencia ? new Date(tr.fecha_transferencia).toLocaleDateString('es-CL') : '-'}</td>
								<td class="px-4 py-3 text-muted max-w-[200px] truncate">{tr.observaciones || '-'}</td>
								<td class="px-4 py-3">
									<div class="flex items-center gap-1">
										{#if roles.includes('SUPERUSUARIO')}
											<button onclick={() => handleApprove(tr.id_transferencia)}
												class="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
												aria-label="Aprobar transferencia">
												<CheckCircle class="h-4 w-4" />
											</button>
											<button onclick={() => { rejectForm.id = tr.id_transferencia; showReject = true; }}
												class="p-1.5 rounded-md text-destructive hover:bg-red-50 transition-colors"
												aria-label="Rechazar transferencia">
												<XCircle class="h-4 w-4" />
											</button>
										{/if}
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

<Modal title="Nueva transferencia" open={showCreate} onclose={() => (showCreate = false)}>
	<form onsubmit={(e: Event) => { e.preventDefault(); handleCreate(); }} class="space-y-4">
		{#if createError}
			<div class="bg-red-50 border border-red-200 text-destructive text-sm rounded-md px-3 py-2">{createError}</div>
		{/if}

		<FormField label="Empresa destino" name="emp_dest" required>
			<select id="emp_dest" required bind:value={createForm.id_empresa_destino}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
				<option value={1}>Finet (ID: 1)</option>
				<option value={2}>Cable Mágico (ID: 2)</option>
			</select>
		</FormField>

		<div class="grid grid-cols-2 gap-4">
			<FormField label="Bodega origen" name="bod_ori" required>
				<select id="bod_ori" required bind:value={createForm.id_bodega_origen}
					class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
					<option value={0} disabled>Seleccionar...</option>
					{#each warehouses as wh}
						<option value={wh.id_bodega}>{wh.nombre}</option>
					{/each}
				</select>
			</FormField>
			<FormField label="Bodega destino" name="bod_des" required>
				<select id="bod_des" required bind:value={createForm.id_bodega_destino}
					class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
					<option value={0} disabled>Seleccionar...</option>
					{#each warehouses as wh}
						<option value={wh.id_bodega}>{wh.nombre}</option>
					{/each}
				</select>
			</FormField>
		</div>

		<FormField label="Unidades a transferir" name="unds" required>
			<div class="max-h-48 overflow-y-auto space-y-1 border border-border rounded-md p-2">
				{#each units as u}
					<label class="flex items-center gap-2 text-sm cursor-pointer px-2 py-1 hover:bg-surface-alt rounded">
						<input type="checkbox" value={u.id_unidad}
							checked={createForm.ids_unidades.includes(u.id_unidad)}
							onchange={(e) => {
								const checked = (e.target as HTMLInputElement).checked;
								createForm.ids_unidades = checked
									? [...createForm.ids_unidades, u.id_unidad]
									: createForm.ids_unidades.filter((id) => id !== u.id_unidad);
							}}
							class="rounded border-border" />
						<span class="font-mono text-xs">{u.numero_serie}</span>
						<span class="text-muted text-xs">{u.tipo_equipo?.nombre || ''}</span>
					</label>
				{/each}
				{#if units.length === 0}
					<p class="text-xs text-muted text-center py-2">No hay unidades disponibles en bodega</p>
				{/if}
			</div>
		</FormField>

		<FormField label="Observaciones" name="obs">
			<textarea id="obs" bind:value={createForm.observaciones}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				rows="2" maxlength={200}></textarea>
		</FormField>

		<div class="flex justify-end gap-3 pt-2">
			<Button variant="secondary" onclick={() => (showCreate = false)} type="button">Cancelar</Button>
			<Button type="submit" loading={creating}>Crear transferencia</Button>
		</div>
	</form>
</Modal>

<Modal title="Rechazar transferencia" open={showReject} onclose={() => (showReject = false)}>
	<form onsubmit={(e: Event) => { e.preventDefault(); handleReject(); }} class="space-y-4">
		{#if rejectError}
			<div class="bg-red-50 border border-red-200 text-destructive text-sm rounded-md px-3 py-2">{rejectError}</div>
		{/if}
		<FormField label="Motivo del rechazo" name="motivo" required helper="Máximo 200 caracteres">
			<textarea id="motivo" required bind:value={rejectForm.motivo}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				rows="3" maxlength={200}></textarea>
		</FormField>
		<div class="flex justify-end gap-3 pt-2">
			<Button variant="secondary" onclick={() => (showReject = false)} type="button">Cancelar</Button>
			<Button type="submit" variant="destructive" loading={rejecting}>
				<XCircle class="h-4 w-4" />
				Rechazar transferencia
			</Button>
		</div>
	</form>
</Modal>
