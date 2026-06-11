<script lang="ts">
	import { onMount } from 'svelte';
	import { getTransfers, getTransferDetail, createTransfer, approveTransfer, rejectTransfer, getUnits, getWarehouses, getEmpresas } from '$lib/api/index';
	import type { Transferencia, TransferenciaDetalle, Bodega, UnidadEquipo, Empresa } from '$lib/types';
	import Button from '$lib/components/Button.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { userRoles, currentUser } from '$lib/stores/auth';
	import { Plus, RotateCw, CheckCircle, XCircle, Eye } from '@lucide/svelte';

	let transfers = $state<Transferencia[]>([]);
	let warehouses = $state<Bodega[]>([]);
	let units = $state<UnidadEquipo[]>([]);
	let empresas = $state<Empresa[]>([]);
	let loading = $state(true);
	let error = $state('');
	let roles: string[] = [];
	userRoles.subscribe((r) => (roles = r));

	// CU-23: filtros por estado, rango de fechas o empresa
	let filters = $state({ estado: '', id_empresa: '', fecha_inicio: '', fecha_fin: '' });

	let showCreate = $state(false);
	let createForm = $state({ id_empresa_destino: 0, id_bodega_origen: 0, id_bodega_destino: 0, ids_unidades: [] as number[], observaciones: '' });
	let createError = $state('');
	let creating = $state(false);

	let rejectForm = $state({ id: 0, motivo: '' });
	let showReject = $state(false);
	let rejectError = $state('');
	let rejecting = $state(false);

	// CU-21: detalle completo al seleccionar una transferencia
	let detalle = $state<TransferenciaDetalle | null>(null);
	let showDetalle = $state(false);
	let loadingDetalle = $state(false);

	const estadoBadge: Record<string, string> = {
		'TRANSFERENCIA_PENDIENTE': 'warning',
		'TRANSFERENCIA_APROBADA': 'success',
		'TRANSFERENCIA_RECHAZADA': 'danger'
	};
	// CU-23: estado legible (Pendiente/Aprobada/Rechazada)
	const estadoLabel: Record<string, string> = {
		'TRANSFERENCIA_PENDIENTE': 'Pendiente',
		'TRANSFERENCIA_APROBADA': 'Aprobada',
		'TRANSFERENCIA_RECHAZADA': 'Rechazada'
	};

	function fmtFecha(fecha: string | null): string {
		if (!fecha) return '-';
		return new Date(fecha).toLocaleDateString('en-GB', {
			day: '2-digit', month: '2-digit', year: 'numeric',
			timeZone: 'America/Santiago'
		});
	}

	// CU-20: la empresa origen es la del usuario autenticado (sin posibilidad de elegir otra)
	const empresaOrigen = $derived($currentUser?.empresa ?? null);
	const empresasDestino = $derived(empresas.filter((e) => e.id !== empresaOrigen?.id));
	// CU-20 Excepción 3: las unidades deben estar en la bodega de origen indicada
	const unidadesDisponibles = $derived(
		createForm.id_bodega_origen
			? units.filter((u) => u.id_bodega_actual === createForm.id_bodega_origen)
			: units
	);
	const hoy = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Santiago' });

	async function load() {
		loading = true;
		error = '';
		try {
			const [transfersData, whData, unitsData] = await Promise.all([
				getTransfers({
					estado: filters.estado || undefined,
					id_empresa: filters.id_empresa || undefined,
					fecha_inicio: filters.fecha_inicio || undefined,
					fecha_fin: filters.fecha_fin || undefined
				}),
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

	onMount(async () => {
		load();
		try { empresas = await getEmpresas(); } catch { /* sin permiso */ }
	});

	$effect(() => { filters.estado; filters.id_empresa; filters.fecha_inicio; filters.fecha_fin; load(); });

	async function handleCreate() {
		createError = '';
		// CU-20 Excepción 2: al menos una unidad en el listado
		if (createForm.ids_unidades.length === 0) {
			createError = 'Debe agregar al menos una unidad al listado.';
			return;
		}
		if (!createForm.observaciones.trim()) {
			createError = 'El motivo es obligatorio.';
			return;
		}
		creating = true;
		try {
			await createTransfer(createForm as unknown as Record<string, unknown>);
			showCreate = false;
			createForm = { id_empresa_destino: 0, id_bodega_origen: 0, id_bodega_destino: 0, ids_unidades: [], observaciones: '' };
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

	async function verDetalle(id: number) {
		loadingDetalle = true;
		showDetalle = true;
		detalle = null;
		try {
			detalle = await getTransferDetail(id);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cargar el detalle';
			showDetalle = false;
		} finally {
			loadingDetalle = false;
		}
	}

	async function handleReject() {
		rejectError = '';
		// CU-22 Excepción 1: el motivo de rechazo es obligatorio
		if (!rejectForm.motivo.trim()) {
			rejectError = 'Debe ingresar un motivo de rechazo para continuar.';
			return;
		}
		// CU-22 Excepción 2: el motivo no puede superar los 200 caracteres
		if (rejectForm.motivo.trim().length > 200) {
			rejectError = 'El motivo de rechazo no puede superar los 200 caracteres.';
			return;
		}
		rejecting = true;
		try {
			await rejectTransfer(rejectForm.id, { observaciones: rejectForm.motivo });
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
				Nueva transferencia inter-empresa
			</Button>
		</div>
	</div>

	<!-- CU-23: filtros por estado, rango de fechas o empresa -->
	<div class="flex flex-wrap items-center gap-3 mb-4">
		<select bind:value={filters.estado} aria-label="Filtrar por estado"
			class="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
			<option value="">Todos los estados</option>
			<option value="PENDIENTE">Pendiente</option>
			<option value="APROBADA">Aprobada</option>
			<option value="RECHAZADA">Rechazada</option>
		</select>
		<select bind:value={filters.id_empresa} aria-label="Filtrar por empresa"
			class="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
			<option value="">Todas las empresas</option>
			{#each empresas as emp}
				<option value={String(emp.id)}>{emp.nombre}</option>
			{/each}
		</select>
		<input type="date" bind:value={filters.fecha_inicio} aria-label="Fecha inicio"
			class="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
		<input type="date" bind:value={filters.fecha_fin} aria-label="Fecha fin"
			class="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4">{error}</div>
	{/if}

	<div class="bg-white rounded-lg border border-border overflow-hidden">
		{#if loading}
			<div class="p-8 text-center text-sm text-muted">Cargando...</div>
		{:else if transfers.length === 0}
			<EmptyState message="No se encontraron transferencias con los filtros seleccionados." action={() => (showCreate = true)} actionlabel="Nueva transferencia inter-empresa" />
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<!-- CU-23: correlativo, empresas, cantidad, fecha, estado y solicitante -->
						<tr class="border-b border-border bg-surface/50">
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">N°</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Empresa origen</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Empresa destino</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Unidades</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Fecha</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Estado</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Solicitante</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Motivo</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#each transfers as tr, i}
							<tr class="border-b border-border {i % 2 === 0 ? 'bg-white' : 'bg-surface/30'}">
								<td class="px-4 py-3 font-mono text-foreground">#{tr.id_transferencia}</td>
								<td class="px-4 py-3 text-foreground">{tr.empresa_origen}</td>
								<td class="px-4 py-3 text-foreground">{tr.empresa_destino}</td>
								<td class="px-4 py-3 text-foreground text-center">{tr.unidades}</td>
								<td class="px-4 py-3 text-muted whitespace-nowrap">{fmtFecha(tr.fecha)}</td>
								<td class="px-4 py-3">
									<Badge variant={(estadoBadge[tr.estado] ?? 'default') as 'default' | 'success' | 'warning' | 'danger' | 'info'}>{estadoLabel[tr.estado] ?? tr.estado}</Badge>
								</td>
								<td class="px-4 py-3 text-muted">{tr.solicitante ?? '-'}</td>
								<td class="px-4 py-3 text-muted max-w-[200px] truncate">{tr.observaciones || '-'}</td>
								<td class="px-4 py-3">
									<div class="flex items-center gap-1">
										<!-- CU-21: ver el detalle completo de la transferencia -->
										<button onclick={() => verDetalle(tr.id_transferencia)}
											class="p-1.5 rounded-md text-muted hover:bg-surface-alt transition-colors"
											aria-label="Ver detalle de la transferencia">
											<Eye class="h-4 w-4" />
										</button>
										{#if roles.includes('SUPERUSUARIO') && tr.estado === 'TRANSFERENCIA_PENDIENTE'}
											<button onclick={() => handleApprove(tr.id_transferencia)}
												class="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
												aria-label="Aprobar transferencia">
												<CheckCircle class="h-4 w-4" />
											</button>
											<button onclick={() => { rejectForm = { id: tr.id_transferencia, motivo: '' }; rejectError = ''; showReject = true; }}
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

<Modal title="Nueva transferencia inter-empresa" open={showCreate} onclose={() => (showCreate = false)}>
	<form onsubmit={(e: Event) => { e.preventDefault(); handleCreate(); }} class="space-y-4">
		{#if createError}
			<div class="bg-red-50 border border-red-200 text-destructive text-sm rounded-md px-3 py-2">{createError}</div>
		{/if}

		<div class="grid grid-cols-2 gap-4">
			<!-- CU-20/CU-17: la empresa origen es la del usuario autenticado -->
			<FormField label="Empresa origen" name="emp_ori">
				<input id="emp_ori" type="text" disabled value={empresaOrigen?.nombre ?? '—'}
					class="w-full px-3 py-2 border border-border rounded-md text-sm bg-surface-alt text-muted" />
			</FormField>
			<FormField label="Empresa destino" name="emp_dest" required>
				<select id="emp_dest" required bind:value={createForm.id_empresa_destino}
					class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
					<option value={0} disabled>Seleccionar...</option>
					{#each empresasDestino as emp}
						<option value={emp.id}>{emp.nombre}</option>
					{/each}
				</select>
			</FormField>
		</div>

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

		<!-- CU-20: fecha de la solicitud (la registra el sistema) -->
		<FormField label="Fecha" name="fch">
			<input id="fch" type="text" disabled value={hoy}
				class="w-full px-3 py-2 border border-border rounded-md text-sm bg-surface-alt text-muted" />
		</FormField>

		<FormField label="Unidades a transferir" name="unds" required>
			<div class="max-h-48 overflow-y-auto space-y-1 border border-border rounded-md p-2">
				{#each unidadesDisponibles as u}
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
				{#if unidadesDisponibles.length === 0}
					<p class="text-xs text-muted text-center py-2">
						{createForm.id_bodega_origen ? 'No hay unidades disponibles en la bodega de origen seleccionada' : 'No hay unidades disponibles en bodega'}
					</p>
				{/if}
			</div>
		</FormField>

		<!-- CU-20: motivo de la transferencia (máximo 200 caracteres) -->
		<FormField label="Motivo" name="obs" required helper="Máximo 200 caracteres">
			<textarea id="obs" required bind:value={createForm.observaciones}
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
		<!-- CU-22: sin `required` ni `maxlength` nativos — las excepciones 1 y 2
		     se validan al confirmar, con los mensajes que exige el caso de uso -->
		<FormField label="Motivo del rechazo" name="motivo" required helper="Máximo 200 caracteres">
			<textarea id="motivo" bind:value={rejectForm.motivo}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				rows="3"></textarea>
			<p class="text-xs mt-1 text-right {rejectForm.motivo.trim().length > 200 ? 'text-destructive font-medium' : 'text-muted'}">
				{rejectForm.motivo.trim().length}/200
			</p>
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

<!-- CU-21: detalle completo de la transferencia seleccionada -->
<Modal title="Detalle de transferencia" open={showDetalle} onclose={() => (showDetalle = false)}>
	{#if loadingDetalle}
		<p class="text-sm text-muted text-center py-6">Cargando detalle...</p>
	{:else if detalle}
		<div class="space-y-4 text-sm">
			<div class="flex items-center justify-between">
				<span class="font-mono text-foreground">#{detalle.id_transferencia}</span>
				<Badge variant={(estadoBadge[detalle.estado] ?? 'default') as 'default' | 'success' | 'warning' | 'danger' | 'info'}>
					{estadoLabel[detalle.estado] ?? detalle.estado}
				</Badge>
			</div>

			<div class="grid grid-cols-2 gap-3">
				<div>
					<p class="text-xs text-muted uppercase tracking-wider mb-0.5">Empresa origen</p>
					<p class="text-foreground">{detalle.empresa_origen}</p>
				</div>
				<div>
					<p class="text-xs text-muted uppercase tracking-wider mb-0.5">Empresa destino</p>
					<p class="text-foreground">{detalle.empresa_destino}</p>
				</div>
				<div>
					<p class="text-xs text-muted uppercase tracking-wider mb-0.5">Bodega origen</p>
					<p class="text-foreground">{detalle.bodega_origen ?? '-'}</p>
				</div>
				<div>
					<p class="text-xs text-muted uppercase tracking-wider mb-0.5">Bodega destino</p>
					<p class="text-foreground">{detalle.bodega_destino ?? '-'}</p>
				</div>
				<div>
					<p class="text-xs text-muted uppercase tracking-wider mb-0.5">Fecha</p>
					<p class="text-foreground">{fmtFecha(detalle.fecha)}</p>
				</div>
				<div>
					<p class="text-xs text-muted uppercase tracking-wider mb-0.5">Solicitante</p>
					<p class="text-foreground">{detalle.solicitante ?? '-'}</p>
				</div>
			</div>

			<div>
				<p class="text-xs text-muted uppercase tracking-wider mb-0.5">Motivo</p>
				<p class="text-foreground">{detalle.motivo || '-'}</p>
			</div>

			<div>
				<p class="text-xs text-muted uppercase tracking-wider mb-1">Unidades ({detalle.unidades.length})</p>
				<div class="max-h-48 overflow-y-auto border border-border rounded-md divide-y divide-border">
					{#each detalle.unidades as u}
						<div class="flex items-center justify-between px-3 py-2">
							<span class="font-mono text-xs">{u.numero_serie}</span>
							<span class="text-muted text-xs">{u.tipo_equipo ?? '-'}</span>
						</div>
					{/each}
					{#if detalle.unidades.length === 0}
						<p class="text-xs text-muted text-center py-2">Sin unidades asociadas</p>
					{/if}
				</div>
			</div>

			{#if roles.includes('SUPERUSUARIO') && detalle.estado === 'TRANSFERENCIA_PENDIENTE'}
				<div class="flex justify-end gap-3 pt-2 border-t border-border">
					<Button variant="destructive" onclick={() => { rejectForm = { id: detalle!.id_transferencia, motivo: '' }; rejectError = ''; showDetalle = false; showReject = true; }}>
						<XCircle class="h-4 w-4" />
						Rechazar
					</Button>
					<Button onclick={async () => { await handleApprove(detalle!.id_transferencia); showDetalle = false; }}>
						<CheckCircle class="h-4 w-4" />
						Confirmar transferencia
					</Button>
				</div>
			{/if}
		</div>
	{/if}
</Modal>
