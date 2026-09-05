<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { getUnit, changeUnitState, getUnitHistory, getWarehouses, updateUnit, registrarResultadoRevision, reacondicionarUnidad } from '$lib/api/index';
	import { userRoles } from '$lib/stores/auth';
	import type { UnidadEquipo, HistorialEstado, EstadoUnidad, Bodega } from '$lib/types';
	import Button from '$lib/components/Button.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { ArrowLeft, RotateCw, Pencil, ClipboardCheck, PackageCheck } from '@lucide/svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	

	let unit = $state<UnidadEquipo | null>(null);
	let history = $state<HistorialEstado[]>([]);
	let warehouses = $state<Bodega[]>([]);
	let loading = $state(true);
	let error = $state('');
	let success = $state('');

	let showChangeState = $state(false);
	// CU-36: observación opcional (máx. 300) en todo cambio de estado;
	// motivoPayload es la descripción obligatoria del diagnóstico "Otro" (CU-40);
	// ubicacion_fisica es la ubicación opcional al ingresar/reingresar a bodega (CU-47)
	let changeForm = $state({ estado_nuevo: '' as EstadoUnidad | '', diagnostico: '', motivoPayload: '', observacion: '', ubicacion_fisica: '', simularErrorHistorial: false });
	const isDev = import.meta.env.DEV;
	const roles = $derived($userRoles);
	const puedeEditarUnidad = $derived(roles.some((r) => ['SUPERUSUARIO', 'ADMIN', 'ADMIN_BODEGA'].includes(r)));
	let changeError = $state('');
	let changing = $state(false);

	// CU-72: registrar resultado de revisión (Operativo / Reparación externa / Baja)
	let showResultado = $state(false);
	let resultadoForm = $state({
		resultado: '' as 'OPERATIVO' | 'REPARACION_EXTERNA' | 'BAJA' | '',
		id_bodega_actual: 0,
		ubicacion_fisica: '',
		nombre_receptor: '',
		fecha_retorno_estimada: '',
		descripcion_falla: '',
		motivo: ''
	});
	let resultadoError = $state('');
	let resultadoGuardando = $state(false);
	// E1: aviso de garantía vigente al intentar dar de baja
	let showConfirmGarantia = $state(false);

	// CU-74: reacondicionar equipo "En revisión" directo a "En bodega" (atajo del resultado Operativo de CU-72)
	let showReacondicionar = $state(false);
	let reacondicionarForm = $state({ id_bodega_destino: 0, ubicacion_fisica: '', observacion: '' });
	let reacondicionarError = $state('');
	let reacondicionando = $state(false);


	// CU-18: edición de los datos de la unidad
	let showEdit = $state(false);
	// CU-34: editables: observaciones, ubicación física (solo En bodega) y complementarios
	let editForm = $state({ modelo: '', id_bodega_actual: 0, numero_poste: '', observaciones: '', ubicacion_fisica: '' });
	let editError = $state('');
	let savingEdit = $state(false);

	// Las claves deben coincidir exactamente (tildes incluidas) con el backend
	const estadoBadge: Record<string, string> = {
		'En bodega': 'default', 'Asignado a técnico': 'info', 'Instalado en cliente': 'success',
		'En revisión': 'warning', 'En préstamo externo': 'info', 'Dado de baja': 'danger'
	};

	// CU-33: formato de fechas DD/MM/YYYY
	function fmtFecha(fecha: string | null | undefined): string {
		if (!fecha) return '-';
		return new Date(fecha).toLocaleDateString('en-GB', {
			day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Santiago'
		});
	}

	// CU-36/CU-37: fecha y hora DD/MM/YYYY HH:MM:SS, zona America/Santiago
	function fmtFechaHora(fecha: string | null | undefined): string {
		if (!fecha) return '-';
		return new Date(fecha).toLocaleString('en-GB', {
			day: '2-digit', month: '2-digit', year: 'numeric',
			hour: '2-digit', minute: '2-digit', second: '2-digit',
			hour12: false, timeZone: 'America/Santiago'
		}).replace(',', '');
	}

	const diagnosticos = [
		'No enciende', 'Se reinicia continuamente', 'Sin señal óptica',
		'Copla o puerto dañado', 'Falla de configuración', 'Daño físico visible',
		'Causa desconocida', 'Otro'
	];

	type TransitionMap = Record<string, string[]>;
	const transiciones: TransitionMap = {
		'En bodega': ['Asignado a técnico', 'En préstamo externo', 'Dado de baja'],
		'Asignado a técnico': ['Instalado en cliente', 'En bodega', 'En revisión'],
		'Instalado en cliente': ['En revisión'],
		'En revisión': ['En bodega', 'En préstamo externo', 'Dado de baja'],
		'En préstamo externo': ['En bodega'],
		'Dado de baja': []
	};

	// CU-35: se ofrecen todos los estados; el sistema valida la transición y
	// rechaza las no permitidas con la Excepción 1 del caso de uso
	const todosLosEstados = [
		'En bodega', 'Asignado a técnico', 'Instalado en cliente',
		'En revisión', 'En préstamo externo', 'Dado de baja'
	];

	async function load() {
		loading = true;
		error = '';
		const id = Number($page.params.id);
		try {
			const unitData = await getUnit(id);
			unit = unitData;
			const [histData, whData] = await Promise.all([
				unitData.numero_serie ? getUnitHistory(unitData.numero_serie).catch(() => null) : null,
				getWarehouses({ activa: true })
			]);
			// CU-37: el backend responde { historial_transiciones: [...] }
			const transiciones_hist = (histData as any)?.historial_transiciones ?? [];
			history = transiciones_hist.map((h: any) => ({
				id_historial: h.id_historial,
				estado_anterior: h.estado_anterior,
				estado_nuevo: h.estado_nuevo,
				motivo: h.observacion_motivo,
				fecha_hora: h.fecha_movimiento,
				usuario: h.usuario,
				empresa: h.empresa
			}));
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
			numero_poste: unit.numero_poste ?? '',
			observaciones: unit.observaciones ?? '',
			ubicacion_fisica: unit.ubicacion_fisica ?? ''
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
			payload.observaciones = editForm.observaciones.trim();
			// CU-34: la ubicación física solo aplica con la unidad en bodega
			if (unit.estado === 'En bodega') payload.ubicacion_fisica = editForm.ubicacion_fisica.trim();
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
			// El backend espera nuevoEstado/diagnostico/descripcionOtro/observacion (CU-35/CU-36/CU-40)
			const payload: Record<string, unknown> = {
				nuevoEstado: changeForm.estado_nuevo
			};
			// CU-36: observación opcional registrada en el historial
			if (changeForm.observacion.trim()) payload.observacion = changeForm.observacion.trim();
			// CU-47: ubicación física opcional al ingresar/reingresar a bodega
			if (changeForm.estado_nuevo === 'En bodega') {
				payload.ubicacion_fisica = changeForm.ubicacion_fisica.trim();
			}
			if (changeForm.estado_nuevo === 'En revisión') {
				payload.diagnostico = changeForm.diagnostico;
				if (changeForm.diagnostico === 'Otro') {
					payload.descripcionOtro = changeForm.motivoPayload;
				}
			}
			if (isDev && changeForm.simularErrorHistorial) {
				payload.simularErrorHistorial = true;
			}
			await changeUnitState(unit.id_unidad, payload);
			showChangeState = false;
			success = 'Estado actualizado correctamente';
			changeForm = { estado_nuevo: '', diagnostico: '', motivoPayload: '', observacion: '', ubicacion_fisica: '', simularErrorHistorial: false };
			await load();
		} catch (err: unknown) {
			changeError = err instanceof Error ? err.message : 'Error al cambiar estado';
		} finally {
			changing = false;
		}
	}

	async function enviarResultadoRevision(confirmarGarantia = false) {
		if (!unit || !resultadoForm.resultado) return;
		resultadoError = '';
		resultadoGuardando = true;
		try {
			const payload: Record<string, unknown> = { resultado: resultadoForm.resultado };
			if (resultadoForm.resultado === 'OPERATIVO') {
				payload.id_bodega_actual = resultadoForm.id_bodega_actual;
				payload.ubicacion_fisica = resultadoForm.ubicacion_fisica.trim();
			} else if (resultadoForm.resultado === 'REPARACION_EXTERNA') {
				payload.nombre_receptor = resultadoForm.nombre_receptor.trim();
				payload.fecha_retorno_estimada = resultadoForm.fecha_retorno_estimada;
				payload.descripcion_falla = resultadoForm.descripcion_falla.trim();
			} else if (resultadoForm.resultado === 'BAJA') {
				payload.motivo = resultadoForm.motivo.trim();
				if (confirmarGarantia) payload.confirmar_garantia = true;
			}
			await registrarResultadoRevision(unit.id_unidad, payload);
			showResultado = false;
			showConfirmGarantia = false;
			success = 'Resultado de revisión registrado correctamente';
			resultadoForm = { resultado: '', id_bodega_actual: 0, ubicacion_fisica: '', nombre_receptor: '', fecha_retorno_estimada: '', descripcion_falla: '', motivo: '' };
			await load();
		} catch (err: unknown) {
			showConfirmGarantia = false;
			resultadoError = err instanceof Error ? err.message : 'Error al registrar el resultado';
		} finally {
			resultadoGuardando = false;
	}
}

