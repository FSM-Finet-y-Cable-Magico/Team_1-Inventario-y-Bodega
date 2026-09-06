<script lang="ts">
	import { onMount } from 'svelte';
	import { getBajas, approveBaja, rejectBaja } from '$lib/api/index';
	import type { SolicitudBaja } from '$lib/types';
	import { userRoles } from '$lib/stores/auth';
	import Button from '$lib/components/Button.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { RotateCw, CheckCircle, XCircle } from '@lucide/svelte';

	// CU-78: bandeja de solicitudes de baja generadas por técnicos de terreno
	let solicitudes = $state<SolicitudBaja[]>([]);
	let loading = $state(true);
	let error = $state('');
	let success = $state('');
	let roles = $state<string[]>([]);
	userRoles.subscribe((r) => (roles = r));

	// CU-78: solo Administrador y Superusuario resuelven las solicitudes
	const puedeResolver = $derived(roles.some((r) => ['SUPERUSUARIO', 'ADMIN'].includes(r)));

	let filtroEstado = $state('Pendiente de aprobación');

	let showConfirmAprobar = $state(false);
	let solicitudSeleccionada = $state<SolicitudBaja | null>(null);
	let procesando = $state(false);

	let showReject = $state(false);
	let rejectForm = $state({ id: 0, motivo: '' });
	let rejectError = $state('');

	const estadoBadge: Record<string, string> = {
		'Pendiente de aprobación': 'warning',
		Aprobada: 'success',
		Rechazada: 'danger'
	};

	function fmtFechaHora(fecha: string | null): string {
		if (!fecha) return '-';
		return new Date(fecha)
			.toLocaleString('en-GB', {
				day: '2-digit', month: '2-digit', year: 'numeric',
				hour: '2-digit', minute: '2-digit', second: '2-digit',
				hour12: false, timeZone: 'America/Santiago'
			})
			.replace(',', '');
	}

	async function load() {
		loading = true;
		error = '';
		try {
			solicitudes = await getBajas({ estado: filtroEstado || undefined });
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cargar las solicitudes de baja';
		} finally {
			loading = false;
		}
	}

	onMount(load);

	$effect(() => {
		filtroEstado;
		load();
	});

	function pedirConfirmacion(solicitud: SolicitudBaja) {
		solicitudSeleccionada = solicitud;
		showConfirmAprobar = true;
	}

	// CU-78: al aprobar se ejecuta la baja real (irreversible) sobre la unidad
	async function handleApprove() {
		if (!solicitudSeleccionada) return;
		showConfirmAprobar = false;
		procesando = true;
		error = '';
		try {
			const resultado = await approveBaja(solicitudSeleccionada.id_solicitud);
			success = resultado?.message ?? 'Baja aprobada correctamente';
			await load();
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al aprobar la solicitud';
		} finally {
			procesando = false;
			solicitudSeleccionada = null;
		}
	}

	function abrirRechazo(solicitud: SolicitudBaja) {
		rejectForm = { id: solicitud.id_solicitud, motivo: '' };
		rejectError = '';
		showReject = true;
	}

	// CU-78: el rechazo guarda el motivo y la unidad mantiene su estado actual
	async function handleReject() {
		rejectError = '';
		if (!rejectForm.motivo.trim()) {
			rejectError = 'Debe ingresar un motivo de rechazo para continuar.';
			return;
		}
		if (rejectForm.motivo.trim().length > 200) {
			rejectError = 'El motivo de rechazo no puede superar los 200 caracteres.';
			return;
		}
		procesando = true;
		try {
			const resultado = await rejectBaja(rejectForm.id, { motivo_rechazo: rejectForm.motivo.trim() });
			showReject = false;
			success = resultado?.message ?? 'Solicitud rechazada';
			await load();
		} catch (err: unknown) {
			rejectError = err instanceof Error ? err.message : 'Error al rechazar la solicitud';
		} finally {
			procesando = false;
		}
	}
</script>

