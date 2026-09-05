<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { getOrdenIngreso, registrarRecepcionOrden } from '$lib/api/index';
	import type { OrdenIngreso } from '$lib/types';
	import { userRoles } from '$lib/stores/auth';
	import Button from '$lib/components/Button.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import { ArrowLeft, PackageCheck, Plus, Trash2 } from '@lucide/svelte';

	let orden = $state<OrdenIngreso | null>(null);
	let loading = $state(true);
	let error = $state('');
	let success = $state('');

	// CU-54: modal de recepción. `cantidades` guarda lo recibido en ESTA instancia por ítem.
	let showRecepcion = $state(false);
	let cantidades = $state<Record<number, number>>({});
	let recepcionError = $state('');
	let guardando = $state(false);

	// CU-55: NS confirmados por ítem, el que se está escribiendo y su error de validación
	let series = $state<Record<number, string[]>>({});
	let serieBorrador = $state<Record<number, string>>({});
	let serieError = $state<Record<number, string>>({});

	// CU-56: fecha de recepción efectiva, obligatoria y no futura
	let fechaRecepcion = $state('');
	const hoyISO = new Date().toISOString().slice(0, 10);
	// CU-56 Excepción 1: sin fecha no se puede confirmar. Excepción 2: no puede ser futura.
	const fechaRecepcionValida = $derived(!!fechaRecepcion && fechaRecepcion <= hoyISO);
	const avisoFecha = $derived(
		!fechaRecepcion
			? 'Debe indicar la fecha de recepción efectiva.'
			: fechaRecepcion > hoyISO
				? 'La fecha de recepción no puede ser futura.'
				: ''
	);

	// CU-54: los tres actores del CU pueden registrar la recepción, y solo se admite
	// sobre órdenes en 'Pendiente de recepción' o 'Recepción parcial'
	const puedeRecibir = $derived(
		$userRoles.some((r) => ['SUPERUSUARIO', 'ADMIN', 'ADMIN_BODEGA'].includes(r)) &&
			orden !== null &&
			orden.estado !== 'Completada'
	);

	// CU-53: badge por estado, mismo patrón que /transferencias
	const estadoBadge: Record<string, string> = {
		'Pendiente de recepción': 'warning',
		'Recepción parcial': 'info',
		Completada: 'success'
	};

	// CU-53: fecha del documento en DD/MM/YYYY (DATE sin hora, se parte el string
	// para no correr un día por zona horaria)
	function fmtFecha(fecha: string): string {
		if (!fecha) return '—';
		const [y, m, d] = fecha.slice(0, 10).split('-');
		return d && m && y ? `${d}/${m}/${y}` : fecha;
	}

	// CU-53: totales de la orden (esperado vs recibido)
	const totalEsperado = $derived((orden?.detalles ?? []).reduce((acc, d) => acc + (d.cantidad_esperada ?? 0), 0));
	const totalRecibido = $derived((orden?.detalles ?? []).reduce((acc, d) => acc + (d.cantidad_recibida ?? 0), 0));

	async function load() {
		loading = true;
		error = '';
		try {
			// CU-53: el backend devuelve 404 genérico si la orden no es de la empresa del actor
			orden = await getOrdenIngreso(Number($page.params.id));
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cargar la orden de ingreso';
		} finally {
			loading = false;
		}
	}

	onMount(load);

	// CU-54: pendiente por recibir de un ítem
	function pendiente(d: { cantidad_esperada: number; cantidad_recibida: number }): number {
		return d.cantidad_esperada - d.cantidad_recibida;
	}

	// CU-55: mismo formato de NS que CU-28 (`validarFormatoSerialNumber` en el backend).
	// Se replica aquí para validar en vivo; el backend sigue siendo la validación real.
	const SERIE_REGEX = /^[A-Z0-9-]{4,30}$/;
	const MSG_FORMATO_SERIE =
		'El formato del número de serie es inválido. Debe contener entre 4 y 30 caracteres alfanuméricos y guiones. No se permiten espacios ni caracteres especiales.';

	function abrirRecepcion() {
		cantidades = {};
		series = {};
		serieBorrador = {};
		serieError = {};
		for (const d of orden?.detalles ?? []) {
			cantidades[d.id_detalle] = 0;
			series[d.id_detalle] = [];
			serieBorrador[d.id_detalle] = '';
		}
		// CU-56: por defecto la fecha de hoy, pero el actor puede corregirla
		fechaRecepcion = hoyISO;
		recepcionError = '';
		success = '';
		showRecepcion = true;
	}

	// CU-55: agrega un NS al ítem validando formato y duplicados en vivo
	function agregarSerie(idDetalle: number) {
		const valor = (serieBorrador[idDetalle] ?? '').trim();
		serieError[idDetalle] = '';
		if (!valor) return;
		// CU-55 Excepción 1
		if (!SERIE_REGEX.test(valor)) {
			serieError[idDetalle] = MSG_FORMATO_SERIE;
			return;
		}
		// CU-55 Excepción 2 (parte cliente): repetido en lo ya ingresado de cualquier ítem
		const yaIngresados = Object.values(series).flat();
		if (yaIngresados.includes(valor)) {
			serieError[idDetalle] = `El número de serie [${valor}] ya se encuentra registrado en el sistema.`;
			return;
		}
		if (series[idDetalle].length >= (cantidades[idDetalle] ?? 0)) {
			serieError[idDetalle] = 'Ya ingresó todos los números de serie para la cantidad indicada.';
			return;
		}
		series[idDetalle] = [...series[idDetalle], valor];
		serieBorrador[idDetalle] = '';
	}

	function quitarSerie(idDetalle: number, indice: number) {
		series[idDetalle] = series[idDetalle].filter((_, i) => i !== indice);
	}

	// CU-55 Excepción 3: no se confirma mientras la cantidad de NS no calce con la recibida.
	// Puede fallar por defecto (faltan) o por exceso, si el actor baja la cantidad después
	// de haber ingresado NS; el aviso distingue ambos casos para no confundir.
	const desajusteSeries = $derived(
		(orden?.detalles ?? [])
			.filter((d) => d.requiere_serie_individual)
			.map((d) => (series[d.id_detalle]?.length ?? 0) - (cantidades[d.id_detalle] ?? 0))
			.find((diff) => diff !== 0) ?? 0
	);
	const seriesCompletas = $derived(desajusteSeries === 0);
	const avisoSeries = $derived(
		desajusteSeries === 0
			? ''
			: desajusteSeries > 0
				? 'Sobran números de serie para la cantidad indicada. Quite los que no correspondan.'
				: 'Faltan números de serie por ingresar.'
	);

	async function guardarRecepcion() {
		recepcionError = '';
		// CU-55: los ítems individualizables envían además sus números de serie
		const items = (orden?.detalles ?? []).map((d) => ({
			id_detalle: d.id_detalle,
			cantidad_recibida: Number(cantidades[d.id_detalle] ?? 0),
			...(d.requiere_serie_individual ? { numeros_serie: series[d.id_detalle] ?? [] } : {})
		}));

		// CU-54 Excepción 1: la cantidad no puede superar el pendiente del ítem.
		// El backend revalida lo mismo antes de escribir nada.
		for (const item of items) {
			const d = (orden?.detalles ?? []).find((x) => x.id_detalle === item.id_detalle)!;
			if (!Number.isInteger(item.cantidad_recibida) || item.cantidad_recibida < 0) {
				recepcionError = 'La cantidad recibida debe ser un número entero mayor o igual a 0.';
				return;
			}
			if (item.cantidad_recibida > pendiente(d)) {
				recepcionError = 'La cantidad no puede superar la cantidad pendiente del ítem.';
				return;
			}
		}
		if (items.every((i) => i.cantidad_recibida === 0)) {
			recepcionError = 'Debe indicar al menos una cantidad recibida para registrar la recepción.';
			return;
		}
		// CU-55 Excepción 3: refuerzo por si el botón se habilitó con datos a medias
		if (!seriesCompletas) {
			recepcionError = avisoSeries;
			return;
		}
		// CU-56 Excepciones 1 y 2: fecha obligatoria y no futura (el backend la revalida
		// contra su propio reloj, que es la referencia real)
		if (!fechaRecepcionValida) {
			recepcionError = avisoFecha;
			return;
		}

		guardando = true;
		try {
			const actualizada = await registrarRecepcionOrden(
				Number($page.params.id),
				fechaRecepcion,
				items
			);
			orden = actualizada;
			showRecepcion = false;
			// CU-54 poscondición: la orden queda con las cantidades recibidas y su nuevo estado
			success = `Recepción registrada. La orden quedó en estado "${actualizada.estado}".`;
			setTimeout(() => (success = ''), 5000);
		} catch (err: unknown) {
			recepcionError = err instanceof Error ? err.message : 'Error al registrar la recepción';
		} finally {
			guardando = false;
		}
	}
