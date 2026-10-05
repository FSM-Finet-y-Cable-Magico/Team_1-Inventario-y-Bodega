<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getMiJornada,
		getTiposTrabajo,
		getBorradorCierre,
		guardarBorradorCierre
	} from '$lib/api/index';
	import type { JornadaTecnico, TrabajoDelDia, TipoTrabajo } from '$lib/types';
	import Button from '$lib/components/Button.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { MapPin, Phone, RotateCw, ClipboardList } from '@lucide/svelte';

	// CU-61: vista móvil del técnico. La página es su propia vista (responsive),
	// con los trabajos del día (G3) y el inventario personal (CU-58).
	let jornada = $state<JornadaTecnico | null>(null);
	let loading = $state(true);
	let error = $state('');

	// CU-70: catálogo codificado de tipos de trabajo (T-01..T-10) y borrador del cierre.
	// El cierre de la OT lo ejecuta G3 (CU-63); lo que el técnico prepara aquí precompleta
	// el cierre que llega por el webhook (CU-69).
	let tiposTrabajo = $state<TipoTrabajo[]>([]);
	let otAbierta = $state<number | null>(null);
	let otManual = $state('');
	let guardando = $state(false);
	let mensajeCierre = $state('');
	let errorCierre = $state('');
	let formulario = $state({
		codigo_trabajo: '',
		falla_reportada: '',
		solucion_aplicada: '',
		resultado: '',
		categoria_falla: ''
	});

	const RESULTADOS = [
		{ valor: 'RESUELTO', etiqueta: 'Resuelto' },
		{ valor: 'PARCIAL', etiqueta: 'Resuelto parcialmente' },
		{ valor: 'SIN_SOLUCION', etiqueta: 'Sin solución' }
	];

	// Códigos que aplican a la OT abierta (T-10 aplica a instalación y reparación).
	const tiposAplicables = $derived.by(() => {
		const trabajo = jornada?.trabajos.find((t) => t.id_ot === otAbierta);
		if (!trabajo?.tipo_ot) return tiposTrabajo;
		return tiposTrabajo.filter(
			(tipo) => tipo.tipo_ot === trabajo.tipo_ot || tipo.tipo_ot === 'AMBOS'
		);
	});

	const tipoSeleccionado = $derived(
		tiposTrabajo.find((tipo) => tipo.codigo === formulario.codigo_trabajo) ?? null
	);

	function limpiarFormulario() {
		formulario = {
			codigo_trabajo: '',
			falla_reportada: '',
			solucion_aplicada: '',
			resultado: '',
			categoria_falla: ''
		};
	}

	async function abrirCierre(idOt: number | null) {
		mensajeCierre = '';
		errorCierre = '';
		if (idOt === null || otAbierta === idOt) {
			otAbierta = null;
			return;
		}
		otAbierta = idOt;
		limpiarFormulario();

		// Si ya había un borrador para esta OT, se retoma tal como quedó.
		const borrador = await getBorradorCierre(idOt).catch(() => null);
		if (borrador) {
			formulario = {
				codigo_trabajo: borrador.codigoTrabajo ?? '',
				falla_reportada: borrador.fallaReportada ?? '',
				solucion_aplicada: borrador.solucionAplicada ?? '',
				resultado: borrador.resultado ?? '',
				categoria_falla: borrador.categoriaFalla ?? ''
			};
		}
	}

	// Si G3 no responde, el técnico igual puede preparar el cierre indicando la OT.
	async function abrirCierrePorNumero() {
		const numero = parseInt(otManual, 10);
		if (!Number.isInteger(numero) || numero <= 0) {
			errorCierre = 'Indique un número de OT válido.';
			return;
		}
		await abrirCierre(numero);
	}

	// Precompletado del CU-70: al elegir un código se rellenan los campos que ese tipo
	// define; lo que el técnico ya escribió no se pisa.
	function aplicarTipo(codigo: string) {
		formulario.codigo_trabajo = codigo;
		const tipo = tiposTrabajo.find((t) => t.codigo === codigo);
		if (!tipo) return;
		for (const campo of ['falla_reportada', 'solucion_aplicada', 'resultado', 'categoria_falla'] as const) {
			const predefinido = tipo.campos[campo];
			if (predefinido && formulario[campo].trim() === '') formulario[campo] = predefinido;
		}
	}

	// Reemplaza los campos por los del tipo seleccionado, descartando los ajustes.
	function restaurarPredefinidos() {
		const tipo = tipoSeleccionado;
		if (!tipo) return;
		formulario = {
			codigo_trabajo: tipo.codigo,
			falla_reportada: tipo.campos.falla_reportada ?? '',
			solucion_aplicada: tipo.campos.solucion_aplicada ?? '',
			resultado: tipo.campos.resultado ?? '',
			categoria_falla: tipo.campos.categoria_falla ?? ''
		};
	}

	async function guardarCierre() {
		if (otAbierta === null) return;
		guardando = true;
		mensajeCierre = '';
		errorCierre = '';
		try {
			await guardarBorradorCierre(otAbierta, {
				codigo_trabajo: formulario.codigo_trabajo || null,
				falla_reportada: formulario.falla_reportada || null,
				solucion_aplicada: formulario.solucion_aplicada || null,
				resultado: formulario.resultado || null,
				categoria_falla: formulario.categoria_falla || null
			});
			mensajeCierre = 'Cierre preparado. Se aplicará cuando G3 cierre la OT.';
		} catch (err: unknown) {
			errorCierre = err instanceof Error ? err.message : 'No se pudo guardar el cierre preparado';
		} finally {
			guardando = false;
		}
	}

	async function load() {
		loading = true;
		error = '';
		try {
			jornada = await getMiJornada();
			// CU-70: el catálogo es fijo; si falla, el formulario sigue usable (E1).
			tiposTrabajo = await getTiposTrabajo().catch(() => []);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cargar la jornada';
		} finally {
			loading = false;
		}
	}

	onMount(load);

	const estadoTrabajoBadge: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
		PENDIENTE: 'warning',
		EN_CURSO: 'info',
		CERRADO: 'success'
	};

	function fmtFecha(fecha: string | null): string {
		if (!fecha) return '-';
		return new Date(fecha).toLocaleDateString('es-CL', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			timeZone: 'America/Santiago'
		});
	}

	function fmtHora(fecha: string | null): string {
		if (!fecha) return 'Hora por definir';
		return new Date(fecha).toLocaleTimeString('es-CL', {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'America/Santiago'
		});
	}

	const tipoTrabajo = (trabajo: TrabajoDelDia) =>
		trabajo.tipo_ot === 'INSTALACION'
			? 'Instalación'
			: trabajo.tipo_ot === 'REPARACION'
				? 'Reparación'
				: (trabajo.tipo_ot ?? 'Trabajo');
