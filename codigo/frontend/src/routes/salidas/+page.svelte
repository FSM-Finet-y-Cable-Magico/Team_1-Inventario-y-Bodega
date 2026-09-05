<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { getUsers, getWarehouses, getCatalog, getUnits, getWarehouseStock, crearSalida, listarSalidas, getInventarioTecnico } from '$lib/api/index';
	import { userRoles } from '$lib/stores/auth';
	import type { Usuario, Bodega, TipoEquipo, SalidaResumen, InventarioTecnico, VerificacionSerie, ItemSalida } from '$lib/types';
	import Button from '$lib/components/Button.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import { X } from '@lucide/svelte';

	const roles = $derived($userRoles);
	const puedeRegistrar = $derived(roles.some((r) => ['SUPERUSUARIO', 'ADMIN', 'ADMIN_BODEGA'].includes(r)));

	let tecnicos = $state<Usuario[]>([]);
	let warehouses = $state<Bodega[]>([]);
	let catalogo = $state<TipoEquipo[]>([]);
	let salidas = $state<SalidaResumen[]>([]);
	let inventario = $state<InventarioTecnico | null>(null);
	// Unidades 'En bodega' y saldos de stock de la bodega elegida (para el dropdown
	// de equipos y el saldo en vivo del consumible)
	let unidadesEnBodega = $state<{ numero_serie: string; id_bodega_actual: number | null; tipo: string | null }[]>([]);
	let saldosBodega = $state<Record<number, { saldo: number; unidad: string | null }>>({});
	// Filtros del dropdown de equipos (bodegas con cientos de unidades)
	let busquedaSerie = $state('');
	let filtroTipo = $state('');
	let loading = $state(true);
	let error = $state('');
	let success = $state('');
	let enviando = $state(false);

	// CU-57: formulario de salida (mixta: equipos NS + consumibles)
	let form = $state({ id_tecnico: 0, id_bodega_origen: 0 });
	// CU-59: cada NS sale del listado de unidades disponibles de la bodega elegida;
	// solo se pueden agregar equipos que están 'En bodega' en esa bodega
	let seriesItems = $state<{ serie: string; verificacion: VerificacionSerie }[]>([]);
	let serieSeleccion = $state('');
	// CU-60: consumibles (tipo + cantidad con hasta 2 decimales)
	let consumiblesItems = $state<{ id_tipo_equipo: number; cantidad: number }[]>([]);
	let consumibleTipo = $state(0);
	let consumibleCantidad = $state<number | ''>('');

	const consumiblesCatalogo = $derived(catalogo.filter((t) => t.requiereSerialNumber === false));
	// CU-59: el dropdown solo ofrece unidades 'En bodega' en la bodega elegida que
	// aún no estén agregadas, con búsqueda por serie y filtro por tipo de equipo
	const equiposEnBodegaElegida = $derived(
		unidadesEnBodega.filter((u) => u.id_bodega_actual === form.id_bodega_origen)
	);
	const tiposDisponibles = $derived(
		[...new Set(equiposEnBodegaElegida.map((u) => u.tipo).filter(Boolean) as string[])].sort()
	);
	const seriesDisponibles = $derived(
		equiposEnBodegaElegida
			.filter((u) => !seriesItems.some((s) => s.serie.toLowerCase() === u.numero_serie.toLowerCase()))
			.filter((u) => filtroTipo === '' || u.tipo === filtroTipo)
			.filter((u) => {
				const q = busquedaSerie.trim().toLowerCase();
				return q === '' || u.numero_serie.toLowerCase().includes(q);
			})
			.map((u) => u.numero_serie)
	);
	const itemsVacios = $derived(seriesItems.length === 0 && consumiblesItems.length === 0);
	const puedeConfirmar = $derived(puedeRegistrar && form.id_tecnico > 0 && form.id_bodega_origen > 0 && !itemsVacios && !enviando);

	// CU-58/CU-33: formato de fecha DD/MM/YYYY HH:MM
	function fmtFechaHora(fecha: string | null | undefined): string {
		if (!fecha) return '-';
		return new Date(fecha).toLocaleString('es-CL', {
			day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
		}).replace(',', '');
	}

	async function load() {
		loading = true;
		error = '';
		try {
			const [tecData, whData, catData, salData, unitsData] = await Promise.all([
				getUsers({ activo: true, rol: 'TECNICO_TERRENO' }),
				getWarehouses({ activa: true }),
				getCatalog({ activo: true }),
				listarSalidas().catch(() => []),
				getUnits({ estado: 'En bodega' })
			]);
			tecnicos = tecData;
			warehouses = whData;
			catalogo = catData;
			salidas = salData;
			// Solo equipos individualizables (los consumibles van por cantidad)
			unidadesEnBodega = unitsData.filter((u: any) => !u.es_consumible)
				.map((u: any) => ({
					numero_serie: u.numero_serie,
					id_bodega_actual: u.id_bodega_actual,
					tipo: u.tipo_equipo?.nombre ?? null
				}));
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cargar datos';
		} finally {
			loading = false;
		}
	}

	onMount(load);

	// CU-59: el NS se elige del dropdown de disponibles de la bodega (sin tipear);
	// la validación de verdad la re-ejecuta el backend en la transacción de la salida
	function agregarSerie() {
		const serie = serieSeleccion.trim();
		error = '';
		if (!serie) return;
		if (seriesItems.some((s) => s.serie.toLowerCase() === serie.toLowerCase())) {
			error = `El equipo [${serie}] está repetido en la salida.`;
			serieSeleccion = '';
			return;
		}
		seriesItems = [...seriesItems, {
			serie,
			verificacion: { existe: true, numero_serie: serie, estado: 'En bodega', id_bodega_actual: form.id_bodega_origen, disponible: true }
		}];
		serieSeleccion = '';
	}

	// CU-59/CU-60: si cambia la bodega de origen, las selecciones y saldos pierden
	// vigencia y se recargan los del nuevo origen
	async function cambiarBodega() {
		seriesItems = [];
		consumibleTipo = 0;
		consumibleCantidad = '';
		saldosBodega = {};
		if (form.id_bodega_origen) {
			try {
				const stock = await getWarehouseStock(form.id_bodega_origen);
				const mapa: Record<number, { saldo: number; unidad: string | null }> = {};
				for (const s of stock as any[]) {
					mapa[s.id_tipo_equipo] = {
						saldo: Number(s.cantidad_disponible ?? 0),
						unidad: s.unidad_medida ?? null
					};
				}
				saldosBodega = mapa;
			} catch {
				saldosBodega = {};
			}
		}
	}

	function agregarConsumible() {
		error = '';
		const cantidad = Number(consumibleCantidad);
		if (!consumibleTipo) return;
		if (!Number.isFinite(cantidad) || cantidad <= 0) {
			error = 'La cantidad debe ser mayor a cero.';
			return;
		}
		const existente = consumiblesItems.find((c) => c.id_tipo_equipo === consumibleTipo);
		if (existente) {
			consumiblesItems = consumiblesItems.map((c) =>
				c.id_tipo_equipo === consumibleTipo ? { ...c, cantidad: Number((c.cantidad + cantidad).toFixed(2)) } : c
			);
		} else {
			consumiblesItems = [...consumiblesItems, { id_tipo_equipo: consumibleTipo, cantidad: Number(cantidad.toFixed(2)) }];
		}
		consumibleTipo = 0;
		consumibleCantidad = '';
	}

	function quitarConsumible(idTipoEquipo: number) {
		consumiblesItems = consumiblesItems.filter((c) => c.id_tipo_equipo !== idTipoEquipo);
	}

	function construirItems(): ItemSalida[] {
		const items: ItemSalida[] = seriesItems.map((s) => ({ tipo: 'UNIDAD', numero_serie: s.serie }));
		for (const c of consumiblesItems) {
			items.push({ tipo: 'CONSUMIBLE', id_tipo_equipo: c.id_tipo_equipo, cantidad: c.cantidad });
		}
		return items;
	}

	async function confirmarSalida() {
		error = '';
		success = '';
		enviando = true;
		try {
			const res = await crearSalida({
				id_tecnico: form.id_tecnico,
				id_bodega_origen: form.id_bodega_origen,
				items: construirItems()
			});
			success = res.message;
			seriesItems = [];
			consumiblesItems = [];
			await Promise.all([listarSalidas().then((s) => (salidas = s)), cargarInventario()]);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al registrar la salida';
		} finally {
			enviando = false;
		}
	}

	// CU-58: inventario personal del técnico seleccionado (NS + saldos)
	async function cargarInventario() {
		if (!form.id_tecnico) {
			inventario = null;
			return;
		}
		try {
			inventario = await getInventarioTecnico(form.id_tecnico);
		} catch {
			inventario = null;
		}
	}
