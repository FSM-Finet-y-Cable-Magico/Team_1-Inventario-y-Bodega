<script lang="ts">
	import { userRoles } from '$lib/stores/auth';
	import { getDashboard, getMyDashboard } from '$lib/api/index';
	import { onMount } from 'svelte';
	import { Building2, Package, Warehouse, Boxes } from '@lucide/svelte';

	let roles = $state<string[]>([]);
	userRoles.subscribe((r) => (roles = r));

	let loading = $state(true);
	let error = $state('');
	let dashboard = $state<{
		empresa: string;
		total_equipos: number;
		por_estado: Record<string, number>;
		total_bodegas: number;
		stock_consumible: number;
	}[]>([]);

	// El backend habla en términos de unidades/bodegas_activas (CU-15)
	function mapEmpresa(e: any) {
		return {
			empresa: e.empresa,
			total_equipos: e.total_unidades ?? 0,
			por_estado: e.unidades_por_estado ?? {},
			total_bodegas: e.bodegas_activas ?? 0,
			stock_consumible: e.stock_consumible_total ?? 0
		};
	}

	onMount(async () => {
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
</div>