</script>

<div class="max-w-5xl mx-auto">
	<button onclick={() => goto('/ordenes-ingreso')}
		class="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-4">
		<ArrowLeft class="h-4 w-4" />
		Volver a órdenes de ingreso
	</button>

	{#if loading}
		<div class="bg-white rounded-lg border border-border p-6 animate-pulse space-y-4">
			<div class="h-6 w-48 bg-surface-alt rounded"></div>
			<div class="h-4 w-full bg-surface-alt rounded"></div>
		</div>
	{:else if error}
		<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm">{error}</div>
	{:else if !orden}
		<div class="bg-white rounded-lg border border-border p-8 text-center text-sm text-muted">
			Orden de ingreso no encontrada
		</div>
	{:else}
		{#if success}
			<div class="bg-green-50 border border-green-200 text-green-800 rounded-md p-4 text-sm mb-4">{success}</div>
		{/if}

		<!-- CU-53: cabecera de la orden -->
		<div class="bg-white rounded-lg border border-border p-6 mb-4">
			<div class="flex items-center justify-between mb-4">
				<div>
					<h1 class="text-lg font-semibold text-foreground font-mono">{orden.correlativo}</h1>
					<p class="text-sm text-muted">Orden de ingreso desde proveedor</p>
				</div>
				<div class="flex items-center gap-3">
					<Badge variant={(estadoBadge[orden.estado] ?? 'default') as 'default' | 'info' | 'success' | 'warning' | 'danger'}>
						{orden.estado}
					</Badge>
					<!-- CU-54: solo se recibe sobre 'Pendiente de recepción' o 'Recepción parcial' -->
					<Button size="sm" onclick={abrirRecepcion} disabled={!puedeRecibir}
						title={orden.estado === 'Completada' ? 'La orden ya está completada' : 'Registrar recepción'}>
						<PackageCheck class="h-4 w-4" />
						Registrar recepción
					</Button>
				</div>
			</div>

			<!-- CU-53: cabecera de la orden (columnas del listado + N.o de documento) -->
			<div class="grid grid-cols-2 gap-4 text-sm">
				<div>
					<span class="text-muted">Proveedor:</span>
					<p class="text-foreground font-medium">{orden.nombre_proveedor ?? '-'}</p>
				</div>
				<div>
					<span class="text-muted">N.o documento:</span>
					<p class="text-foreground font-mono">{orden.numero_documento}</p>
				</div>
				<div>
					<span class="text-muted">Fecha del documento:</span>
					<p class="text-foreground">{fmtFecha(orden.fecha_documento)}</p>
				</div>
				<div>
					<span class="text-muted">Empresa destinataria:</span>
					<p class="text-foreground">{orden.nombre_empresa ?? '-'}</p>
				</div>
				<div>
					<span class="text-muted">Bodega de destino:</span>
					<p class="text-foreground">{orden.nombre_bodega ?? '-'}</p>
				</div>
				<div>
					<span class="text-muted">Total de ítems:</span>
					<p class="text-foreground font-medium">{orden.detalles?.length ?? 0}</p>
				</div>
			</div>
		</div>

		<!-- CU-53: ítems con cantidades esperadas y recibidas actualizadas -->
		<div class="bg-white rounded-lg border border-border">
			<div class="px-6 py-4 border-b border-border">
				<h2 class="text-base font-semibold text-foreground">Ítems de la orden</h2>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border bg-surface/50">
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Tipo de equipo</th>
							<th class="text-right px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Cant. esperada</th>
							<th class="text-right px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Cant. recibida</th>
							<th class="text-right px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Pendiente</th>
							<th class="text-right px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Garantía (días)</th>
						</tr>
					</thead>
					<tbody>
						{#each orden.detalles ?? [] as d, i}
							<tr class="border-b border-border {i % 2 === 0 ? 'bg-white' : 'bg-surface/30'}">
								<td class="px-4 py-3 text-foreground">{d.nombre_tipo_equipo ?? `ID ${d.id_tipo_equipo}`}</td>
								<td class="px-4 py-3 text-right text-muted">{d.cantidad_esperada}</td>
								<td class="px-4 py-3 text-right text-muted">{d.cantidad_recibida}</td>
								<td class="px-4 py-3 text-right text-muted">{d.cantidad_esperada - d.cantidad_recibida}</td>
								<td class="px-4 py-3 text-right text-muted">{d.garantia_dias}</td>
							</tr>
						{/each}
					</tbody>
					<tfoot>
						<tr class="bg-surface/50 font-medium">
							<td class="px-4 py-3 text-foreground">Total</td>
							<td class="px-4 py-3 text-right text-foreground">{totalEsperado}</td>
							<td class="px-4 py-3 text-right text-foreground">{totalRecibido}</td>
							<td class="px-4 py-3 text-right text-foreground">{totalEsperado - totalRecibido}</td>
							<td class="px-4 py-3"></td>
						</tr>
					</tfoot>
				</table>
			</div>
		</div>
	{/if}
</div>

<!-- CU-54: modal de registro de recepción total o parcial -->
<Modal title="Registrar recepción" open={showRecepcion} onclose={() => (showRecepcion = false)}>
	<!-- `novalidate`: con la validación nativa activa el navegador bloquea el submit por el
	     `max` del input y muestra SU tooltip, tapando el mensaje exacto que exige la
	     Excepción 1 del CU. El `max` se conserva para acotar las flechas del spinner. -->
	<form onsubmit={(e: Event) => { e.preventDefault(); guardarRecepcion(); }} class="space-y-4" novalidate>
		{#if recepcionError}
			<!-- CU-54 Excepción 1: se muestra el error y no se registra la recepción -->
			<div class="bg-red-50 border border-red-200 text-destructive text-sm rounded-md px-3 py-2">{recepcionError}</div>
		{/if}

		<p class="text-sm text-muted">
			Indique la cantidad recibida <strong>en esta instancia</strong> para cada ítem.
			El máximo es la cantidad pendiente.
		</p>

		<!-- CU-56: fecha de recepción efectiva. Es la que queda como fecha de adquisición de
		     las unidades y la base del cálculo de garantía; la fecha del documento del
		     proveedor se conserva aparte en la orden. -->
		<FormField label="Fecha de recepción efectiva" name="fecharec" required
			helper="No puede ser futura. Es la base del cálculo de garantía de cada unidad."
			error={fechaRecepcion && !fechaRecepcionValida ? avisoFecha : ''}>
			<input id="fecharec" type="date" bind:value={fechaRecepcion} max={hoyISO}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
		</FormField>

		{#if orden && fechaRecepcion && fechaRecepcion !== orden.fecha_documento.slice(0, 10)}
			<!-- CU-56: si difiere de la fecha del documento, ambas quedan registradas -->
			<div class="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-md px-3 py-2">
				La fecha de recepción difiere de la del documento del proveedor
				({fmtFecha(orden.fecha_documento)}). Ambas quedan registradas: la del documento en la
				orden y esta en cada unidad recibida.
			</div>
		{/if}

		<div class="space-y-3">
			{#each orden?.detalles ?? [] as d}
				<div class="border border-border rounded-md p-3 bg-surface/30 space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium text-foreground">{d.nombre_tipo_equipo ?? `ID ${d.id_tipo_equipo}`}</span>
						<span class="text-xs text-muted">esperada {d.cantidad_esperada} · recibida {d.cantidad_recibida}</span>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
						<div>
							<label for="rec_{d.id_detalle}" class="block text-xs font-medium text-muted mb-1">Recibida ahora</label>
							<input id="rec_{d.id_detalle}" type="number" bind:value={cantidades[d.id_detalle]}
								min={0} max={pendiente(d)} disabled={pendiente(d) === 0}
								class="w-full px-2 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
						</div>
						<div class="sm:col-span-2 flex items-end">
							<span class="text-xs text-muted pb-2">
								{pendiente(d) === 0 ? 'Ítem ya completo' : `Pendiente por recibir: ${pendiente(d)}`}
							</span>
						</div>
					</div>

					<!-- CU-55: los ítems individualizables piden un NS por unidad recibida.
					     Los consumibles no muestran esta sección (solo suman cantidad). -->
					{#if d.requiere_serie_individual && (cantidades[d.id_detalle] ?? 0) > 0}
						<div class="border-t border-border pt-2 space-y-2">
							<div class="flex items-center justify-between">
								<span class="text-xs font-medium text-muted">Números de serie</span>
								<span class="text-xs {(series[d.id_detalle]?.length ?? 0) === cantidades[d.id_detalle] ? 'text-green-700' : 'text-muted'}">
									{series[d.id_detalle]?.length ?? 0} / {cantidades[d.id_detalle]} ingresados
								</span>
							</div>

							{#if serieError[d.id_detalle]}
								<!-- CU-55 Excepciones 1 y 2: formato inválido o NS repetido -->
								<div class="bg-red-50 border border-red-200 text-destructive text-xs rounded-md px-2 py-1.5">
									{serieError[d.id_detalle]}
								</div>
							{/if}

							<div class="flex items-center gap-2">
								<input type="text" bind:value={serieBorrador[d.id_detalle]} maxlength={30}
									placeholder="Ej: ABC-12345"
									onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); agregarSerie(d.id_detalle); } }}
									class="flex-1 px-2 py-1.5 border border-border rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary" />
								<Button type="button" variant="secondary" size="sm" onclick={() => agregarSerie(d.id_detalle)}>
									<Plus class="h-3 w-3" />
									Agregar
								</Button>
							</div>

							{#if (series[d.id_detalle]?.length ?? 0) > 0}
								<div class="space-y-1">
									{#each series[d.id_detalle] as ns, idx}
										<div class="flex items-center justify-between bg-white border border-border rounded px-2 py-1">
											<span class="text-xs font-mono text-foreground">{ns}</span>
											<button type="button" onclick={() => quitarSerie(d.id_detalle, idx)}
												title="Quitar número de serie"
												class="text-destructive hover:text-destructive/80 transition-colors">
												<Trash2 class="h-3.5 w-3.5" />
											</button>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<div class="flex justify-end gap-3 pt-2">
			<Button variant="secondary" onclick={() => (showRecepcion = false)} type="button">Cancelar</Button>
			<!-- CU-55 Excepción 3: no se puede confirmar mientras falten NS por ingresar -->
			<!-- CU-55 Exc. 3 y CU-56 Exc. 1: no se confirma sin todos los NS ni sin fecha -->
			<Button type="submit" loading={guardando} disabled={!seriesCompletas || !fechaRecepcionValida}
				title={seriesCompletas ? (fechaRecepcionValida ? 'Guardar recepción' : avisoFecha) : avisoSeries}>
				Guardar recepción
			</Button>
		</div>
	</form>
</Modal>