</script>

<div class="max-w-6xl mx-auto">
	<div class="flex items-center justify-between mb-4">
		<div>
			<h1 class="text-lg font-semibold text-foreground">Salidas de bodega a técnico</h1>
			<p class="text-sm text-muted">Asignación de equipos y consumibles al inventario personal del técnico</p>
		</div>
	</div>

	{#if loading}
		<div class="bg-white rounded-lg border border-border p-6 animate-pulse space-y-4">
			<div class="h-6 w-48 bg-surface-alt rounded"></div>
			<div class="h-4 w-full bg-surface-alt rounded"></div>
		</div>
	{:else}
		{#if error}
			<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4">{error}</div>
		{/if}
		{#if success}
			<div class="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md p-4 text-sm mb-4">{success}</div>
		{/if}

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<div class="lg:col-span-2 space-y-6">
				<!-- CU-57: formulario de salida -->
				<div class="bg-white rounded-lg border border-border p-6">
					<h2 class="text-base font-semibold text-foreground mb-4">Nueva salida</h2>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
						<FormField label="Técnico destinatario" name="sal_tec" required>
							<select id="sal_tec" bind:value={form.id_tecnico} onchange={cargarInventario}
								class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
								<option value={0} disabled>Seleccionar técnico...</option>
								{#each tecnicos as t}
									<option value={t.id_usuario}>{t.nombre_completo}</option>
								{/each}
							</select>
						</FormField>
						<FormField label="Bodega de origen" name="sal_bod" required>
							<select id="sal_bod" bind:value={form.id_bodega_origen} onchange={cambiarBodega}
								class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
								<option value={0} disabled>Seleccionar bodega...</option>
								{#each warehouses as wh}
									<option value={wh.id_bodega}>{wh.nombre}</option>
								{/each}
							</select>
						</FormField>
					</div>

					<!-- CU-59: los equipos se eligen del dropdown de unidades disponibles
					     en la bodega elegida, con búsqueda por serie y filtro por tipo -->
					<div class="mb-6">
						<p class="text-sm font-medium text-foreground mb-2">Equipos (número de serie)</p>
						{#if !form.id_bodega_origen}
							<p class="text-xs text-muted mb-2">Seleccione primero la bodega de origen.</p>
						{:else}
							<p class="text-xs text-muted mb-2">
								{seriesDisponibles.length} de {equiposEnBodegaElegida.length} equipo(s) disponible(s) en esta bodega.
							</p>
						{/if}
						{#if form.id_bodega_origen && equiposEnBodegaElegida.length > 0}
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
								<FormField label="Buscar por serie" name="sal_buscar">
									<input id="sal_buscar" type="text" bind:value={busquedaSerie} maxlength={80}
										placeholder="Ej: ONT, SAL-TEST…"
										class="w-full px-3 py-2 border border-border rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary" />
								</FormField>
								<FormField label="Filtrar por tipo" name="sal_filtro">
									<select id="sal_filtro" bind:value={filtroTipo}
										class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
										<option value="">Todos los tipos</option>
										{#each tiposDisponibles as t}
											<option value={t}>{t}</option>
										{/each}
									</select>
								</FormField>
							</div>
						{/if}
						<FormField label="Equipo disponible" name="sal_serie">
							<select id="sal_serie" bind:value={serieSeleccion} onchange={agregarSerie}
								disabled={!form.id_bodega_origen}
								class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
								<option value="" disabled>
									{form.id_bodega_origen
										? (seriesDisponibles.length ? `Seleccionar equipo (${seriesDisponibles.length} con filtro actual)...` : (equiposEnBodegaElegida.length ? 'Sin resultados para el filtro actual' : 'No hay equipos disponibles en esta bodega'))
										: 'Seleccione bodega...'}
								</option>
								{#each seriesDisponibles as serie}
									<option value={serie}>{serie}</option>
								{/each}
							</select>
						</FormField>
						{#if seriesItems.length > 0}
							<ul class="space-y-1">
								{#each seriesItems as s, i}
									<li class="flex items-center justify-between gap-2 text-sm border border-border rounded-md px-3 py-2
										{s.verificacion.disponible ? '' : 'bg-red-50 border-red-200'}">
										<span class="font-mono">{s.serie}</span>
										<span class="flex items-center gap-2">
											{#if s.verificacion.disponible}
												<Badge variant="success">Disponible</Badge>
											{:else if !s.verificacion.existe}
												<span class="text-xs text-destructive">Número de serie no encontrado.</span>
											{:else}
												<span class="text-xs text-destructive">El equipo [{s.serie}] no está disponible en esta bodega. Estado actual: [{s.verificacion.estado}].</span>
											{/if}
											<button type="button" onclick={() => (seriesItems = seriesItems.filter((_, idx) => idx !== i))}
												class="text-muted hover:text-destructive" aria-label="Quitar">
												<X class="h-4 w-4" />
											</button>
										</span>
									</li>
								{/each}
							</ul>
						{/if}
					</div>

					<!-- CU-60: consumibles por tipo y cantidad (saldo en vivo de la bodega).
					     Helpers estáticos para mantener el grid alineado; deshabilitado hasta
					     elegir la bodega de origen -->
					<div class="mb-6">
						<p class="text-sm font-medium text-foreground mb-2">Consumibles</p>
						{#if !form.id_bodega_origen}
							<p class="text-xs text-muted mb-2">Seleccione primero la bodega de origen.</p>
						{/if}
						<div class="grid grid-cols-1 sm:grid-cols-[1fr_8rem_auto] gap-2 items-end">
							<FormField label="Tipo de consumible" name="sal_cons"
								helper={!form.id_bodega_origen
									? 'Seleccione primero la bodega de origen.'
									: (consumibleTipo && saldosBodega[consumibleTipo]
										? `Disponible en bodega: ${saldosBodega[consumibleTipo].saldo} ${saldosBodega[consumibleTipo].unidad ?? ''}`
										: 'Saldo según bodega seleccionada')}>
								<select id="sal_cons" bind:value={consumibleTipo}
									disabled={!form.id_bodega_origen}
									class="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white disabled:opacity-60 disabled:cursor-not-allowed">
									<option value={0} disabled>Seleccionar...</option>
									{#each consumiblesCatalogo as t}
										<option value={t.id_tipo_equipo}>{t.nombre}{t.unidadMedida ? ` (${t.unidadMedida})` : ''}</option>
									{/each}
								</select>
							</FormField>
							<FormField label="Cantidad" name="sal_cant" helper="Hasta 2 decimales">
								<input id="sal_cant" type="number" min="0.01" step="0.01" bind:value={consumibleCantidad}
									disabled={!form.id_bodega_origen}
									class="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed" />
							</FormField>
							<div class="sm:pb-5">
								<Button variant="secondary" onclick={agregarConsumible} disabled={!consumibleTipo || !form.id_bodega_origen}>Agregar</Button>
							</div>
						</div>
						{#if consumiblesItems.length > 0}
							<ul class="space-y-1">
								{#each consumiblesItems as c}
									{@const tipo = catalogo.find((t) => t.id_tipo_equipo === c.id_tipo_equipo)}
									<li class="flex items-center justify-between gap-2 text-sm border border-border rounded-md px-3 py-2">
										<span>{tipo?.nombre ?? `Tipo #${c.id_tipo_equipo}`} — <strong>{c.cantidad}</strong> {tipo?.unidadMedida ?? ''}</span>
										<button type="button" onclick={() => quitarConsumible(c.id_tipo_equipo)}
											class="text-muted hover:text-destructive" aria-label="Quitar">
											<X class="h-4 w-4" />
										</button>
									</li>
								{/each}
							</ul>
						{/if}
					</div>

					<div class="pt-4 border-t border-border flex items-center gap-3">
						<Button onclick={confirmarSalida} disabled={!puedeConfirmar} loading={enviando}>
							Confirmar salida
						</Button>
					</div>
				</div>

				<!-- Listado de salidas registradas -->
				<div class="bg-white rounded-lg border border-border p-6">
					<h2 class="text-base font-semibold text-foreground mb-4">Salidas registradas</h2>
					{#if salidas.length === 0}
						<p class="text-sm text-muted">Sin salidas registradas</p>
					{:else}
						<div class="overflow-x-auto">
							<table class="w-full text-sm">
								<thead>
									<tr class="text-left text-muted border-b border-border">
										<th class="py-2 pr-4 font-medium">ID</th>
										<th class="py-2 pr-4 font-medium">Técnico</th>
										<th class="py-2 pr-4 font-medium">Bodega</th>
										<th class="py-2 pr-4 font-medium">Fecha</th>
										<th class="py-2 font-medium">Ítems</th>
									</tr>
								</thead>
								<tbody>
									{#each salidas as s}
										<tr class="border-b border-border last:border-0">
											<td class="py-2 pr-4 font-mono">#{s.id_salida}</td>
											<td class="py-2 pr-4">{s.tecnico}</td>
											<td class="py-2 pr-4">{s.bodega}</td>
											<td class="py-2 pr-4">{fmtFechaHora(s.fecha_hora)}</td>
											<td class="py-2">{s.items.length}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			</div>

			<!-- CU-58: inventario personal del técnico (solo consulta) -->
			<div class="bg-white rounded-lg border border-border p-6 h-fit">
				<h2 class="text-base font-semibold text-foreground mb-3">Inventario personal del técnico</h2>
				{#if !inventario}
					<p class="text-sm text-muted">Seleccione un técnico para ver su inventario.</p>
				{:else}
					<p class="text-sm font-medium text-foreground">{inventario.tecnico.nombre_completo}</p>
					<p class="text-xs text-muted mb-3">{inventario.tecnico.empresa ?? ''}</p>

					<p class="text-xs font-semibold text-muted uppercase mb-1">Equipos asignados</p>
					{#if inventario.ns_asignados.length === 0}
						<p class="text-sm text-muted mb-3">Sin equipos asignados</p>
					{:else}
						<ul class="space-y-1 mb-3">
							{#each inventario.ns_asignados as ns}
								<li class="text-sm flex items-center justify-between gap-2">
									<span class="font-mono">{ns.numero_serie}</span>
									<span class="text-xs text-muted">{ns.tipo ?? ''}</span>
								</li>
							{/each}
						</ul>
					{/if}

					<p class="text-xs font-semibold text-muted uppercase mb-1">Saldos de consumibles</p>
					{#if inventario.saldos.length === 0}
						<p class="text-sm text-muted">Sin consumibles asignados</p>
					{:else}
						<ul class="space-y-1">
							{#each inventario.saldos as s}
								<li class="text-sm flex items-center justify-between gap-2">
									<span>{s.tipo ?? `Tipo #${s.id_tipo_equipo}`}</span>
									<span><strong>{s.saldo}</strong> {s.unidad_medida ?? ''}</span>
								</li>
							{/each}
						</ul>
					{/if}
				{/if}
			</div>
		</div>
	{/if}
</div>
