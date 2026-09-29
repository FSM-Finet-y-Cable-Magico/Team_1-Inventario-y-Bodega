<script lang="ts">
	import { userRoles } from '$lib/stores/auth';
	import { getDashboard, getMyDashboard, getAlertasActivas } from '$lib/api/index';
	import type { AlertaActiva } from '$lib/types';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { onMount } from 'svelte';
	import { Building2, Package, Warehouse, Boxes, Bell } from '@lucide/svelte';

	let roles = $state<string[]>([]);
	userRoles.subscribe((r) => (roles = r));

	// CU-94: alertas activas, solo para Administrador de bodega, Administrador y Superusuario
	const puedeVerAlertas = $derived(roles.some((r) => ['SUPERUSUARIO', 'ADMIN', 'ADMIN_BODEGA'].includes(r)));
	let alertasActivas = $state<AlertaActiva[]>([]);
	let loadingAlertas = $state(true);
	let errorAlertas = $state('');

	async function cargarAlertas() {
		loadingAlertas = true;
		errorAlertas = '';
		try {
			alertasActivas = await getAlertasActivas();
		} catch (err: unknown) {
			errorAlertas = err instanceof Error ? err.message : 'Error al cargar alertas activas';
		} finally {
			loadingAlertas = false;
		}
	}

	// CU-94: fecha/hora de generación DD/MM/YYYY HH:MM:SS, zona America/Santiago
	function fmtFechaHora(fecha: string | null): string {
		if (!fecha) return '-';
		return new Date(fecha).toLocaleString('en-GB', {
			day: '2-digit', month: '2-digit', year: 'numeric',
			hour: '2-digit', minute: '2-digit', second: '2-digit',
			hour12: false, timeZone: 'America/Santiago'
		}).replace(',', '');
	}

	let loading = $state(true);
	let error = $state('');
	let dashboard = $state<{
		empresa: string;
		total_equipos: number;
		por_estado: Record<string, number>;
		total_bodegas: number;
		stock_consumible: number;
		alertas: { bodega: string; tipo_equipo: string; cantidad_disponible: number; umbral_minimo: number }[];
	}[]>([]);

	// El backend habla en términos de unidades/bodegas_activas (CU-15)
	function mapEmpresa(e: any) {
		return {
			empresa: e.empresa,
			total_equipos: e.total_unidades ?? 0,
			por_estado: e.unidades_por_estado ?? {},
			total_bodegas: e.bodegas_activas ?? 0,
			stock_consumible: e.stock_consumible_total ?? 0,
			alertas: e.alertas_stock_minimo ?? []
		};
	}

	onMount(async () => {
		// CU-94: las alertas se consultan en cada navegación al dashboard, en paralelo
		// a las estadísticas (un error en una no bloquea la otra)
		if (puedeVerAlertas) cargarAlertas();
		try {
			if (roles.includes('SUPERUSUARIO')) {
				const data = await getDashboard();
				dashboard = (data?.dashboard_consolidado ?? []).map(mapEmpresa);
			} else {
				const data = await getMyDashboard();
				dashboard = [mapEmpresa(data)];
			}
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cargar dashboard';
		} finally {
			loading = false;
		}
	});
</script>

