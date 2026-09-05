<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { getOrdenIngreso } from '$lib/api/index';
	import type { OrdenIngreso } from '$lib/types';
	import Button from '$lib/components/Button.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { ArrowLeft, PackageCheck } from '@lucide/svelte';

	let orden = $state<OrdenIngreso | null>(null);
	let loading = $state(true);
	let error = $state('');

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
					<!-- CU-54 implementará el registro de la recepción; aquí solo se anuncia -->
					<Button size="sm" disabled title="Disponible al implementar CU-54">
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
