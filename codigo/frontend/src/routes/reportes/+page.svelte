<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getCatalog, getEmpresas, getUsers, getWarehouses, generarReporteMovimientos } from '$lib/api/index';
	import type { Bodega, Empresa, ReporteMovimientoFila, TipoEquipo, Usuario } from '$lib/types';
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

	let filas = $state<ReporteMovimientoFila[]>([]);
	let empresas = $state<Empresa[]>([]);
	let bodegas = $state<Bodega[]>([]);
	let tipos = $state<TipoEquipo[]>([]);
	let usuarios = $state<Usuario[]>([]);
	let usuarioBusqueda = $state('');
	let loading = $state(false);
	let error = $state('');
	let filters = $state({ id_empresa: '', id_bodega: '', id_tipo_equipo: '', fecha_desde: '', fecha_hasta: '', tipo_movimiento: '', id_usuario: '' });
	const esSuperusuario = $derived($userRoles.includes('SUPERUSUARIO'));
	const empresaActual = $derived($currentUser?.id_empresa);
	const filteredBodegas = $derived(bodegas.filter((bodega) => !filters.id_empresa || String(bodega.id_empresa) === filters.id_empresa));
	const filteredTipos = $derived(tipos.filter((tipo) => !filters.id_empresa || String(tipo.id_empresa) === filters.id_empresa));
	const filteredUsuarios = $derived(usuarios.filter((usuario) => usuario.nombre_completo.toLowerCase().includes(usuarioBusqueda.toLowerCase())).slice(0, 6));
	const rangoInvalido = $derived(filters.fecha_desde && filters.fecha_hasta && differenceInDays(filters.fecha_desde, filters.fecha_hasta) > 365);
	const fechasIncoherentes = $derived(filters.fecha_desde && filters.fecha_hasta && filters.fecha_desde > filters.fecha_hasta);

	function differenceInDays(from: string, to: string) {
		return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000;
	}

	function formatDate(value: string | null) {
		if (!value) return '-';
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? '-' : new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'medium' }).format(date);
	}

	function resetFilters() {
		filters = { id_empresa: '', id_bodega: '', id_tipo_equipo: '', fecha_desde: '', fecha_hasta: '', tipo_movimiento: '', id_usuario: '' };
		usuarioBusqueda = '';
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

	function selectUser(usuario: Usuario) {
		filters.id_usuario = String(usuario.id_usuario);
		usuarioBusqueda = usuario.nombre_completo;
	}

	function onEmpresaChange() {
		if (!filteredBodegas.some((bodega) => String(bodega.id_bodega) === filters.id_bodega)) filters.id_bodega = '';
		if (!filteredTipos.some((tipo) => String(tipo.id_tipo_equipo) === filters.id_tipo_equipo)) filters.id_tipo_equipo = '';
	}

	onMount(async () => { await loadFilters(); await loadReport(); });
	$effect(() => { if (!esSuperusuario && filters.id_empresa) filters.id_empresa = ''; });
</script>

<div class="max-w-7xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<div><p class="text-sm font-medium text-accent">Reportes</p><h1 class="text-xl font-bold text-foreground">Movimientos</h1></div>
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
</div>