<div class="max-w-6xl mx-auto">
	<h1 class="text-xl font-bold text-foreground mb-6">Dashboard</h1>

	{#if loading}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			{#each [1, 2] as _}
				<div class="bg-white rounded-lg border border-border p-6 animate-pulse">
					<div class="h-5 w-32 bg-surface-alt rounded mb-4"></div>
					<div class="space-y-2">
						<div class="h-4 w-full bg-surface-alt rounded"></div>
						<div class="h-4 w-3/4 bg-surface-alt rounded"></div>
					</div>
				</div>
			{/each}
		</div>
	{:else if error}
		<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm">
			{error}
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			{#each dashboard as empresa}
				<div class="bg-white rounded-lg border border-border p-6">
					<div class="flex items-center gap-2 mb-4">
						<Building2 class="h-5 w-5 text-accent" />
						<h2 class="text-base font-semibold text-foreground">{empresa.empresa}</h2>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div class="bg-surface rounded-lg p-3">
							<div class="flex items-center gap-2 text-muted text-xs mb-1">
								<Package class="h-3.5 w-3.5" />
								<span>Total equipos</span>
							</div>
							<span class="text-2xl font-bold text-foreground">{empresa.total_equipos}</span>
						</div>
						<div class="bg-surface rounded-lg p-3">
							<div class="flex items-center gap-2 text-muted text-xs mb-1">
								<Warehouse class="h-3.5 w-3.5" />
								<span>Bodegas activas</span>
							</div>
							<span class="text-2xl font-bold text-foreground">{empresa.total_bodegas}</span>
						</div>
						<div class="bg-surface rounded-lg p-3">
							<div class="flex items-center gap-2 text-muted text-xs mb-1">
								<Boxes class="h-3.5 w-3.5" />
								<span>Stock consumible</span>
							</div>
							<span class="text-2xl font-bold text-foreground">{empresa.stock_consumible}</span>
						</div>
					</div>
					<!-- CU-46: alertas de stock bajo el umbral mínimo -->
				{#if empresa.alertas.length > 0}
					<div class="mt-4 bg-amber-50 border border-amber-200 rounded-md p-3">
						<h3 class="text-xs font-semibold text-amber-800 mb-2">⚠ Alertas de stock mínimo</h3>
						<div class="space-y-1">
							{#each empresa.alertas as alerta}
								<p class="text-xs text-amber-800">
									<strong>{alerta.tipo_equipo}</strong> en {alerta.bodega}:
									{alerta.cantidad_disponible} disponibles (umbral: {alerta.umbral_minimo})
								</p>
							{/each}
						</div>
					</div>
				{/if}
				{#if Object.keys(empresa.por_estado).length > 0}
						<div class="mt-4">
							<h3 class="text-xs font-medium text-muted mb-2">Equipos por estado</h3>
							<div class="space-y-1.5">
								{#each Object.entries(empresa.por_estado) as [estado, cantidad]}
									<div class="flex items-center justify-between text-sm">
										<span class="text-foreground">{estado}</span>
										<span class="font-medium text-foreground">{cantidad}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		{#if !roles.includes('SUPERUSUARIO')}
			<div class="mt-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md p-4 text-sm">
				Para ver el dashboard consolidado de ambas empresas, se requiere rol SUPERUSUARIO.
			</div>
		{/if}
	{/if}

	<!-- CU-94: alertas activas (stock bajo umbral, garantía con defecto, préstamo vencido, revisión prolongada) -->
	{#if puedeVerAlertas}
		<div class="mt-6">
			<div class="flex items-center gap-2 mb-3">
				<Bell class="h-5 w-5 text-accent" />
				<h2 class="text-base font-semibold text-foreground">Alertas activas</h2>
			</div>

			{#if errorAlertas}
				<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4">{errorAlertas}</div>
			{/if}

			<div class="bg-white rounded-lg border border-border overflow-hidden">
				{#if loadingAlertas}
					<div class="p-8 text-center text-sm text-muted">Cargando...</div>
				{:else if alertasActivas.length === 0}
					<!-- CU-94 Excepción 1 -->
					<EmptyState message="No hay alertas activas actualmente." />
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full text-sm">
							<thead>
								<tr class="border-b border-border bg-surface/50">
									<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Tipo de alerta</th>
									<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Empresa</th>
									<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Descripción</th>
									<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Fecha/hora</th>
								</tr>
							</thead>
							<tbody>
								{#each alertasActivas as alerta, i}
									<tr class="{i % 2 === 0 ? 'bg-white' : 'bg-surface/30'} border-b border-border">
										<td class="px-4 py-3 font-bold text-foreground whitespace-nowrap">{alerta.tipo}</td>
										<td class="px-4 py-3 text-muted whitespace-nowrap">{alerta.empresa}</td>
										<td class="px-4 py-3 text-foreground">{alerta.descripcion}</td>
										<td class="px-4 py-3 text-muted whitespace-nowrap">{fmtFechaHora(alerta.fecha_hora)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
