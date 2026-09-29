<script lang="ts">
	import { onMount } from 'svelte';
	import { getMiJornada } from '$lib/api/index';
	import type { JornadaTecnico, TrabajoDelDia } from '$lib/types';
	import Button from '$lib/components/Button.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { MapPin, Phone, RotateCw } from '@lucide/svelte';

	// CU-61: vista móvil del técnico. La página es su propia vista (responsive),
	// con los trabajos del día (G3) y el inventario personal (CU-58).
	let jornada = $state<JornadaTecnico | null>(null);
	let loading = $state(true);
	let error = $state('');

	async function load() {
		loading = true;
		error = '';
		try {
			jornada = await getMiJornada();
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
						</div>
					{/each}
				</div>
			{/if}
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
