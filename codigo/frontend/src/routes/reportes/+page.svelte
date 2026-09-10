<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getCatalog, getEmpresas, getUsers, getWarehouses, generarReporteGarantias, generarReporteMovimientos, generarReporteInventarioTecnicos, generarReporteConsumo } from '$lib/api/index';
	import type { Bodega, Empresa, ReporteConsumoFila, ReporteGarantiaFila, ReporteInventarioTecnico, ReporteMovimientoFila, TipoEquipo, Usuario } from '$lib/types';
	import Badge from '$lib/components/Badge.svelte';
	import Button from '$lib/components/Button.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import SearchInput from '$lib/components/SearchInput.svelte';
	import { userRoles, currentUser } from '$lib/stores/auth';
	import { Filter, RotateCw } from '@lucide/svelte';

	const tiposMovimiento = [
		'INGRESO', 'ASIGNACION', 'SALIDA_A_TECNICO', 'DEVOLUCION', 'BAJA',
		'TRANSFERENCIA', 'TRANSFERENCIA_PENDIENTE', 'TRANSFERENCIA_APROBADA',
		'TRANSFERENCIA_RECHAZADA', 'PRESTAMO'
	];

	const periodosGarantia = [
		{ value: 'TODAS', label: 'Todas' },
		{ value: 'VENCIDAS', label: 'Vencidas' },
		{ value: '30', label: 'Vencen en 30 días' },
		{ value: '60', label: 'Vencen en 60 días' },
		{ value: '90', label: 'Vencen en 90 días' },
	] as const;

	let activeTab = $state<'movimientos' | 'garantias' | 'inventario-tecnicos' | 'consumo'>('garantias');
	let filas = $state<ReporteMovimientoFila[]>([]);
	let filasGarantias = $state<ReporteGarantiaFila[]>([]);
	let inventarioTecnicos = $state<ReporteInventarioTecnico[]>([]);
	let filasConsumo = $state<ReporteConsumoFila[]>([]);
	let empresas = $state<Empresa[]>([]);
	let bodegas = $state<Bodega[]>([]);
	let tipos = $state<TipoEquipo[]>([]);
	let usuarios = $state<Usuario[]>([]);
	let usuarioBusqueda = $state('');
	let loading = $state(false);
	let loadingGarantias = $state(false);
	let error = $state('');
	let errorGarantias = $state('');
	let loadingInventarioTecnicos = $state(false);
	let errorInventarioTecnicos = $state('');
	let loadingConsumo = $state(false);
	let errorConsumo = $state('');
	let filters = $state({ id_empresa: '', id_bodega: '', id_tipo_equipo: '', fecha_desde: '', fecha_hasta: '', tipo_movimiento: '', id_usuario: '' });
	let garantiaFilters = $state({ id_empresa: '', id_tipo_equipo: '', periodo: 'TODAS' as 'VENCIDAS' | '30' | '60' | '90' | 'TODAS' });
	let inventarioTecnicosFilters = $state({ id_empresa: '', id_usuario: '' });
	let consumoFilters = $state({ id_empresa: '', id_tipo_equipo: '', fecha_desde: '', fecha_hasta: '' });
	const esSuperusuario = $derived($userRoles.includes('SUPERUSUARIO'));
	const empresaActual = $derived($currentUser?.id_empresa);
	const filteredBodegas = $derived(bodegas.filter((bodega) => !filters.id_empresa || String(bodega.id_empresa) === filters.id_empresa));
	const filteredTipos = $derived(tipos.filter((tipo) => !filters.id_empresa || String(tipo.id_empresa) === filters.id_empresa));
	const filteredGarantiaTipos = $derived(tipos.filter((tipo) => !garantiaFilters.id_empresa || String(tipo.id_empresa) === garantiaFilters.id_empresa));
	const filteredConsumoTipos = $derived(tipos.filter((tipo) => tipo.requiereSerialNumber !== true && (!consumoFilters.id_empresa || String(tipo.id_empresa) === consumoFilters.id_empresa)));
	const filteredUsuarios = $derived(usuarios.filter((usuario) => usuario.nombre_completo.toLowerCase().includes(usuarioBusqueda.toLowerCase())).slice(0, 6));
	const tecnicos = $derived(usuarios.filter((usuario) => usuario.roles?.some((rol) => rol.nombre_rol === 'TECNICO_TERRENO')));
	const rangoInvalido = $derived(filters.fecha_desde && filters.fecha_hasta && differenceInDays(filters.fecha_desde, filters.fecha_hasta) > 365);
	const fechasIncoherentes = $derived(filters.fecha_desde && filters.fecha_hasta && filters.fecha_desde > filters.fecha_hasta);
	const consumoRangoInvalido = $derived(consumoFilters.fecha_desde && consumoFilters.fecha_hasta && differenceInDays(consumoFilters.fecha_desde, consumoFilters.fecha_hasta) > 365);
	const consumoFechasIncoherentes = $derived(consumoFilters.fecha_desde && consumoFilters.fecha_hasta && consumoFilters.fecha_desde > consumoFilters.fecha_hasta);

	function differenceInDays(from: string, to: string) {
		return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000;
	}

	function formatDate(value: string | null) {
		if (!value) return '-';
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? '-' : new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'medium' }).format(date);
	}

	function formatISODate(value: string | null) {
		if (!value) return 'Sin garantía';
		const date = new Date(`${value}T00:00:00Z`);
		return Number.isNaN(date.getTime()) ? 'Sin garantía' : new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(date);
	}

	function resetFilters() {
		filters = { id_empresa: '', id_bodega: '', id_tipo_equipo: '', fecha_desde: '', fecha_hasta: '', tipo_movimiento: '', id_usuario: '' };
		usuarioBusqueda = '';
	}

	function resetGarantiaFilters() {
		garantiaFilters = { id_empresa: '', id_tipo_equipo: '', periodo: 'TODAS' };
	}

	function resetInventarioTecnicosFilters() {
		inventarioTecnicosFilters = { id_empresa: '', id_usuario: '' };
	}

	function resetConsumoFilters() {
		consumoFilters = { id_empresa: '', id_tipo_equipo: '', fecha_desde: '', fecha_hasta: '' };
	}

	async function loadFilters() {
		try { empresas = esSuperusuario ? await getEmpresas() : []; } catch { empresas = []; }
		try { bodegas = await getWarehouses(); } catch { bodegas = []; }
		try { tipos = await getCatalog(); } catch { tipos = []; }
		try { usuarios = await getUsers({ activo: true }); } catch { usuarios = []; }
	}

	async function loadReport() {
		if (rangoInvalido || fechasIncoherentes) return;
		loading = true;
		error = '';
		try {
			filas = await generarReporteMovimientos({ ...filters, id_empresa: filters.id_empresa || undefined, id_bodega: filters.id_bodega || undefined, id_tipo_equipo: filters.id_tipo_equipo || undefined, fecha_desde: filters.fecha_desde || undefined, fecha_hasta: filters.fecha_hasta || undefined, tipo_movimiento: filters.tipo_movimiento || undefined, id_usuario: filters.id_usuario || undefined });
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'No se pudo cargar el reporte de movimientos.';
			filas = [];
		} finally { loading = false; }
	}

	async function loadGarantiaReport() {
		loadingGarantias = true;
		errorGarantias = '';
		try {
			filasGarantias = await generarReporteGarantias({
				id_empresa: garantiaFilters.id_empresa || undefined,
				id_tipo_equipo: garantiaFilters.id_tipo_equipo || undefined,
				periodo: garantiaFilters.periodo || 'TODAS',
			});
		} catch (err: unknown) {
			errorGarantias = err instanceof Error ? err.message : 'No se pudo cargar el reporte de garantías.';
			filasGarantias = [];
		} finally { loadingGarantias = false; }
	}

	async function loadInventarioTecnicosReport() {
		loadingInventarioTecnicos = true;
		errorInventarioTecnicos = '';
		try {
			inventarioTecnicos = await generarReporteInventarioTecnicos({
				id_empresa: inventarioTecnicosFilters.id_empresa || undefined,
				id_usuario: inventarioTecnicosFilters.id_usuario || undefined,
			});
		} catch (err: unknown) {
			errorInventarioTecnicos = err instanceof Error ? err.message : 'No se pudo cargar el inventario de técnicos.';
			inventarioTecnicos = [];
		} finally { loadingInventarioTecnicos = false; }
	}

	async function loadConsumoReport() {
		if (consumoRangoInvalido || consumoFechasIncoherentes) return;
		loadingConsumo = true;
		errorConsumo = '';
		try {
			filasConsumo = await generarReporteConsumo({
				id_empresa: consumoFilters.id_empresa || undefined,
				id_tipo_equipo: consumoFilters.id_tipo_equipo || undefined,
				fecha_desde: consumoFilters.fecha_desde || undefined,
				fecha_hasta: consumoFilters.fecha_hasta || undefined,
			});
		} catch (err: unknown) {
			errorConsumo = err instanceof Error ? err.message : 'No se pudo cargar el reporte de consumo.';
			filasConsumo = [];
		} finally { loadingConsumo = false; }
	}

	function selectUser(usuario: Usuario) {
		filters.id_usuario = String(usuario.id_usuario);
		usuarioBusqueda = usuario.nombre_completo;
	}

	function onEmpresaChange() {
		if (!filteredBodegas.some((bodega) => String(bodega.id_bodega) === filters.id_bodega)) filters.id_bodega = '';
		if (!filteredTipos.some((tipo) => String(tipo.id_tipo_equipo) === filters.id_tipo_equipo)) filters.id_tipo_equipo = '';
	}

	function onGarantiaEmpresaChange() {
		if (garantiaFilters.id_tipo_equipo && !filteredGarantiaTipos.some((tipo) => String(tipo.id_tipo_equipo) === garantiaFilters.id_tipo_equipo)) {
			garantiaFilters.id_tipo_equipo = '';
		}
	}

	function onInventarioEmpresaChange() {
		if (inventarioTecnicosFilters.id_usuario && !tecnicos.some((tecnico) => String(tecnico.id_empresa) === inventarioTecnicosFilters.id_empresa && String(tecnico.id_usuario) === inventarioTecnicosFilters.id_usuario)) {
			inventarioTecnicosFilters.id_usuario = '';
		}
	}

	function onConsumoEmpresaChange() {
		if (consumoFilters.id_tipo_equipo && !filteredConsumoTipos.some((tipo) => String(tipo.id_tipo_equipo) === consumoFilters.id_tipo_equipo)) {
			consumoFilters.id_tipo_equipo = '';
		}
	}

	function getGarantiaBadge(fila: ReporteGarantiaFila): { variant: 'default' | 'success' | 'danger'; text: string } {
		if (fila.dias === null) return { variant: 'default', text: 'Sin garantía' };
		if (fila.dias >= 0) return { variant: 'success', text: `${fila.dias} días restantes` };
		return { variant: 'danger', text: `${Math.abs(fila.dias)} días vencidos` };
	}

	onMount(async () => {
		await loadFilters();
		await loadReport();
		await loadGarantiaReport();
		await loadInventarioTecnicosReport();
		await loadConsumoReport();
	});
	$effect(() => { if (!esSuperusuario && filters.id_empresa) filters.id_empresa = ''; });
	$effect(() => { if (!esSuperusuario && garantiaFilters.id_empresa) garantiaFilters.id_empresa = ''; });
	$effect(() => { if (!esSuperusuario && inventarioTecnicosFilters.id_empresa) inventarioTecnicosFilters.id_empresa = ''; });
	$effect(() => { if (!esSuperusuario && consumoFilters.id_empresa) consumoFilters.id_empresa = ''; });
