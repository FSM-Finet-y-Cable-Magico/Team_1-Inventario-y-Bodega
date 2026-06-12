<script lang="ts">
	import { onMount } from 'svelte';
	import { currentUser } from '$lib/stores/auth';
	import { getMyDashboard } from '$lib/api/index';
	import { Building2, Bell } from '@lucide/svelte';

	let user = $state<{ nombre_completo: string; roles?: { nombre_rol: string }[]; empresa?: { id: number; nombre: string } | null } | null>(null);
	currentUser.subscribe((u) => (user = u));

	// CU-46: campana de notificaciones con las alertas de stock mínimo
	type AlertaStock = {
		bodega: string;
		tipo_equipo: string;
		cantidad_disponible: number;
		umbral_minimo: number;
		unidad_medida?: string | null;
	};
	let alertas = $state<AlertaStock[]>([]);
	let showNotificaciones = $state(false);

	async function cargarAlertas() {
		try {
			const data = await getMyDashboard();
			alertas = data?.alertas_stock_minimo ?? [];
		} catch {
			// sin permiso o sin sesión: la campana queda sin alertas
			alertas = [];
		}
	}

	onMount(cargarAlertas);

	function toggleNotificaciones() {
		showNotificaciones = !showNotificaciones;
		// CU-46: las alertas se recalculan al abrir la campana
		if (showNotificaciones) cargarAlertas();
	}
</script>

<header class="h-14 bg-white border-b border-border flex items-center justify-between px-6">
	<div class="flex items-center gap-2 text-sm text-muted">
		<Building2 class="h-4 w-4" />
		<!-- CU-13/CU-16: contexto de la empresa del usuario autenticado -->
		{#if user?.empresa}
			<span class="font-medium text-foreground">{user.empresa.nombre}</span>
		{/if}
		{#if user?.roles?.length}
			<span class="text-xs bg-surface-alt text-primary-light px-2 py-0.5 rounded font-medium">
				{user.roles.map((r) => r.nombre_rol).join(', ')}
			</span>
		{/if}
	</div>

	<div class="flex items-center gap-3">
		<!-- CU-46: campana de notificaciones (alertas de stock bajo el umbral) -->
		<div class="relative">
			<button onclick={toggleNotificaciones}
				class="relative p-1.5 rounded-md hover:bg-surface-alt text-muted hover:text-foreground transition-colors"
				aria-label="Notificaciones">
				<Bell class="h-5 w-5" />
				{#if alertas.length > 0}
					<span class="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-white text-[10px] font-semibold flex items-center justify-center">
						{alertas.length}
					</span>
				{/if}
			</button>

			{#if showNotificaciones}
				<!-- cierre al hacer clic fuera del panel -->
				<button class="fixed inset-0 z-10 cursor-default" onclick={() => (showNotificaciones = false)} aria-label="Cerrar notificaciones" tabindex={-1}></button>
				<div class="absolute right-0 mt-2 w-80 bg-white border border-border rounded-lg shadow-lg z-20">
					<div class="px-4 py-3 border-b border-border">
						<h3 class="text-sm font-semibold text-foreground">Notificaciones</h3>
					</div>
					<div class="max-h-80 overflow-y-auto">
						{#if alertas.length === 0}
							<p class="px-4 py-6 text-sm text-muted text-center">No hay alertas pendientes</p>
						{:else}
							{#each alertas as a}
								<div class="px-4 py-3 border-b border-border last:border-0 text-sm">
									<p class="font-medium text-amber-700">⚠ Stock bajo el umbral mínimo</p>
									<p class="text-foreground mt-0.5">{a.tipo_equipo} en {a.bodega}</p>
									<p class="text-xs text-muted mt-0.5">
										Disponible: {a.cantidad_disponible}{a.unidad_medida ? ` ${a.unidad_medida}` : ''} · Umbral: {a.umbral_minimo}
									</p>
								</div>
							{/each}
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<span class="text-sm font-medium text-foreground">{user?.nombre_completo ?? 'Usuario'}</span>
	</div>
</header>
