<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getPrestamos, getPrestamoDetalle, registrarPrestamo,
		getUnits, getWarehouses, getWarehouseStock
	} from '$lib/api/index';
	import type { PrestamoExterno, PrestamoDetalleCompleto, UnidadEquipo, Bodega } from '$lib/types';
	import Button from '$lib/components/Button.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { Plus, RotateCw, Eye, Trash2 } from '@lucide/svelte';

	// CU-81: registro de préstamos externos de equipos y consumibles
	let prestamos = $state<PrestamoExterno[]>([]);
	let warehouses = $state<Bodega[]>([]);
	let units = $state<UnidadEquipo[]>([]);
	let loading = $state(true);
	let error = $state('');
	let success = $state('');

	let showCreate = $state(false);
	let createForm = $state({
		nombre_receptor: '',
		rut_receptor: '',
		fecha_estimada_retorno: '',
		motivo: '',
		id_bodega_origen: 0,
		numeros_serie: [] as string[],
		consumibles: [] as { id_tipo_equipo: number; cantidad: number }[]
	});
	let serieInput = $state('');
	let createError = $state('');
	let creating = $state(false);

	// Stock de consumibles de la bodega de origen (para agregar por tipo y cantidad)
	let stockBodega = $state<any[]>([]);
	let consumibleSeleccionado = $state(0);
	let cantidadConsumible = $state(1);

	let detalle = $state<PrestamoDetalleCompleto | null>(null);
	let showDetalle = $state(false);
	let loadingDetalle = $state(false);

	const estadoBadge: Record<string, string> = { Activo: 'info', Cerrado: 'default' };
	const hoyISO = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });

	function fmtFecha(fecha: string | null): string {
		if (!fecha) return '-';
		return new Date(fecha).toLocaleDateString('en-GB', {
			day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Santiago'
		});
	}

	// CU-81: unidades disponibles = 'En bodega' en la bodega de origen elegida
	const unidadesDisponibles = $derived(
		units.filter(
			(u) => u.estado === 'En bodega' && (!createForm.id_bodega_origen || u.id_bodega_actual === createForm.id_bodega_origen)
		)
	);

	async function load() {
		loading = true;
		error = '';
		try {
			const [lista, whData, unitsData] = await Promise.all([
				getPrestamos(),
				getWarehouses({ activa: true }),
				getUnits()
			]);
			prestamos = lista;
			warehouses = whData;
			units = unitsData.filter((u: UnidadEquipo) => !u.es_consumible);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cargar los préstamos externos';
		} finally {
			loading = false;
		}
	}

	onMount(load);

	// Al cambiar la bodega de origen se recarga su stock de consumibles
	$effect(() => {
		const idBodega = createForm.id_bodega_origen;
		stockBodega = [];
		consumibleSeleccionado = 0;
		if (idBodega) {
			getWarehouseStock(idBodega)
				.then((s) => (stockBodega = (s ?? []).filter((fila: any) => fila.requiere_serie === false)))
				.catch(() => (stockBodega = []));
		}
	});

	function abrirCreacion() {
		createForm = {
			nombre_receptor: '',
			rut_receptor: '',
			fecha_estimada_retorno: '',
			motivo: '',
			id_bodega_origen: 0,
			numeros_serie: [],
			consumibles: []
		};
		serieInput = '';
		createError = '';
		showCreate = true;
	}

	// CU-81 / CU-59: el NS se valida en vivo contra las unidades disponibles
	function agregarSerie() {
		const ns = serieInput.trim();
		if (!ns) return;
		if (createForm.numeros_serie.includes(ns)) {
			createError = `El equipo [${ns}] ya está en el listado.`;
			return;
		}
		const unidad = units.find((u) => u.numero_serie === ns);
		if (!unidad) {
			createError = 'Número de serie no encontrado.';
			return;
		}
		if (unidad.estado !== 'En bodega') {
			createError = `El equipo [${ns}] no está disponible en esta bodega. Estado actual: [${unidad.estado}].`;
			return;
		}
		createError = '';
		createForm.numeros_serie = [...createForm.numeros_serie, ns];
		serieInput = '';
	}

	function quitarSerie(ns: string) {
		createForm.numeros_serie = createForm.numeros_serie.filter((x) => x !== ns);
	}

	function agregarConsumible() {
		if (!consumibleSeleccionado || cantidadConsumible <= 0) return;
		const fila = stockBodega.find((s) => s.id_tipo_equipo === consumibleSeleccionado);
		if (!fila) return;
		if (cantidadConsumible > Number(fila.cantidad_disponible)) {
			createError = `Stock insuficiente de [${fila.tipo_equipo?.nombre}]: disponible ${fila.cantidad_disponible}.`;
			return;
		}
		createError = '';
		const existente = createForm.consumibles.find((c) => c.id_tipo_equipo === consumibleSeleccionado);
		createForm.consumibles = existente
			? createForm.consumibles.map((c) =>
					c.id_tipo_equipo === consumibleSeleccionado ? { ...c, cantidad: cantidadConsumible } : c
				)
			: [...createForm.consumibles, { id_tipo_equipo: consumibleSeleccionado, cantidad: cantidadConsumible }];
		consumibleSeleccionado = 0;
		cantidadConsumible = 1;
	}

	function quitarConsumible(idTipo: number) {
		createForm.consumibles = createForm.consumibles.filter((c) => c.id_tipo_equipo !== idTipo);
	}

	function nombreConsumible(idTipo: number): string {
		const fila = stockBodega.find((s) => s.id_tipo_equipo === idTipo);
		return fila?.tipo_equipo?.nombre ?? `Tipo #${idTipo}`;
	}

	async function handleCreate() {
		createError = '';
		if (!createForm.id_bodega_origen) {
			createError = 'Debe seleccionar la bodega de origen.';
			return;
		}
		if (createForm.numeros_serie.length === 0 && createForm.consumibles.length === 0) {
			createError = 'Debe agregar al menos un ítem al préstamo.';
			return;
		}
		creating = true;
		try {
			const resultado = await registrarPrestamo({
				nombre_receptor: createForm.nombre_receptor.trim(),
				rut_receptor: createForm.rut_receptor.trim() || undefined,
				fecha_estimada_retorno: createForm.fecha_estimada_retorno,
				motivo: createForm.motivo.trim(),
				id_bodega_origen: createForm.id_bodega_origen,
				numeros_serie: createForm.numeros_serie,
				consumibles: createForm.consumibles
			});
			showCreate = false;
			success = resultado?.message ?? 'Préstamo externo registrado';
			await load();
		} catch (err: unknown) {
			createError = err instanceof Error ? err.message : 'Error al registrar el préstamo';
		} finally {
			creating = false;
		}
	}

	async function verDetalle(id: number) {
		loadingDetalle = true;
		showDetalle = true;
		detalle = null;
		try {
			detalle = await getPrestamoDetalle(id);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cargar el detalle';
			showDetalle = false;
		} finally {
			loadingDetalle = false;
		}
	}
