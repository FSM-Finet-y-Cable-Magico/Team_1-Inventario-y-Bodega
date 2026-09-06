<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getBajas, approveBaja, rejectBaja,
		getDonaciones, getUnidadesDonables, registrarDonacion, descargarPdfDonacion
	} from '$lib/api/index';
	import type { SolicitudBaja, Donacion, UnidadDonable } from '$lib/types';
	import { userRoles } from '$lib/stores/auth';
	import Button from '$lib/components/Button.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { RotateCw, CheckCircle, XCircle, Plus, FileDown, Gift } from '@lucide/svelte';

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

	// CU-80: fechas de donación en formato DD/MM/YYYY
	function fmtFecha(fecha: string | null): string {
		if (!fecha) return '-';
		return new Date(fecha).toLocaleDateString('en-GB', {
			day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Santiago'
		});
	}

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

	// CU-80: sección de donaciones de equipos dados de baja
	let tab = $state<'solicitudes' | 'donaciones'>('solicitudes');
	let donaciones = $state<Donacion[]>([]);
	let candidatas = $state<UnidadDonable[]>([]);
	let loadingDonaciones = $state(false);
	let showDonacion = $state(false);
	let donacionForm = $state({
		nombre_institucion: '',
		rut_institucion: '',
		fecha_donacion: '',
		numero_resolucion: '',
		ids_unidades: [] as number[]
	});
	let donacionError = $state('');
	let guardandoDonacion = $state(false);
	// CU-80 Excepción 1: números de serie rechazados por el backend, resaltados en rojo
	let seriesInvalidas = $state<string[]>([]);
	let descargandoPdf = $state(0);

	const hoyISO = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });

	async function loadDonaciones() {
		loadingDonaciones = true;
		error = '';
		try {
			const [lista, disponibles] = await Promise.all([getDonaciones(), getUnidadesDonables()]);
			donaciones = lista;
			candidatas = disponibles;
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cargar las donaciones';
		} finally {
			loadingDonaciones = false;
		}
	}

	function abrirDonacion() {
		donacionForm = {
			nombre_institucion: '',
			rut_institucion: '',
			fecha_donacion: hoyISO,
			numero_resolucion: '',
			ids_unidades: []
		};
		donacionError = '';
		seriesInvalidas = [];
		showDonacion = true;
	}

	function alternarUnidad(id: number) {
		donacionForm.ids_unidades = donacionForm.ids_unidades.includes(id)
			? donacionForm.ids_unidades.filter((x) => x !== id)
			: [...donacionForm.ids_unidades, id];
	}

	async function handleDonacion() {
		donacionError = '';
		seriesInvalidas = [];
		if (donacionForm.ids_unidades.length === 0) {
			donacionError = 'Debe seleccionar al menos un equipo para incluir en la donación.';
			return;
		}
		guardandoDonacion = true;
		try {
			const resultado = await registrarDonacion({
				nombre_institucion: donacionForm.nombre_institucion.trim(),
				rut_institucion: donacionForm.rut_institucion.trim(),
				fecha_donacion: donacionForm.fecha_donacion,
				numero_resolucion: donacionForm.numero_resolucion.trim() || undefined,
				ids_unidades: donacionForm.ids_unidades
			});
			showDonacion = false;
			success = resultado?.message ?? 'Donación registrada correctamente';
			await loadDonaciones();
		} catch (err: unknown) {
			donacionError = err instanceof Error ? err.message : 'Error al registrar la donación';
			// CU-80 Excepción 1: el backend nombra los NS que no cumplen la condición
			seriesInvalidas = candidatas
				.filter((u) => donacionError.includes(u.numero_serie))
				.map((u) => u.numero_serie);
		} finally {
			guardandoDonacion = false;
		}
	}

	async function handleDescargarPdf(id: number) {
		descargandoPdf = id;
		error = '';
		try {
			await descargarPdfDonacion(id);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al descargar el PDF de la donación';
		} finally {
			descargandoPdf = 0;
		}
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

	// CU-80: las donaciones se cargan al abrir su pestaña
	$effect(() => {
		if (tab === 'donaciones' && donaciones.length === 0 && !loadingDonaciones) loadDonaciones();
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
		<div class="flex items-center gap-3">
			<Button variant="secondary" onclick={() => (tab === 'solicitudes' ? load() : loadDonaciones())}>
				<RotateCw class="h-4 w-4" />
				Actualizar
			</Button>
			<!-- CU-80: registrar una donación de equipos dados de baja -->
			{#if tab === 'donaciones' && puedeResolver}
				<Button onclick={abrirDonacion}>
					<Plus class="h-4 w-4" />
					Registrar donación
				</Button>
			{/if}
		</div>
	</div>

	<!-- CU-78 / CU-80: solicitudes de baja y donaciones conviven en el módulo de bajas -->
	<div class="flex items-center gap-1 border-b border-border mb-4">
		<button onclick={() => (tab = 'solicitudes')}
			class="px-4 py-2 text-sm font-medium border-b-2 transition-colors
				{tab === 'solicitudes' ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-foreground'}">
			Solicitudes de baja
		</button>
		<button onclick={() => (tab = 'donaciones')}
			class="px-4 py-2 text-sm font-medium border-b-2 transition-colors
				{tab === 'donaciones' ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-foreground'}">
			Donaciones
		</button>
	</div>

	{#if tab === 'solicitudes'}
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
	{:else}
		<!-- CU-80: donaciones de equipos dados de baja -->
		<div class="bg-white rounded-lg border border-border overflow-hidden">
			{#if loadingDonaciones}
				<div class="p-8 text-center text-sm text-muted">Cargando...</div>
			{:else if donaciones.length === 0}
				<EmptyState message="No hay donaciones registradas." />
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-border bg-surface/50">
								<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">N°</th>
								<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Institución</th>
								<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">RUT</th>
								<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Fecha</th>
								<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Resolución</th>
								<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Equipos</th>
								<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Registrada por</th>
								<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Resumen</th>
							</tr>
						</thead>
						<tbody>
							{#each donaciones as d, i}
								<tr class="border-b border-border {i % 2 === 0 ? 'bg-white' : 'bg-surface/30'}">
									<td class="px-4 py-3 font-mono text-foreground">#{d.id_donacion}</td>
									<td class="px-4 py-3 text-foreground">{d.nombre_institucion}</td>
									<td class="px-4 py-3 font-mono text-foreground">{d.rut_institucion}</td>
									<td class="px-4 py-3 text-muted whitespace-nowrap">{fmtFecha(d.fecha_donacion)}</td>
									<td class="px-4 py-3 text-muted">{d.numero_resolucion ?? '-'}</td>
									<td class="px-4 py-3 text-foreground text-center">{d.equipos}</td>
									<td class="px-4 py-3 text-muted">{d.registrada_por ?? '-'}</td>
									<td class="px-4 py-3">
										<!-- CU-80: descarga autenticada del resumen en PDF -->
										<button onclick={() => handleDescargarPdf(d.id_donacion)} disabled={descargandoPdf === d.id_donacion}
											class="inline-flex items-center gap-1 text-accent hover:underline disabled:opacity-50">
											<FileDown class="h-4 w-4" />
											{descargandoPdf === d.id_donacion ? 'Generando...' : 'Descargar PDF'}
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{/if}
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

<!-- CU-80: formulario de registro de donación -->
<Modal title="Registrar donación" open={showDonacion} onclose={() => (showDonacion = false)}>
	<form onsubmit={(e: Event) => { e.preventDefault(); handleDonacion(); }} class="space-y-4">
		{#if donacionError}
			<div class="bg-red-50 border border-red-200 text-destructive text-sm rounded-md px-3 py-2">{donacionError}</div>
		{/if}

		<FormField label="Institución receptora" name="don_inst" required helper="Entre 3 y 100 caracteres">
			<input id="don_inst" type="text" required bind:value={donacionForm.nombre_institucion} maxlength={100}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				placeholder="Ej: Fundación Educación Técnica" />
		</FormField>

		<FormField label="RUT de la institución" name="don_rut" required helper="Formato XXXXXXXX-X">
			<input id="don_rut" type="text" required bind:value={donacionForm.rut_institucion} maxlength={12}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				placeholder="76543210-K" />
		</FormField>

		<!-- CU-80: la fecha no puede ser futura -->
		<FormField label="Fecha de donación" name="don_fecha" required>
			<input id="don_fecha" type="date" required bind:value={donacionForm.fecha_donacion} max={hoyISO}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
		</FormField>

		<FormField label="Número de resolución" name="don_res" helper="Opcional, hasta 30 caracteres alfanuméricos">
			<input id="don_res" type="text" bind:value={donacionForm.numero_resolucion} maxlength={30}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				placeholder="RES-2026-014" />
		</FormField>

		<!-- CU-80: solo se listan unidades dadas de baja con motivo 'Donación a institución' -->
		<FormField label="Equipos a donar" name="don_unidades" required
			helper={`${donacionForm.ids_unidades.length} de ${candidatas.length} seleccionados`}>
			<div class="border border-border rounded-md max-h-56 overflow-y-auto divide-y divide-border">
				{#if candidatas.length === 0}
					<p class="px-3 py-4 text-sm text-muted text-center">
						No hay equipos dados de baja con motivo "Donación a institución".
					</p>
				{:else}
					{#each candidatas as u}
						<label class="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-surface-alt
							{seriesInvalidas.includes(u.numero_serie) ? 'bg-red-50' : ''}">
							<input type="checkbox" checked={donacionForm.ids_unidades.includes(u.id_unidad)}
								onchange={() => alternarUnidad(u.id_unidad)} class="text-accent" />
							<span class="font-mono {seriesInvalidas.includes(u.numero_serie) ? 'text-destructive font-semibold' : 'text-foreground'}">
								{u.numero_serie}
							</span>
							<span class="text-muted">{u.tipo_equipo ?? '-'} · {u.marca ?? '-'} {u.modelo ?? ''}</span>
						</label>
					{/each}
				{/if}
			</div>
		</FormField>

		<div class="flex justify-end gap-3 pt-2">
			<Button variant="secondary" onclick={() => (showDonacion = false)} type="button">Cancelar</Button>
			<Button type="submit" loading={guardandoDonacion}>
				<Gift class="h-4 w-4" />
				Registrar donación
			</Button>
		</div>
	</form>
</Modal>
