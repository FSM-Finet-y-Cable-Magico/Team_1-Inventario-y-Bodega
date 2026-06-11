<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { getUnit, changeUnitState, getUnitHistory, getWarehouses, updateUnit } from '$lib/api/index';
	import type { UnidadEquipo, HistorialEstado, EstadoUnidad, Bodega } from '$lib/types';
	import Button from '$lib/components/Button.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { ArrowLeft, RotateCw, Pencil } from '@lucide/svelte';

	let unit = $state<UnidadEquipo | null>(null);
	let history = $state<HistorialEstado[]>([]);
	let warehouses = $state<Bodega[]>([]);
	let loading = $state(true);
	let error = $state('');
	let success = $state('');

	let showChangeState = $state(false);
	let changeForm = $state({ estado_nuevo: '' as EstadoUnidad | '', diagnostico: '', motivoPayload: '' });
	let changeError = $state('');
	let changing = $state(false);

	// CU-18: edición de los datos de la unidad
	let showEdit = $state(false);
	let editForm = $state({ modelo: '', id_bodega_actual: 0, numero_poste: '' });
	let editError = $state('');
	let savingEdit = $state(false);

	const estadoBadge: Record<string, string> = {
		'En bodega': 'default', 'Asignado a tecnico': 'info', 'Instalado en cliente': 'success',
		'En revision': 'warning', 'En prestamo externo': 'info', 'Dado de baja': 'danger'
	};

	const diagnosticos = [
		'No enciende', 'Se reinicia continuamente', 'Sin señal óptica',
		'Copla o puerto dañado', 'Falla de configuración', 'Daño físico visible',
		'Causa desconocida', 'Otro'
	];

	type TransitionMap = Record<string, string[]>;
	const transiciones: TransitionMap = {
		'En bodega': ['Asignado a tecnico', 'En prestamo externo', 'Dado de baja'],
		'Asignado a tecnico': ['Instalado en cliente', 'En bodega', 'En revision'],
		'Instalado en cliente': ['En revision'],
		'En revision': ['En bodega', 'En prestamo externo', 'Dado de baja'],
		'En prestamo externo': ['En bodega'],
		'Dado de baja': []
	};

	async function load() {
		loading = true;
		error = '';
		const id = Number($page.params.id);
		try {
			const unitData = await getUnit(id);
			unit = unitData;
			const [histData, whData] = await Promise.all([
				unitData.numero_serie ? getUnitHistory(unitData.numero_serie).catch(() => []) : [],
				getWarehouses({ activa: true })
			]);
			history = Array.isArray(histData) ? histData : [];
			warehouses = whData;
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cargar unidad';
		} finally {
			loading = false;
		}
	}

	onMount(load);

	function abrirEdicion() {
		if (!unit) return;
		editForm = {
			modelo: unit.modelo ?? '',
			id_bodega_actual: unit.id_bodega_actual ?? 0,
			numero_poste: unit.numero_poste ?? ''
		};
		editError = '';
		showEdit = true;
	}

	async function handleEdit() {
		if (!unit) return;
		editError = '';
		savingEdit = true;
		try {
			const payload: Record<string, unknown> = {};
			if (editForm.modelo.trim()) payload.modelo = editForm.modelo.trim();
			if (editForm.id_bodega_actual) payload.id_bodega_actual = editForm.id_bodega_actual;
			if (editForm.numero_poste.trim()) payload.numero_poste = editForm.numero_poste.trim();
			await updateUnit(unit.id_unidad, payload);
			showEdit = false;
			success = 'Unidad actualizada correctamente';
			await load();
		} catch (err: unknown) {
			editError = err instanceof Error ? err.message : 'Error al actualizar unidad';
		} finally {
			savingEdit = false;
		}
	}

	async function handleChangeState() {
		if (!unit) return;
		changeError = '';
		changing = true;
		try {
			const payload: Record<string, unknown> = {
				estado_nuevo: changeForm.estado_nuevo
			};
			if (changeForm.estado_nuevo === 'En revision') {
				if (changeForm.diagnostico === 'Otro') {
					payload.motivoPayload = changeForm.motivoPayload;
				} else {
					payload.diagnostico = changeForm.diagnostico;
				}
			}
			await changeUnitState(unit.id_unidad, payload);
			showChangeState = false;
			success = 'Estado actualizado correctamente';
			changeForm = { estado_nuevo: '', diagnostico: '', motivoPayload: '' };
			await load();
		} catch (err: unknown) {
			changeError = err instanceof Error ? err.message : 'Error al cambiar estado';
		} finally {
			changing = false;
		}
	}