function handleSubmitResultado() {
	// E1: si es Baja y el equipo tiene garantía vigente, primero se pide confirmación
	if (resultadoForm.resultado === 'BAJA' && unit?.garantia?.garantia_vigente) {
		showConfirmGarantia = true;
		return;
	}
	enviarResultadoRevision(false);
}

// CU-74: reacondicionar equipo operativo desde revisión a bodega
async function handleReacondicionar() {
	if (!unit) return;
	// E1: mismo mensaje exacto que el backend, para no dejar avanzar sin bodega
	if (!reacondicionarForm.id_bodega_destino) {
		reacondicionarError = 'Debe seleccionar una bodega de destino para continuar.';
		return;
	}
	reacondicionarError = '';
	reacondicionando = true;
	try {
		const payload: Record<string, unknown> = {
			id_bodega_destino: reacondicionarForm.id_bodega_destino
		};
		if (reacondicionarForm.ubicacion_fisica.trim()) payload.ubicacion_fisica = reacondicionarForm.ubicacion_fisica.trim();
		if (reacondicionarForm.observacion.trim()) payload.observacion = reacondicionarForm.observacion.trim();
		await reacondicionarUnidad(unit.id_unidad, payload);
		showReacondicionar = false;
		success = 'Equipo reacondicionado y enviado a bodega correctamente';
		reacondicionarForm = { id_bodega_destino: 0, ubicacion_fisica: '', observacion: '' };
		await load();
	} catch (err: unknown) {
		reacondicionarError = err instanceof Error ? err.message : 'Error al reacondicionar el equipo';
	} finally {
		reacondicionando = false;
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

					<!-- CU-33: ficha de detalle completa de la unidad -->
					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span class="text-muted">Tipo de equipo:</span>
							<p class="text-foreground font-medium">{unit.tipo_equipo?.nombre || '-'}</p>
						</div>
						<div>
							<span class="text-muted">Dirección MAC:</span>
							<p class="text-foreground font-mono">{unit.mac_address || '-'}</p>
						</div>
						<div>
							<span class="text-muted">Marca:</span>
							<p class="text-foreground">{unit.marca || unit.tipo_equipo?.marca || '-'}</p>
						</div>
						<div>
							<span class="text-muted">Modelo:</span>
							<p class="text-foreground font-medium">{unit.modelo || '-'}</p>
						</div>
						<div>
							<span class="text-muted">Empresa propietaria:</span>
							<p class="text-foreground">{unit.empresa || '-'}</p>
						</div>
						<div>
							<span class="text-muted">Proveedor:</span>
							<p class="text-foreground">{unit.proveedor || '-'}</p>
						</div>
						<div>
							<span class="text-muted">Fecha de adquisición:</span>
							<p class="text-foreground">{fmtFecha(unit.fecha_adquisicion)}</p>
						</div>
						<div>
							<span class="text-muted">Vencimiento de garantía:</span>
							<p class="text-foreground">
								<!-- CU-38 Excepción 1: garantía no calculable -->
								{#if unit.garantia?.no_calculable}
									Garantía no calculable
								{:else}
									{unit.fecha_venc_garantia ? fmtFecha(unit.fecha_venc_garantia) : 'Sin garantía'}
								{/if}
								{#if unit.garantia?.garantia_vigente}
									<!-- CU-39: indicador visual de garantía vigente -->
									<span class="inline-flex items-center gap-1 ml-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">⚠ En garantía</span>
								{/if}
							</p>
						</div>
						{#if unit.estado === 'En bodega'}
							<div>
								<span class="text-muted">Bodega actual:</span>
								<p class="text-foreground">{unit.bodega || (unit.id_bodega_actual ? `ID: ${unit.id_bodega_actual}` : '-')}</p>
							</div>
							<div>
								<span class="text-muted">Ubicación física en bodega:</span>
								<p class="text-foreground">{unit.ubicacion_fisica || '-'}</p>
							</div>
						{:else}
							<!-- CU-33: fuera de bodega se indica la ubicación externa según el estado -->
							<div class="col-span-2">
								<span class="text-muted">Ubicación externa:</span>
								<p class="text-foreground">{unit.estado}{unit.estado === 'Instalado en cliente' && unit.id_cliente_instalado ? ` (cliente #${unit.id_cliente_instalado})` : ''}</p>
							</div>
						{/if}
						<div class="col-span-2">
							<span class="text-muted">Observaciones:</span>
							<p class="text-foreground">{unit.observaciones || '-'}</p>
						</div>
					</div>

					<div class="mt-6 pt-4 border-t border-border flex items-center gap-3">
						<!-- CU-35: el botón siempre está disponible; el sistema valida la transición -->
						<Button onclick={() => {
							changeForm.estado_nuevo = '';
							showChangeState = true;
						}}>
							<RotateCw class="h-4 w-4" />
							Cambiar estado
						</Button>
						<!-- CU-72: solo disponible cuando la unidad está en revisión -->
						{#if unit.estado === 'En revisión'}
							<Button onclick={() => {
								resultadoForm = { resultado: '', id_bodega_actual: 0, ubicacion_fisica: '', nombre_receptor: '', fecha_retorno_estimada: '', descripcion_falla: '', motivo: '' };
								resultadoError = '';
								showResultado = true;
							}}>
								<ClipboardCheck class="h-4 w-4" />
								Registrar resultado
							</Button>
							<!-- CU-74: atajo directo para el caso Operativo (misma transición que CU-72) -->
							<Button variant="secondary" onclick={() => {
								reacondicionarForm = { id_bodega_destino: 0, ubicacion_fisica: '', observacion: '' };
								reacondicionarError = '';
								showReacondicionar = true;
							}}>
								<PackageCheck class="h-4 w-4" />
								Operativo - enviar a bodega
							</Button>
						{/if}
					<!-- CU-18: edición de los datos de la unidad -->
					{#if puedeEditarUnidad}
						<Button variant="secondary" onclick={abrirEdicion}>
							<Pencil class="h-4 w-4" />
							Editar datos
						</Button>
					{/if}
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
										<!-- CU-36/CU-37: fecha DD/MM/YYYY HH:MM:SS, usuario responsable y empresa -->
										<p class="text-xs text-muted mt-1">
											{fmtFechaHora(h.fecha_hora)}
											{#if h.usuario}· {h.usuario}{/if}
											{#if h.empresa}· {h.empresa}{/if}
										</p>
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

		<!-- CU-34: ubicación física en bodega (máx. 60, solo en estado En bodega).
		     El límite lo valida el sistema para mostrar el error específico (Excepción 1) -->
		{#if unit?.estado === 'En bodega'}
			<FormField label="Ubicación física en bodega" name="ed_ubi" helper="Máximo 60 caracteres ({editForm.ubicacion_fisica.length}/60)">
				<input id="ed_ubi" type="text" bind:value={editForm.ubicacion_fisica} maxlength={60}
					class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
					placeholder="Ej: Estante B, fila 3" />
			</FormField>
		{/if}

		<FormField label="Observaciones" name="ed_obs" helper="Máximo 300 caracteres ({editForm.observaciones.length}/300)">
			<textarea id="ed_obs" bind:value={editForm.observaciones} rows="2"
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"></textarea>
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

			<!-- CU-39: aviso si el equipo tiene garantía vigente -->
			{#if (changeForm.estado_nuevo === 'Dado de baja' || changeForm.estado_nuevo === 'En revisión') && unit.garantia?.garantia_vigente}
				<div class="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-md px-3 py-2">
					AVISO: Este equipo tiene garantía vigente hasta {fmtFecha(unit.fecha_venc_garantia)}.
					Considere su devolución al proveedor antes de proceder.
				</div>
			{/if}

			<!-- CU-35: se listan todos los estados; el sistema bloquea las
			     transiciones no permitidas según el ciclo de vida -->
			<FormField label="Nuevo estado" name="nuevo_est" required
				helper={`Transiciones permitidas desde "${unit.estado}": ${(transiciones[unit.estado] || []).join(', ') || 'ninguna (estado terminal)'}`}>
				<select id="nuevo_est" required bind:value={changeForm.estado_nuevo}
					class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
					<option value="">Seleccionar...</option>
					{#each todosLosEstados.filter((e) => e !== unit?.estado) as est}
						<option value={est}>{est}</option>
					{/each}
				</select>
			</FormField>

			<!-- CU-47: ubicación física opcional al ingresar/reingresar la unidad a bodega -->
			{#if changeForm.estado_nuevo === 'En bodega'}
				<FormField label="Ubicación física en bodega" name="ubi_cambio"
					helper="Opcional, máximo 60 caracteres ({changeForm.ubicacion_fisica.length}/60)">
					<input id="ubi_cambio" type="text" bind:value={changeForm.ubicacion_fisica} maxlength={60}
						class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
						placeholder="Ej: Estante B, Fila 3" />
				</FormField>
				{#if !changeForm.ubicacion_fisica.trim()}
					<!-- CU-47 Excepción 1: el sistema permite continuar sin ubicación,
					     pero muestra el aviso de trazabilidad sin bloquear -->
					<div class="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-md px-3 py-2">
						Se recomienda registrar la ubicación física para facilitar la trazabilidad del equipo.
					</div>
				{/if}
			{/if}

			{#if changeForm.estado_nuevo === 'En revisión'}
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
					<!-- CU-40 Excepción 1: la obligatoriedad y el rango (5-200) los valida
					     el sistema para mostrar el mensaje exacto del caso de uso -->
					<FormField label="Descripción del diagnóstico" name="otro_diag" required
						helper="5-200 caracteres ({changeForm.motivoPayload.length}/200)">
						<textarea id="otro_diag" bind:value={changeForm.motivoPayload}
							class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
							rows="3"></textarea>
					</FormField>
				{/if}
			{/if}

			<!-- CU-36: observación opcional registrada en el historial inmutable -->
			<FormField label="Observación" name="obs_cambio" helper="Opcional, máximo 300 caracteres ({changeForm.observacion.length}/300)">
				<textarea id="obs_cambio" bind:value={changeForm.observacion} rows="2"
					class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"></textarea>
			</FormField>

			{#if isDev}
				<!-- Solo visible en desarrollo para facilitar la prueba de CU-36 Excepción 1 -->
				<label class="flex items-center gap-2 text-sm text-amber-700 cursor-pointer">
					<input type="checkbox" bind:checked={changeForm.simularErrorHistorial} class="text-accent" />
					Simular error al guardar historial (QA)
				</label>
			{/if}
		{/if}

		<div class="flex justify-end gap-3 pt-2">
			<Button variant="secondary" onclick={() => (showChangeState = false)} type="button">Cancelar</Button>
			<Button type="submit" loading={changing}>Cambiar estado</Button>
		</div>
	</form>
</Modal>

<!-- CU-72: registrar resultado de la revisión de un equipo en 'En revisión' -->
<Modal title="Registrar resultado de revisión" open={showResultado} onclose={() => (showResultado = false)}>
	<form onsubmit={(e: Event) => { e.preventDefault(); handleSubmitResultado(); }} class="space-y-4">
		{#if resultadoError}
			<div class="bg-red-50 border border-red-200 text-destructive text-sm rounded-md px-3 py-2">{resultadoError}</div>
		{/if}
		{#if unit}
			<p class="text-sm text-muted">
				Diagnóstico registrado en el ingreso a revisión: <strong>{unit.diagnostico_tecnico || 'No registrado'}</strong>
			</p>

			<FormField label="Resultado" name="resultado" required>
				<select id="resultado" required bind:value={resultadoForm.resultado}
					class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
					<option value="">Seleccionar...</option>
					<option value="OPERATIVO">Operativo</option>
					<option value="REPARACION_EXTERNA">Requiere reparación externa</option>
					<option value="BAJA">Dado de baja</option>
				</select>
			</FormField>

			{#if resultadoForm.resultado === 'OPERATIVO'}
				<FormField label="Bodega de destino" name="res_bod" required>
					<select id="res_bod" required bind:value={resultadoForm.id_bodega_actual}
						class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
						<option value={0} disabled>Seleccionar...</option>
						{#each warehouses as wh}
							<option value={wh.id_bodega}>{wh.nombre}</option>
						{/each}
					</select>
				</FormField>
				<FormField label="Ubicación física en bodega" name="res_ubi"
					helper="Opcional, máximo 60 caracteres ({resultadoForm.ubicacion_fisica.length}/60)">
					<input id="res_ubi" type="text" bind:value={resultadoForm.ubicacion_fisica} maxlength={60}
						class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
				</FormField>
			{/if}

			{#if resultadoForm.resultado === 'REPARACION_EXTERNA'}
				<FormField label="Nombre del receptor" name="res_recep" required
					helper="3-80 caracteres ({resultadoForm.nombre_receptor.length}/80)">
					<input id="res_recep" type="text" required bind:value={resultadoForm.nombre_receptor} maxlength={80}
						class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
				</FormField>
				<FormField label="Fecha estimada de retorno" name="res_fecha" required>
					<input id="res_fecha" type="date" required bind:value={resultadoForm.fecha_retorno_estimada}
						class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
				</FormField>
				<FormField label="Descripción de la falla" name="res_falla" required
					helper="5-300 caracteres ({resultadoForm.descripcion_falla.length}/300)">
					<textarea id="res_falla" required bind:value={resultadoForm.descripcion_falla} rows="3"
						class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"></textarea>
				</FormField>
			{/if}

			{#if resultadoForm.resultado === 'BAJA'}
				<FormField label="Motivo de baja" name="res_motivo" required
					helper="Máximo 200 caracteres ({resultadoForm.motivo.length}/200)">
					<textarea id="res_motivo" required bind:value={resultadoForm.motivo} maxlength={200} rows="3"
						class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"></textarea>
				</FormField>
				{#if unit.garantia?.garantia_vigente}
					<div class="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-md px-3 py-2">
						Este equipo tiene garantía vigente. Al confirmar, el sistema pedirá una segunda confirmación.
					</div>
				{/if}
			{/if}
		{/if}

		<div class="flex justify-end gap-3 pt-2">
			<Button variant="secondary" onclick={() => (showResultado = false)} type="button">Cancelar</Button>
			<Button type="submit" loading={resultadoGuardando} disabled={!resultadoForm.resultado}>Confirmar</Button>
		</div>
	</form>
</Modal>

<!-- CU-74: reacondicionar equipo operativo desde revisión a bodega -->
<Modal title="Operativo - enviar a bodega" open={showReacondicionar} onclose={() => (showReacondicionar = false)}>
	<form onsubmit={(e: Event) => { e.preventDefault(); handleReacondicionar(); }} class="space-y-4">
		{#if reacondicionarError}
			<div class="bg-red-50 border border-red-200 text-destructive text-sm rounded-md px-3 py-2">{reacondicionarError}</div>
		{/if}
		{#if unit}
			<p class="text-sm text-muted">
				El equipo pasará de <strong>{unit.estado}</strong> a <strong>En bodega</strong>.
			</p>

			<!-- E1: bodega de destino activa y obligatoria; sin "required" nativo para que
			     el envío llegue a handleReacondicionar() y muestre el mensaje exacto del CU -->
			<FormField label="Bodega de destino" name="reac_bod" required>
				<select id="reac_bod" bind:value={reacondicionarForm.id_bodega_destino}
					class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
					<option value={0} disabled>Seleccionar...</option>
					{#each warehouses as wh}
						<option value={wh.id_bodega}>{wh.nombre}</option>
					{/each}
				</select>
			</FormField>

			<FormField label="Ubicación física en bodega" name="reac_ubi"
				helper="Opcional, máximo 60 caracteres ({reacondicionarForm.ubicacion_fisica.length}/60)">
				<input id="reac_ubi" type="text" bind:value={reacondicionarForm.ubicacion_fisica} maxlength={60}
					class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
					placeholder="Ej: Estante B, Fila 3" />
			</FormField>

			<FormField label="Observación" name="reac_obs"
				helper="Opcional, máximo 300 caracteres ({reacondicionarForm.observacion.length}/300)">
				<textarea id="reac_obs" bind:value={reacondicionarForm.observacion} maxlength={300} rows="2"
					class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"></textarea>
			</FormField>
		{/if}

		<div class="flex justify-end gap-3 pt-2">
			<Button variant="secondary" onclick={() => (showReacondicionar = false)} type="button">Cancelar</Button>
			<!-- E1: no se deshabilita por falta de bodega, para que el clic dispare el
			     mensaje exacto en handleReacondicionar() en vez de bloquear el botón -->
			<Button type="submit" loading={reacondicionando} disabled={reacondicionando}>Confirmar</Button>
		</div>
	</form>
</Modal>

<!-- CU-72 Excepción 1: aviso de garantía vigente antes de dar de baja -->
<ConfirmDialog
	open={showConfirmGarantia}
	title="Garantía vigente"
	message="El equipo tiene garantía vigente. ¿Desea continuar de todas formas con la baja?"
	confirmlabel="Continuar"
	cancellabel="Cancelar"
	variant="destructive"
	onconfirm={() => enviarResultadoRevision(true)}
	oncancel={() => (showConfirmGarantia = false)}
/>