<div class="max-w-6xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-xl font-bold text-foreground">Bajas definitivas</h1>
		<Button variant="secondary" onclick={load}>
			<RotateCw class="h-4 w-4" />
			Actualizar
		</Button>
	</div>

	<div class="flex flex-wrap items-center gap-3 mb-4">
		<select bind:value={filtroEstado} aria-label="Filtrar por estado"
			class="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
			<option value="">Todos los estados</option>
			<option value="Pendiente de aprobación">Pendiente de aprobación</option>
			<option value="Aprobada">Aprobada</option>
			<option value="Rechazada">Rechazada</option>
		</select>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4">{error}</div>
	{/if}
	{#if success}
		<div class="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md p-4 text-sm mb-4">{success}</div>
	{/if}

	<div class="bg-white rounded-lg border border-border overflow-hidden">
		{#if loading}
			<div class="p-8 text-center text-sm text-muted">Cargando...</div>
		{:else if solicitudes.length === 0}
			<EmptyState message="No hay solicitudes de baja con los filtros seleccionados." />
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border bg-surface/50">
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">N°</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">N° de serie</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Motivo</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Solicitante</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Fecha solicitud</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Estado</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Resolución</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#each solicitudes as s, i}
							<tr class="border-b border-border {i % 2 === 0 ? 'bg-white' : 'bg-surface/30'}">
								<td class="px-4 py-3 font-mono text-foreground">#{s.id_solicitud}</td>
								<td class="px-4 py-3 font-mono text-foreground">
									<a href={`/unidades/${s.id_unidad}`} class="text-accent hover:underline">{s.numero_serie ?? '-'}</a>
								</td>
								<td class="px-4 py-3 text-foreground">
									{s.motivo}{s.motivo_otro ? `: ${s.motivo_otro}` : ''}
								</td>
								<td class="px-4 py-3 text-foreground">{s.solicitante ?? '-'}</td>
								<td class="px-4 py-3 text-muted whitespace-nowrap">{fmtFechaHora(s.fecha_solicitud)}</td>
								<td class="px-4 py-3">
									<Badge variant={(estadoBadge[s.estado] ?? 'default') as 'default' | 'success' | 'warning' | 'danger' | 'info'}>
										{s.estado}
									</Badge>
								</td>
								<td class="px-4 py-3 text-muted">
									{#if s.estado === 'Rechazada' && s.motivo_rechazo}
										<span title={s.motivo_rechazo}>{s.aprobador ?? '-'}: {s.motivo_rechazo}</span>
									{:else if s.fecha_resolucion}
										{s.aprobador ?? '-'} · {fmtFechaHora(s.fecha_resolucion)}
									{:else}
										-
									{/if}
								</td>
								<td class="px-4 py-3">
									<!-- CU-78: aprobar/rechazar solo para Administrador y Superusuario -->
									{#if puedeResolver && s.estado === 'Pendiente de aprobación'}
										<div class="flex items-center gap-2">
											<button onclick={() => pedirConfirmacion(s)} disabled={procesando}
												class="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 disabled:opacity-50"
												aria-label="Aprobar baja">
												<CheckCircle class="h-4 w-4" />
												Aprobar
											</button>
											<button onclick={() => abrirRechazo(s)} disabled={procesando}
												class="inline-flex items-center gap-1 text-destructive hover:text-destructive-hover disabled:opacity-50"
												aria-label="Rechazar baja">
												<XCircle class="h-4 w-4" />
												Rechazar
											</button>
										</div>
									{:else}
										<span class="text-muted">-</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<!-- CU-78: la aprobación ejecuta una baja irreversible -->
<ConfirmDialog
	open={showConfirmAprobar}
	title="Aprobar baja definitiva"
	message={`El equipo ${solicitudSeleccionada?.numero_serie ?? ''} quedará dado de baja de forma irreversible. ¿Confirma la aprobación?`}
	confirmlabel="Aprobar baja"
	cancellabel="Cancelar"
	onconfirm={handleApprove}
	oncancel={() => { showConfirmAprobar = false; solicitudSeleccionada = null; }}
/>

<Modal title="Rechazar solicitud de baja" open={showReject} onclose={() => (showReject = false)}>
	<form onsubmit={(e: Event) => { e.preventDefault(); handleReject(); }} class="space-y-4">
		{#if rejectError}
			<div class="bg-red-50 border border-red-200 text-destructive text-sm rounded-md px-3 py-2">{rejectError}</div>
		{/if}
		<FormField label="Motivo del rechazo" name="motivo_rechazo" required
			helper="Máximo 200 caracteres ({rejectForm.motivo.length}/200)">
			<textarea id="motivo_rechazo" bind:value={rejectForm.motivo} rows="3" maxlength={200}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"></textarea>
		</FormField>
		<div class="flex justify-end gap-3 pt-2">
			<Button variant="secondary" onclick={() => (showReject = false)} type="button">Cancelar</Button>
			<Button type="submit" loading={procesando}>Rechazar solicitud</Button>
		</div>
	</form>
</Modal>