</script>

<div class="max-w-7xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<div>
			<p class="text-sm font-medium text-accent">Reportes</p>
			<h1 class="text-xl font-bold text-foreground">Reporte general</h1>
		</div>
	</div>

	<div class="inline-flex rounded-lg border border-border bg-white p-1 mb-6">
		<button
			type="button"
			class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
			class:bg-surface-alt={activeTab === 'movimientos'}
			class:text-accent={activeTab === 'movimientos'}
			class:text-muted={activeTab !== 'movimientos'}
			onclick={() => (activeTab = 'movimientos')}
		>
			Movimientos
		</button>
		<button
			type="button"
			class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
			class:bg-surface-alt={activeTab === 'garantias'}
			class:text-accent={activeTab === 'garantias'}
			class:text-muted={activeTab !== 'garantias'}
			onclick={() => (activeTab = 'garantias')}
		>
			Garantías
		</button>
		<button
			type="button"
			class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
			class:bg-surface-alt={activeTab === 'inventario-tecnicos'}
			class:text-accent={activeTab === 'inventario-tecnicos'}
			class:text-muted={activeTab !== 'inventario-tecnicos'}
			onclick={() => (activeTab = 'inventario-tecnicos')}
		>
			Inventario de técnicos
		</button>
		<button
			type="button"
			class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
			class:bg-surface-alt={activeTab === 'consumo'}
			class:text-accent={activeTab === 'consumo'}
			class:text-muted={activeTab !== 'consumo'}
			onclick={() => (activeTab = 'consumo')}
		>
			Consumo de consumibles
		</button>
		<!-- CU-85: el reporte de stock es su propia página en /reportes/stock -->
		<button
			type="button"
			class="px-4 py-2 text-sm font-medium rounded-md transition-colors text-muted"
			onclick={() => goto('/reportes/stock')}
		>
			Stock
		</button>
	</div>

	{#if activeTab === 'movimientos'}
		<div class="flex items-center justify-between mb-6">
			<div><h2 class="text-lg font-semibold text-foreground">Movimientos</h2></div>
			<Button variant="secondary" onclick={loadReport}><RotateCw class="h-4 w-4" />Actualizar</Button>
		</div>

		<div class="bg-white border border-border rounded-lg p-4 mb-6">
			<div class="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
				{#if esSuperusuario}<div><label for="empresa-filter" class="block text-xs font-medium text-muted mb-1">Empresa</label><select id="empresa-filter" bind:value={filters.id_empresa} onchange={onEmpresaChange} class="w-full px-3 py-2 border border-border rounded-md text-sm bg-white"><option value="">Todas</option>{#each empresas as empresa}<option value={String(empresa.id)}>{empresa.nombre}</option>{/each}</select></div>{/if}
				<div><label for="bodega-filter" class="block text-xs font-medium text-muted mb-1">Bodega</label><select id="bodega-filter" bind:value={filters.id_bodega} class="w-full px-3 py-2 border border-border rounded-md text-sm bg-white"><option value="">Todas</option>{#each filteredBodegas as bodega}<option value={String(bodega.id_bodega)}>{bodega.nombre}</option>{/each}</select></div>
				<div><label for="tipo-filter" class="block text-xs font-medium text-muted mb-1">Tipo de equipo</label><select id="tipo-filter" bind:value={filters.id_tipo_equipo} class="w-full px-3 py-2 border border-border rounded-md text-sm bg-white"><option value="">Todos</option>{#each filteredTipos as tipo}<option value={String(tipo.id_tipo_equipo)}>{tipo.nombre}</option>{/each}</select></div>
				<div><label for="movimiento-filter" class="block text-xs font-medium text-muted mb-1">Tipo de movimiento</label><select id="movimiento-filter" bind:value={filters.tipo_movimiento} class="w-full px-3 py-2 border border-border rounded-md text-sm bg-white"><option value="">Todos</option>{#each tiposMovimiento as tipo}<option value={tipo}>{tipo}</option>{/each}</select></div>
				<div><label for="desde-filter" class="block text-xs font-medium text-muted mb-1">Fecha desde</label><input id="desde-filter" type="date" bind:value={filters.fecha_desde} class="w-full px-3 py-2 border border-border rounded-md text-sm" /></div>
				<div><label for="hasta-filter" class="block text-xs font-medium text-muted mb-1">Fecha hasta</label><input id="hasta-filter" type="date" bind:value={filters.fecha_hasta} class="w-full px-3 py-2 border border-border rounded-md text-sm" /></div>
				<div class="relative"><label for="usuario-filter" class="block text-xs font-medium text-muted mb-1">Usuario</label><SearchInput placeholder="Buscar usuario..." bind:value={usuarioBusqueda} onsearch={() => (filters.id_usuario = '')} />{#if usuarioBusqueda && !filters.id_usuario}<div class="absolute z-10 left-0 right-0 top-full bg-white border border-border rounded-md shadow-sm">{#each filteredUsuarios as usuario}<button class="block w-full text-left px-3 py-2 text-sm hover:bg-surface-alt" onclick={() => selectUser(usuario)}>{usuario.nombre_completo}</button>{/each}</div>{/if}</div>
				<div class="flex gap-2"><Button onclick={loadReport} disabled={!!rangoInvalido || !!fechasIncoherentes}><Filter class="h-4 w-4" />Generar</Button><Button variant="secondary" onclick={resetFilters}>Limpiar</Button></div>
			</div>
			{#if rangoInvalido}<p class="text-sm text-destructive mt-3">El rango de fechas no puede superar los 365 días.</p>{:else if fechasIncoherentes}<p class="text-sm text-destructive mt-3">La fecha de inicio debe ser anterior o igual a la fecha de fin.</p>{/if}
		</div>

		{#if error}<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4">{error}</div>{/if}
		{#if loading}<div class="bg-white border border-border rounded-lg p-8 text-sm text-muted">Cargando reporte...</div>{:else if filas.length === 0}<EmptyState message="No se encontraron datos para los filtros seleccionados." />{:else}
			<div class="bg-white border border-border rounded-lg overflow-hidden shadow-sm"><div class="overflow-x-auto"><table class="min-w-full text-sm"><thead class="bg-surface-alt text-left text-muted"><tr><th class="px-4 py-3 font-medium">Fecha y hora</th><th class="px-4 py-3 font-medium">Movimiento</th><th class="px-4 py-3 font-medium">NS / consumible</th><th class="px-4 py-3 font-medium">Cantidad</th><th class="px-4 py-3 font-medium">Empresa</th><th class="px-4 py-3 font-medium">Bodega</th><th class="px-4 py-3 font-medium">Usuario</th><th class="px-4 py-3 font-medium">Referencia</th></tr></thead><tbody>{#each filas as fila}<tr class="border-t border-border hover:bg-surface-alt/50"><td class="px-4 py-3 whitespace-nowrap">{formatDate(fila.fecha)}</td><td class="px-4 py-3">{fila.tipo_movimiento}</td><td class="px-4 py-3">{fila.item ?? fila.tipo_equipo ?? '-'}</td><td class="px-4 py-3">{fila.cantidad}</td><td class="px-4 py-3">{fila.empresa ?? '-'}</td><td class="px-4 py-3">{fila.bodega ?? '-'}</td><td class="px-4 py-3">{fila.usuario ?? '-'}</td><td class="px-4 py-3">{fila.referencia_id ? `${fila.referencia_tipo ?? 'documento'} #${fila.referencia_id}` : '-'}</td></tr>{/each}</tbody></table></div></div>
		{/if}
	{:else if activeTab === 'garantias'}
		<div class="flex items-center justify-between mb-6">
			<div><h2 class="text-lg font-semibold text-foreground">Garantías</h2></div>
			<Button variant="secondary" onclick={loadGarantiaReport}><RotateCw class="h-4 w-4" />Actualizar</Button>
		</div>

		<div class="bg-white border border-border rounded-lg p-4 mb-6">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
				{#if esSuperusuario}
				<div>
					<label for="garantia-empresa-filter" class="block text-xs font-medium text-muted mb-1">Empresa</label>
					<select id="garantia-empresa-filter" bind:value={garantiaFilters.id_empresa} onchange={onGarantiaEmpresaChange} class="w-full px-3 py-2 border border-border rounded-md text-sm bg-white">
						<option value="">Todas</option>
						{#each empresas as empresa}
							<option value={String(empresa.id)}>{empresa.nombre}</option>
						{/each}
					</select>
				</div>
				{/if}
				<div>
					<label for="garantia-tipo-filter" class="block text-xs font-medium text-muted mb-1">Tipo de equipo</label>
					<select id="garantia-tipo-filter" bind:value={garantiaFilters.id_tipo_equipo} class="w-full px-3 py-2 border border-border rounded-md text-sm bg-white">
						<option value="">Todos</option>
						{#each filteredGarantiaTipos as tipo}
							<option value={String(tipo.id_tipo_equipo)}>{tipo.nombre}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="garantia-periodo-filter" class="block text-xs font-medium text-muted mb-1">Período de vencimiento</label>
					<select id="garantia-periodo-filter" bind:value={garantiaFilters.periodo} class="w-full px-3 py-2 border border-border rounded-md text-sm bg-white">
						{#each periodosGarantia as periodo}
							<option value={periodo.value}>{periodo.label}</option>
						{/each}
					</select>
				</div>
				<div class="flex gap-2">
					<Button onclick={loadGarantiaReport}><Filter class="h-4 w-4" />Generar</Button>
					<Button variant="secondary" onclick={resetGarantiaFilters}>Limpiar</Button>
				</div>
			</div>
		</div>

		{#if errorGarantias}<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4">{errorGarantias}</div>{/if}
		{#if loadingGarantias}
			<div class="bg-white border border-border rounded-lg p-8 text-sm text-muted">Cargando reporte...</div>
		{:else if filasGarantias.length === 0}
			<EmptyState message="No se encontraron equipos con los filtros seleccionados." />
		{:else}
			<div class="bg-white border border-border rounded-lg overflow-hidden shadow-sm">
				<div class="overflow-x-auto">
					<table class="min-w-full text-sm">
						<thead class="bg-surface-alt text-left text-muted">
							<tr>
								<th class="px-4 py-3 font-medium">NS</th>
								<th class="px-4 py-3 font-medium">Tipo de equipo</th>
								<th class="px-4 py-3 font-medium">Marca</th>
								<th class="px-4 py-3 font-medium">Modelo</th>
								<th class="px-4 py-3 font-medium">Proveedor</th>
								<th class="px-4 py-3 font-medium">Fecha de adquisición</th>
								<th class="px-4 py-3 font-medium">Duración garantía (días)</th>
								<th class="px-4 py-3 font-medium">Fecha de vencimiento</th>
								<th class="px-4 py-3 font-medium">Días restantes/vencidos</th>
								<th class="px-4 py-3 font-medium">Estado actual</th>
								<th class="px-4 py-3 font-medium">Empresa</th>
							</tr>
						</thead>
						<tbody>
							{#each filasGarantias as fila}
								<tr class="border-t border-border hover:bg-surface-alt/50">
									<td class="px-4 py-3 font-medium">{fila.numero_serie}</td>
									<td class="px-4 py-3">{fila.tipo_equipo}</td>
									<td class="px-4 py-3">{fila.marca ?? '-'}</td>
									<td class="px-4 py-3">{fila.modelo ?? '-'}</td>
									<td class="px-4 py-3">{fila.proveedor ?? '-'}</td>
									<td class="px-4 py-3">{formatISODate(fila.fecha_adquisicion)}</td>
									<td class="px-4 py-3">{fila.duracion_garantia_dias}</td>
									<td class="px-4 py-3">{fila.fecha_vencimiento ? formatISODate(fila.fecha_vencimiento) : 'Sin garantía'}</td>
									<td class="px-4 py-3">
										{#if fila.dias === null}
											<Badge variant="default">Sin garantía</Badge>
										{:else}
											{@const badge = getGarantiaBadge(fila)}
											<Badge variant={badge.variant}>{badge.text}</Badge>
										{/if}
									</td>
									<td class="px-4 py-3">{fila.estado}</td>
									<td class="px-4 py-3">{fila.empresa ?? '-'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	{:else if activeTab === 'inventario-tecnicos'}
		<div class="flex items-center justify-between mb-6">
			<div><h2 class="text-lg font-semibold text-foreground">Inventario de técnicos</h2></div>
			<Button variant="secondary" onclick={loadInventarioTecnicosReport}><RotateCw class="h-4 w-4" />Actualizar</Button>
		</div>

		<div class="bg-white border border-border rounded-lg p-4 mb-6">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
				{#if esSuperusuario}
					<div>
						<label for="inventario-tecnicos-empresa" class="block text-xs font-medium text-muted mb-1">Empresa</label>
						<select id="inventario-tecnicos-empresa" bind:value={inventarioTecnicosFilters.id_empresa} onchange={onInventarioEmpresaChange} class="w-full px-3 py-2 border border-border rounded-md text-sm bg-white">
							<option value="">Todas</option>
							{#each empresas as empresa}<option value={String(empresa.id)}>{empresa.nombre}</option>{/each}
						</select>
					</div>
				{/if}
				<div>
					<label for="inventario-tecnicos-tecnico" class="block text-xs font-medium text-muted mb-1">Técnico</label>
					<select id="inventario-tecnicos-tecnico" bind:value={inventarioTecnicosFilters.id_usuario} class="w-full px-3 py-2 border border-border rounded-md text-sm bg-white">
						<option value="">Todos</option>
						{#each tecnicos.filter((tecnico) => !inventarioTecnicosFilters.id_empresa || String(tecnico.id_empresa) === inventarioTecnicosFilters.id_empresa) as tecnico}
							<option value={String(tecnico.id_usuario)}>{tecnico.nombre_completo}</option>
						{/each}
					</select>
				</div>
				<div class="flex gap-2">
					<Button onclick={loadInventarioTecnicosReport}><Filter class="h-4 w-4" />Generar</Button>
					<Button variant="secondary" onclick={resetInventarioTecnicosFilters}>Limpiar</Button>
				</div>
			</div>
		</div>

		{#if errorInventarioTecnicos}<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4">{errorInventarioTecnicos}</div>{/if}
		{#if loadingInventarioTecnicos}
			<div class="bg-white border border-border rounded-lg p-8 text-sm text-muted">Cargando reporte...</div>
		{:else if inventarioTecnicos.length === 0}
			<EmptyState message="No se encontraron técnicos con los filtros seleccionados." />
		{:else}
			<div class="space-y-6">
				{#each inventarioTecnicos as reporte}
					<div class="bg-white border border-border rounded-lg overflow-hidden shadow-sm">
						<div class="px-4 py-3 border-b border-border"><h3 class="font-semibold text-foreground">{reporte.tecnico.nombre_completo}</h3><p class="text-sm text-muted">{reporte.tecnico.empresa ?? '-'}</p></div>
						{#if reporte.equipos_individualizables.length === 0 && reporte.consumibles.length === 0}
							<p class="p-4 text-sm text-muted">Este técnico no tiene ítems en su inventario personal.</p>
						{:else}
							<div class="p-4 space-y-5">
								<section>
									<h4 class="text-sm font-semibold text-foreground mb-2">Equipos individualizables</h4>
									<div class="overflow-x-auto"><table class="min-w-full text-sm"><thead class="bg-surface-alt text-left text-muted"><tr><th class="px-3 py-2">NS</th><th class="px-3 py-2">Tipo de equipo</th><th class="px-3 py-2">Fecha de asignación</th><th class="px-3 py-2">Días transcurridos</th></tr></thead><tbody>{#each reporte.equipos_individualizables as equipo}<tr class="border-t border-border"><td class="px-3 py-2 font-medium">{equipo.numero_serie}</td><td class="px-3 py-2">{equipo.tipo_equipo}</td><td class="px-3 py-2">{formatISODate(equipo.fecha_asignacion)}</td><td class="px-3 py-2">{equipo.dias_transcurridos}</td></tr>{/each}</tbody></table></div>
								</section>
								<section>
									<h4 class="text-sm font-semibold text-foreground mb-2">Consumibles</h4>
									<div class="overflow-x-auto"><table class="min-w-full text-sm"><thead class="bg-surface-alt text-left text-muted"><tr><th class="px-3 py-2">Tipo de equipo</th><th class="px-3 py-2">Cantidad disponible</th><th class="px-3 py-2">Unidad de medida</th></tr></thead><tbody>{#each reporte.consumibles as consumible}<tr class="border-t border-border"><td class="px-3 py-2">{consumible.tipo_equipo}</td><td class="px-3 py-2">{consumible.cantidad_disponible}</td><td class="px-3 py-2">{consumible.unidad_medida ?? '-'}</td></tr>{/each}</tbody></table></div>
								</section>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	{:else}
		<div class="flex items-center justify-between mb-6">
			<div><h2 class="text-lg font-semibold text-foreground">Consumo de consumibles</h2></div>
			<Button variant="secondary" onclick={loadConsumoReport}><RotateCw class="h-4 w-4" />Actualizar</Button>
		</div>

		<div class="bg-white border border-border rounded-lg p-4 mb-6">
			<div class="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
				{#if esSuperusuario}
					<div>
						<label for="consumo-empresa-filter" class="block text-xs font-medium text-muted mb-1">Empresa</label>
						<select id="consumo-empresa-filter" bind:value={consumoFilters.id_empresa} onchange={onConsumoEmpresaChange} class="w-full px-3 py-2 border border-border rounded-md text-sm bg-white">
							<option value="">Todas</option>
							{#each empresas as empresa}<option value={String(empresa.id)}>{empresa.nombre}</option>{/each}
						</select>
					</div>
				{/if}
				<div>
					<label for="consumo-tipo-filter" class="block text-xs font-medium text-muted mb-1">Tipo de consumible</label>
					<select id="consumo-tipo-filter" bind:value={consumoFilters.id_tipo_equipo} class="w-full px-3 py-2 border border-border rounded-md text-sm bg-white">
						<option value="">Todos</option>
						{#each filteredConsumoTipos as tipo}<option value={String(tipo.id_tipo_equipo)}>{tipo.nombre}</option>{/each}
					</select>
				</div>
				<div>
					<label for="consumo-desde-filter" class="block text-xs font-medium text-muted mb-1">Fecha desde</label>
					<input id="consumo-desde-filter" type="date" bind:value={consumoFilters.fecha_desde} class="w-full px-3 py-2 border border-border rounded-md text-sm" />
				</div>
				<div>
					<label for="consumo-hasta-filter" class="block text-xs font-medium text-muted mb-1">Fecha hasta</label>
					<input id="consumo-hasta-filter" type="date" bind:value={consumoFilters.fecha_hasta} class="w-full px-3 py-2 border border-border rounded-md text-sm" />
				</div>
				<div class="flex gap-2">
					<Button onclick={loadConsumoReport} disabled={!!consumoRangoInvalido || !!consumoFechasIncoherentes}><Filter class="h-4 w-4" />Generar</Button>
					<Button variant="secondary" onclick={resetConsumoFilters}>Limpiar</Button>
				</div>
			</div>
			{#if consumoRangoInvalido}<p class="text-sm text-destructive mt-3">El rango de fechas no puede superar los 365 días.</p>{:else if consumoFechasIncoherentes}<p class="text-sm text-destructive mt-3">La fecha de inicio debe ser anterior o igual a la fecha de fin.</p>{/if}
		</div>

		{#if errorConsumo}<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4">{errorConsumo}</div>{/if}
		{#if loadingConsumo}
			<div class="bg-white border border-border rounded-lg p-8 text-sm text-muted">Cargando reporte...</div>
		{:else if filasConsumo.length === 0}
			<EmptyState message="No se encontraron consumibles con los filtros seleccionados." />
		{:else}
			<div class="bg-white border border-border rounded-lg overflow-hidden shadow-sm">
				<div class="overflow-x-auto">
					<table class="min-w-full text-sm">
						<thead class="bg-surface-alt text-left text-muted"><tr><th class="px-4 py-3 font-medium">Tipo de consumible</th><th class="px-4 py-3 font-medium">Ingresada</th><th class="px-4 py-3 font-medium">Entregada a técnicos</th><th class="px-4 py-3 font-medium">Usada en cierres</th><th class="px-4 py-3 font-medium">Devuelta a bodega</th><th class="px-4 py-3 font-medium">Diferencia</th><th class="px-4 py-3 font-medium">Indicador</th></tr></thead>
						<tbody>{#each filasConsumo as fila}<tr class:border-amber-300={fila.desvio} class="border-t border-border hover:bg-surface-alt/50"><td class="px-4 py-3 font-medium">{fila.tipo_consumible}</td><td class="px-4 py-3">{fila.cantidad_ingresada} {fila.unidad_medida ?? ''}</td><td class="px-4 py-3">{fila.cantidad_entregada}</td><td class="px-4 py-3">{fila.cantidad_usada_en_cierres}</td><td class="px-4 py-3">{fila.cantidad_devuelta}</td><td class="px-4 py-3">{fila.diferencia}</td><td class="px-4 py-3">{#if fila.desvio}<Badge variant="warning">Desvío significativo</Badge>{:else}-{/if}</td></tr>{/each}</tbody>
					</table>
				</div>
			</div>
		{/if}
	{/if}
</div>