</script>

<div class="max-w-6xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-xl font-bold text-foreground">Préstamos externos</h1>
		<div class="flex items-center gap-3">
			<Button variant="secondary" onclick={load}>
				<RotateCw class="h-4 w-4" />
				Actualizar
			</Button>
			<Button onclick={abrirCreacion}>
				<Plus class="h-4 w-4" />
				Nuevo préstamo externo
			</Button>
		</div>
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
		{:else if prestamos.length === 0}
			<EmptyState message="No hay préstamos externos registrados." action={abrirCreacion} actionlabel="Nuevo préstamo externo" />
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border bg-surface/50">
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">N° préstamo</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Receptor</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Salida</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Retorno estimado</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Ítems</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Estado</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Registrado por</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#each prestamos as p, i}
							<tr class="border-b border-border {i % 2 === 0 ? 'bg-white' : 'bg-surface/30'}">
								<td class="px-4 py-3 font-mono text-foreground">{p.correlativo}</td>
								<td class="px-4 py-3 text-foreground">
									{p.nombre_receptor}
									{#if p.rut_receptor}<span class="text-muted"> · {p.rut_receptor}</span>{/if}
								</td>
								<td class="px-4 py-3 text-muted whitespace-nowrap">{fmtFecha(p.fecha_salida)}</td>
								<td class="px-4 py-3 text-muted whitespace-nowrap">{fmtFecha(p.fecha_estimada_retorno)}</td>
								<td class="px-4 py-3 text-foreground">
									{p.equipos} equipo(s){p.consumibles > 0 ? ` · ${p.consumibles} consumible(s)` : ''}
								</td>
								<td class="px-4 py-3">
									<Badge variant={(estadoBadge[p.estado] ?? 'default') as 'default' | 'info' | 'success' | 'warning' | 'danger'}>
										{p.estado}
									</Badge>
								</td>
								<td class="px-4 py-3 text-muted">{p.registrado_por ?? '-'}</td>
								<td class="px-4 py-3">
									<button onclick={() => verDetalle(p.id_prestamo)}
										class="inline-flex items-center gap-1 text-accent hover:underline" aria-label="Ver detalle">
										<Eye class="h-4 w-4" />
										Ver detalle
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<!-- CU-81: formulario de nuevo préstamo externo -->
<Modal title="Nuevo préstamo externo" open={showCreate} onclose={() => (showCreate = false)}>
	<form onsubmit={(e: Event) => { e.preventDefault(); handleCreate(); }} class="space-y-4">
		{#if createError}
			<div class="bg-red-50 border border-red-200 text-destructive text-sm rounded-md px-3 py-2">{createError}</div>
		{/if}

		<FormField label="Nombre del receptor" name="pe_receptor" required helper="Entre 3 y 80 caracteres">
			<input id="pe_receptor" type="text" required bind:value={createForm.nombre_receptor} maxlength={80}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				placeholder="Ej: Contratista Redes del Sur" />
		</FormField>

		<FormField label="RUT del receptor" name="pe_rut" helper="Opcional, formato XXXXXXXX-X">
			<input id="pe_rut" type="text" bind:value={createForm.rut_receptor} maxlength={12}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				placeholder="76543210-3" />
		</FormField>

		<!-- CU-81: la fecha de salida la registra el sistema automáticamente -->
		<FormField label="Fecha estimada de retorno" name="pe_fecha" required
			helper="Debe ser posterior a la fecha de salida (hoy)">
			<input id="pe_fecha" type="date" required bind:value={createForm.fecha_estimada_retorno} min={hoyISO}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
		</FormField>

		<FormField label="Motivo del préstamo" name="pe_motivo" required
			helper="5-200 caracteres ({createForm.motivo.length}/200)">
			<textarea id="pe_motivo" required bind:value={createForm.motivo} rows="2" maxlength={200}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"></textarea>
		</FormField>

		<FormField label="Bodega de origen" name="pe_bodega" required>
			<select id="pe_bodega" required bind:value={createForm.id_bodega_origen}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
				<option value={0} disabled>Seleccionar...</option>
				{#each warehouses as wh}
					<option value={wh.id_bodega}>{wh.nombre}</option>
				{/each}
			</select>
		</FormField>

		<!-- CU-81: equipos individualizables por número de serie -->
		<FormField label="Equipos por número de serie" name="pe_ns"
			helper={`${unidadesDisponibles.length} disponible(s) en la bodega seleccionada`}>
			<div class="flex gap-2">
				<select bind:value={serieInput} aria-label="Número de serie"
					class="flex-1 px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
					<option value="">Seleccionar equipo...</option>
					{#each unidadesDisponibles.filter((u) => !createForm.numeros_serie.includes(u.numero_serie)) as u}
						<option value={u.numero_serie}>{u.numero_serie} · {u.tipo_equipo?.nombre ?? ''}</option>
					{/each}
				</select>
				<Button variant="secondary" type="button" onclick={agregarSerie}>Agregar</Button>
			</div>
		</FormField>

		{#if createForm.numeros_serie.length > 0}
			<div class="border border-border rounded-md divide-y divide-border">
				{#each createForm.numeros_serie as ns}
					<div class="flex items-center justify-between px-3 py-2 text-sm">
						<span class="font-mono text-foreground">{ns}</span>
						<button type="button" onclick={() => quitarSerie(ns)} class="text-destructive hover:text-destructive-hover" aria-label="Quitar equipo">
							<Trash2 class="h-4 w-4" />
						</button>
					</div>
				{/each}
			</div>
		{/if}

		<!-- CU-81: consumibles por tipo y cantidad, con saldo de la bodega -->
		<FormField label="Consumibles" name="pe_cons" helper="Opcional, se descuentan del stock de la bodega">
			<div class="flex gap-2">
				<select bind:value={consumibleSeleccionado} aria-label="Consumible"
					class="flex-1 px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
					<option value={0}>Seleccionar consumible...</option>
					{#each stockBodega as fila}
						<option value={fila.id_tipo_equipo}>
							{fila.tipo_equipo?.nombre} (disponible: {fila.cantidad_disponible}{fila.unidad_medida ? ` ${fila.unidad_medida}` : ''})
						</option>
					{/each}
				</select>
				<input type="number" min="1" bind:value={cantidadConsumible} aria-label="Cantidad"
					class="w-24 px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
				<Button variant="secondary" type="button" onclick={agregarConsumible}>Agregar</Button>
			</div>
		</FormField>

		{#if createForm.consumibles.length > 0}
			<div class="border border-border rounded-md divide-y divide-border">
				{#each createForm.consumibles as c}
					<div class="flex items-center justify-between px-3 py-2 text-sm">
						<span class="text-foreground">{nombreConsumible(c.id_tipo_equipo)} · {c.cantidad}</span>
						<button type="button" onclick={() => quitarConsumible(c.id_tipo_equipo)} class="text-destructive hover:text-destructive-hover" aria-label="Quitar consumible">
							<Trash2 class="h-4 w-4" />
						</button>
					</div>
				{/each}
			</div>
		{/if}

		<div class="flex justify-end gap-3 pt-2">
			<Button variant="secondary" onclick={() => (showCreate = false)} type="button">Cancelar</Button>
			<Button type="submit" loading={creating}>Registrar préstamo</Button>
		</div>
	</form>
</Modal>

<!-- CU-81: detalle del préstamo con sus ítems -->
<Modal title="Detalle del préstamo" open={showDetalle} onclose={() => (showDetalle = false)}>
	{#if loadingDetalle}
		<p class="text-sm text-muted">Cargando...</p>
	{:else if detalle}
		<div class="space-y-4">
			<div class="grid grid-cols-2 gap-3 text-sm">
				<div><span class="text-muted">N° préstamo:</span> <span class="font-mono text-foreground">{detalle.correlativo}</span></div>
				<div><span class="text-muted">Estado:</span> <span class="text-foreground">{detalle.estado}</span></div>
				<div><span class="text-muted">Receptor:</span> <span class="text-foreground">{detalle.nombre_receptor}</span></div>
				<div><span class="text-muted">RUT:</span> <span class="text-foreground">{detalle.rut_receptor ?? '-'}</span></div>
				<div><span class="text-muted">Fecha de salida:</span> <span class="text-foreground">{fmtFecha(detalle.fecha_salida)}</span></div>
				<div><span class="text-muted">Retorno estimado:</span> <span class="text-foreground">{fmtFecha(detalle.fecha_estimada_retorno)}</span></div>
				<div><span class="text-muted">Bodega de origen:</span> <span class="text-foreground">{detalle.bodega_origen ?? '-'}</span></div>
				<div><span class="text-muted">Registrado por:</span> <span class="text-foreground">{detalle.registrado_por ?? '-'}</span></div>
				<div class="col-span-2"><span class="text-muted">Motivo:</span> <span class="text-foreground">{detalle.motivo}</span></div>
			</div>

			<div class="border border-border rounded-md divide-y divide-border">
				{#each detalle.items as item}
					<div class="px-3 py-2 text-sm flex items-center justify-between">
						<div>
							{#if item.es_consumible}
								<span class="text-foreground">{item.tipo_equipo ?? '-'}</span>
								<span class="text-muted"> · {item.cantidad}{item.unidad_medida ? ` ${item.unidad_medida}` : ''}</span>
							{:else}
								<span class="font-mono text-foreground">{item.numero_serie}</span>
								<span class="text-muted"> · {item.tipo_equipo ?? '-'} {item.marca ?? ''} {item.modelo ?? ''}</span>
							{/if}
						</div>
						{#if item.estado_unidad}
							<Badge variant="info">{item.estado_unidad}</Badge>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</Modal>