</script>

<!-- CU-70: formulario de preparación del cierre. Lo comparten la tarjeta del trabajo
     del día y la preparación manual de una OT que no está en la lista. -->
{#snippet formularioCierre(idOt: number)}
	<div class="mt-3 space-y-3">
		<div>
			<label class="block text-sm font-medium text-foreground mb-1" for="tipo-{idOt}">Tipo de trabajo</label>
			<select
				id="tipo-{idOt}"
				class="w-full border border-border rounded-md px-3 py-2 text-sm bg-white"
				value={formulario.codigo_trabajo}
				onchange={(e) => aplicarTipo((e.currentTarget as HTMLSelectElement).value)}
			>
				<!-- Excepción 1: ningún código aplica; el técnico completa a mano -->
				<option value="">Sin tipo (completar manualmente)</option>
				{#each tiposAplicables as tipo (tipo.codigo)}
					<option value={tipo.codigo}>{tipo.codigo} · {tipo.nombre}</option>
				{/each}
			</select>
			{#if tipoSeleccionado && tipoSeleccionado.materiales_sugeridos.length > 0}
				<p class="text-xs text-muted mt-1">
					Materiales sugeridos: {tipoSeleccionado.materiales_sugeridos.join(', ')}
				</p>
			{/if}
		</div>

		<div>
			<label class="block text-sm font-medium text-foreground mb-1" for="falla-{idOt}">Falla reportada</label>
			<textarea
				id="falla-{idOt}"
				rows="2"
				class="w-full border border-border rounded-md px-3 py-2 text-sm"
				bind:value={formulario.falla_reportada}
			></textarea>
		</div>

		<div>
			<label class="block text-sm font-medium text-foreground mb-1" for="solucion-{idOt}">Solución aplicada</label>
			<textarea
				id="solucion-{idOt}"
				rows="2"
				class="w-full border border-border rounded-md px-3 py-2 text-sm"
				bind:value={formulario.solucion_aplicada}
			></textarea>
		</div>

		<div class="grid gap-3 sm:grid-cols-2">
			<div>
				<label class="block text-sm font-medium text-foreground mb-1" for="resultado-{idOt}">Resultado</label>
				<select
					id="resultado-{idOt}"
					class="w-full border border-border rounded-md px-3 py-2 text-sm bg-white"
					bind:value={formulario.resultado}
				>
					<option value="">Sin definir</option>
					{#each RESULTADOS as opcion (opcion.valor)}
						<option value={opcion.valor}>{opcion.etiqueta}</option>
					{/each}
				</select>
			</div>
			<div>
				<label class="block text-sm font-medium text-foreground mb-1" for="categoria-{idOt}">Categoría de falla</label>
				<input
					id="categoria-{idOt}"
					type="text"
					class="w-full border border-border rounded-md px-3 py-2 text-sm"
					bind:value={formulario.categoria_falla}
				/>
			</div>
		</div>

		{#if errorCierre}
			<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-3 text-sm">{errorCierre}</div>
		{/if}
		{#if mensajeCierre}
			<div class="bg-green-50 border border-green-200 text-green-800 rounded-md p-3 text-sm">{mensajeCierre}</div>
		{/if}

		<div class="flex flex-wrap gap-2">
			<Button onclick={guardarCierre} disabled={guardando}>
				{guardando ? 'Guardando...' : 'Guardar'}
			</Button>
			{#if tipoSeleccionado}
				<Button variant="secondary" onclick={restaurarPredefinidos}>Restaurar predefinidos</Button>
			{/if}
			<Button variant="secondary" onclick={limpiarFormulario}>Limpiar</Button>
		</div>
		<p class="text-xs text-muted">
			El cierre de la orden lo confirma el sistema de terreno (G3); esto deja preparados los datos del cierre.
		</p>
	</div>
{/snippet}

<div class="max-w-3xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-xl font-bold text-foreground">Mi jornada</h1>
			{#if jornada}
				<p class="text-sm text-muted">{fmtFecha(jornada.fecha)}</p>
			{/if}
		</div>
		<Button variant="secondary" onclick={load}>
			<RotateCw class="h-4 w-4" />
			Actualizar
		</Button>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4">{error}</div>
	{/if}

	{#if loading}
		<div class="bg-white rounded-lg border border-border p-8 text-center text-sm text-muted">Cargando...</div>
	{:else if jornada}
		<!-- (A) Trabajos del día: OTs de G3 -->
		<section class="mb-6">
			<h2 class="text-base font-semibold text-foreground mb-3">Trabajos del día</h2>

			{#if jornada.trabajos_estado === 'NO_DISPONIBLE'}
				<!-- Degradación visible: G3 no responde, el inventario personal igual se muestra -->
				<div class="bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-4 text-sm mb-3">
					No se pudieron obtener los trabajos del día (G3 no responde o no está configurado). Intente actualizar más tarde.
				</div>
			{:else if jornada.trabajos.length === 0}
				<div class="bg-white rounded-lg border border-border">
					<EmptyState message="No tiene trabajos asignados para hoy." />
				</div>
			{:else}
				<div class="space-y-3">
					{#each jornada.trabajos as trabajo (trabajo.id_ot)}
						<div class="bg-white rounded-lg border border-border p-4">
							<div class="flex items-center justify-between gap-2 mb-2">
								<div class="flex items-center gap-2">
									<span class="font-mono text-sm font-semibold text-foreground">OT #{trabajo.id_ot ?? '-'}</span>
									<Badge variant="default">{tipoTrabajo(trabajo)}</Badge>
								</div>
								<Badge variant={estadoTrabajoBadge[trabajo.estado ?? ''] ?? 'default'}>
									{trabajo.estado ?? 'Sin estado'}
								</Badge>
							</div>
							<p class="text-sm font-medium text-foreground">
								{trabajo.cliente.nombre_completo || 'Cliente sin registrar'}
								{#if trabajo.cliente.rut}
									<span class="text-muted">· {trabajo.cliente.rut}</span>
								{/if}
							</p>
							<p class="text-sm text-muted flex items-start gap-1.5 mt-1">
								<MapPin class="h-4 w-4 mt-0.5 shrink-0" />
								<span>
									{trabajo.direccion.direccion || 'Dirección sin registrar'}{trabajo.direccion.comuna ? `, ${trabajo.direccion.comuna}` : ''}
									{#if trabajo.direccion.referencia}
										<span class="block text-xs">Referencia: {trabajo.direccion.referencia}</span>
									{/if}
								</span>
							</p>
							<p class="text-sm text-muted flex items-center gap-1.5 mt-1">
								<Phone class="h-4 w-4 shrink-0" />
								{trabajo.cliente.telefono || 'Teléfono sin registrar'}
							</p>
							<p class="text-xs text-muted mt-2">
								Programada: {fmtHora(trabajo.fecha_programada)}{trabajo.prioridad ? ` · Prioridad: ${trabajo.prioridad}` : ''}
							</p>
							{#if trabajo.observaciones}
								<p class="text-xs text-muted mt-1">{trabajo.observaciones}</p>
							{/if}

							<!-- CU-70: tipo de trabajo codificado que precompleta el cierre -->
							<div class="mt-3 pt-3 border-t border-border">
								<Button variant="secondary" onclick={() => abrirCierre(trabajo.id_ot)}>
									<ClipboardList class="h-4 w-4" />
									{otAbierta === trabajo.id_ot ? 'Cerrar formulario' : 'Preparar cierre'}
								</Button>
								{#if otAbierta !== null && otAbierta === trabajo.id_ot}
									{@render formularioCierre(otAbierta)}
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<!-- CU-70: preparar el cierre de una OT que no está en la lista (G3 sin responder) -->
			<div class="bg-white rounded-lg border border-border p-4 mt-3">
				<h3 class="text-sm font-medium text-foreground mb-2">Preparar el cierre de otra OT</h3>
				<div class="flex flex-wrap items-end gap-2">
					<div>
						<label class="block text-xs text-muted mb-1" for="ot-manual">N° de OT</label>
						<input
							id="ot-manual"
							type="number"
							min="1"
							class="border border-border rounded-md px-3 py-2 text-sm w-32"
							bind:value={otManual}
						/>
					</div>
					<Button variant="secondary" onclick={abrirCierrePorNumero}>
						<ClipboardList class="h-4 w-4" />
						Preparar cierre
					</Button>
				</div>

				{#if otAbierta !== null && !jornada.trabajos.some((t) => t.id_ot === otAbierta)}
					<p class="text-sm font-medium text-foreground mt-3">OT #{otAbierta}</p>
					{@render formularioCierre(otAbierta)}
				{/if}
			</div>
		</section>

		<!-- (B) Inventario personal (CU-58) -->
		<section class="mb-6">
			<h2 class="text-base font-semibold text-foreground mb-3">Mi inventario personal</h2>

			<div class="bg-white rounded-lg border border-border p-4 mb-3">
				<h3 class="text-sm font-medium text-foreground mb-2">Equipos asignados</h3>
				{#if jornada.inventario.ns_asignados.length === 0}
					<p class="text-sm text-muted">No tiene equipos individualizables asignados.</p>
				{:else}
					<ul class="divide-y divide-border">
						{#each jornada.inventario.ns_asignados as equipo (equipo.id_unidad)}
							<li class="py-2 flex items-center justify-between gap-2 text-sm">
								<div>
									<span class="font-mono font-medium text-foreground">{equipo.numero_serie}</span>
									<span class="text-muted"> · {equipo.tipo || 'Tipo sin registrar'}</span>
								</div>
								<Badge variant="info">{equipo.estado}</Badge>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="bg-white rounded-lg border border-border p-4">
				<h3 class="text-sm font-medium text-foreground mb-2">Consumibles</h3>
				{#if jornada.inventario.saldos.length === 0}
					<p class="text-sm text-muted">No tiene saldos de consumibles registrados.</p>
				{:else}
					<ul class="divide-y divide-border">
						{#each jornada.inventario.saldos as saldo (saldo.id_tipo_equipo)}
							<li class="py-2 flex items-center justify-between gap-2 text-sm">
								<span class="text-foreground">{saldo.tipo || `Tipo #${saldo.id_tipo_equipo}`}</span>
								<span class="text-foreground font-medium">
									{saldo.saldo} {saldo.unidad_medida || 'unidades'}
								</span>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</section>
	{/if}
</div>