</script>

<div class="max-w-4xl mx-auto">
	<button onclick={() => goto('/unidades')}
		class="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-4">
		<ArrowLeft class="h-4 w-4" />
		Volver a unidades
	</button>

	{#if loading}
		<div class="bg-white rounded-lg border border-border p-6 animate-pulse space-y-4">
			<div class="h-6 w-48 bg-surface-alt rounded"></div>
			<div class="h-4 w-full bg-surface-alt rounded"></div>
		</div>
	{:else if !unit}
		<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm">Unidad no encontrada</div>
	{:else}
		{#if error}
			<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4">{error}</div>
		{/if}
		{#if success}
			<div class="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md p-4 text-sm mb-4">{success}</div>
		{/if}

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<div class="lg:col-span-2 space-y-6">
				<div class="bg-white rounded-lg border border-border p-6">
					<div class="flex items-center justify-between mb-4">
						<div>
							<h1 class="text-lg font-semibold text-foreground">{unit.numero_serie}</h1>
							<p class="text-sm text-muted">{unit.tipo_equipo?.nombre} {unit.modelo ? `- ${unit.modelo}` : ''}</p>
						</div>
						<Badge variant={estadoBadge[unit.estado] as 'default' | 'info' | 'success' | 'warning' | 'danger'}>
							{unit.estado}
						</Badge>
					</div>

					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span class="text-muted">Tipo:</span>
							<p class="text-foreground font-medium">{unit.tipo_equipo?.nombre || '-'}</p>
						</div>
						<div>
							<span class="text-muted">Modelo:</span>
							<p class="text-foreground font-medium">{unit.modelo || '-'}</p>
						</div>
						<div>
							<span class="text-muted">Adquisición:</span>
							<p class="text-foreground">{unit.fecha_adquisicion || '-'}</p>
						</div>
						<div>
							<span class="text-muted">Garantía:</span>
							<p class="text-foreground">{unit.fecha_venc_garantia || 'Sin garantía'}</p>
						</div>
						<div>
							<span class="text-muted">Bodega:</span>
							<p class="text-foreground">{unit.id_bodega_actual ? `ID: ${unit.id_bodega_actual}` : '-'}</p>
						</div>
						<div>
							<span class="text-muted">Poste:</span>
							<p class="text-foreground">{unit.numero_poste || '-'}</p>
						</div>
					</div>

					<div class="mt-6 pt-4 border-t border-border flex items-center gap-3">
						{#if transiciones[unit.estado]?.length}
							<Button onclick={() => {
								changeForm.estado_nuevo = '';
								showChangeState = true;
							}}>
								<RotateCw class="h-4 w-4" />
								Cambiar estado
							</Button>
						{/if}
						<!-- CU-18: edición de los datos de la unidad -->
						<Button variant="secondary" onclick={abrirEdicion}>
							<Pencil class="h-4 w-4" />
							Editar datos
						</Button>
					</div>
				</div>

				<div class="bg-white rounded-lg border border-border p-6">
					<h2 class="text-base font-semibold text-foreground mb-4">Historial de estados</h2>
					{#if history.length === 0}
						<p class="text-sm text-muted">Sin cambios de estado registrados</p>
					{:else}
						<div class="space-y-3">
							{#each history as h}
								<div class="flex items-start gap-3 text-sm pb-3 border-b border-border last:border-0">
									<div class="w-2 h-2 rounded-full mt-1.5 bg-accent shrink-0"></div>
									<div class="flex-1">
										<div class="flex items-center gap-2">
											<Badge variant="default">{h.estado_anterior || '-'}</Badge>
											<span class="text-muted">→</span>
											<Badge variant={estadoBadge[h.estado_nuevo ?? ''] as 'default' | 'info' | 'success' | 'warning' | 'danger' || 'default'}>
												{h.estado_nuevo}
											</Badge>
										</div>
										{#if h.motivo}
											<p class="text-muted mt-1">{h.motivo}</p>
										{/if}
										<p class="text-xs text-muted mt-1">{new Date(h.fecha_hora).toLocaleString('es-CL')}</p>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<div class="bg-white rounded-lg border border-border p-6 h-fit">
				<h2 class="text-sm font-semibold text-foreground mb-3">Información adicional</h2>
				<dl class="space-y-2 text-sm">
					<div class="flex justify-between">
						<dt class="text-muted">ID Unidad</dt>
						<dd class="text-foreground font-mono">{unit.id_unidad}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted">Cliente</dt>
						<dd class="text-foreground">{unit.id_cliente_instalado || '-'}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted">Caja NAP</dt>
						<dd class="text-foreground">{unit.id_caja_nap || '-'}</dd>
					</div>
				</dl>
			</div>
		</div>
	{/if}
</div>

<!-- CU-18: edición de datos de la unidad -->
<Modal title="Editar unidad" open={showEdit} onclose={() => (showEdit = false)}>
	<form onsubmit={(e: Event) => { e.preventDefault(); handleEdit(); }} class="space-y-4">
		{#if editError}
			<div class="bg-red-50 border border-red-200 text-destructive text-sm rounded-md px-3 py-2">{editError}</div>
		{/if}

		<FormField label="Modelo" name="ed_mod">
			<input id="ed_mod" type="text" bind:value={editForm.modelo} maxlength={80}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
		</FormField>

		<FormField label="Bodega" name="ed_bod">
			<select id="ed_bod" bind:value={editForm.id_bodega_actual}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
				<option value={0} disabled>Seleccionar...</option>
				{#each warehouses as wh}
					<option value={wh.id_bodega}>{wh.nombre}</option>
				{/each}
			</select>
		</FormField>

		<FormField label="Número de poste" name="ed_poste">
			<input id="ed_poste" type="text" bind:value={editForm.numero_poste} maxlength={30}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
		</FormField>

		<div class="flex justify-end gap-3 pt-2">
			<Button variant="secondary" onclick={() => (showEdit = false)} type="button">Cancelar</Button>
			<Button type="submit" loading={savingEdit}>Guardar cambios</Button>
		</div>
	</form>
</Modal>

<Modal title="Cambiar estado" open={showChangeState} onclose={() => (showChangeState = false)}>
	<form onsubmit={(e: Event) => { e.preventDefault(); handleChangeState(); }} class="space-y-4">
		{#if changeError}
			<div class="bg-red-50 border border-red-200 text-destructive text-sm rounded-md px-3 py-2">{changeError}</div>
		{/if}
		{#if unit}
			<p class="text-sm text-muted">Estado actual: <strong>{unit.estado}</strong></p>

			<FormField label="Nuevo estado" name="nuevo_est" required>
				<select id="nuevo_est" required bind:value={changeForm.estado_nuevo}
					class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
					<option value="">Seleccionar...</option>
					{#each (transiciones[unit.estado] || []) as est}
						<option value={est}>{est}</option>
					{/each}
				</select>
			</FormField>

			{#if changeForm.estado_nuevo === 'En revision'}
				<FormField label="Diagnóstico" name="diag" required>
					<select id="diag" bind:value={changeForm.diagnostico}
						class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
						<option value="">Seleccionar diagnóstico...</option>
						{#each diagnosticos as d}
							<option value={d}>{d}</option>
						{/each}
					</select>
				</FormField>

				{#if changeForm.diagnostico === 'Otro'}
					<FormField label="Descripción del diagnóstico" name="otro_diag" required
						helper="5-200 caracteres">
						<textarea id="otro_diag" required bind:value={changeForm.motivoPayload}
							class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
							rows="3" minlength={5} maxlength={200}></textarea>
					</FormField>
				{/if}
			{/if}
		{/if}

		<div class="flex justify-end gap-3 pt-2">
			<Button variant="secondary" onclick={() => (showChangeState = false)} type="button">Cancelar</Button>
			<Button type="submit" loading={changing}>Cambiar estado</Button>
		</div>
	</form>
</Modal>
