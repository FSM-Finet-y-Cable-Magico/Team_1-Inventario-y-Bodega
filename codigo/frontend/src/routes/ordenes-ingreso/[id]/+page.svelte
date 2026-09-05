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
	import { ArrowLeft, PackageCheck } from '@lucide/svelte';

	let orden = $state<OrdenIngreso | null>(null);
	let loading = $state(true);
	let error = $state('');
	let success = $state('');

	// CU-54: modal de recepción. `cantidades` guarda lo recibido en ESTA instancia por ítem.
	let showRecepcion = $state(false);
	let cantidades = $state<Record<number, number>>({});
	let recepcionError = $state('');
	let guardando = $state(false);

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

	function abrirRecepcion() {
		cantidades = {};
		for (const d of orden?.detalles ?? []) cantidades[d.id_detalle] = 0;
		recepcionError = '';
		success = '';
		showRecepcion = true;
	}

	async function guardarRecepcion() {
		recepcionError = '';
		const items = (orden?.detalles ?? []).map((d) => ({
			id_detalle: d.id_detalle,
			cantidad_recibida: Number(cantidades[d.id_detalle] ?? 0)
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

		guardando = true;
		try {
			const actualizada = await registrarRecepcionOrden(Number($page.params.id), items);
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
				</div>
			{/each}
		</div>

		<div class="flex justify-end gap-3 pt-2">
			<Button variant="secondary" onclick={() => (showRecepcion = false)} type="button">Cancelar</Button>
			<Button type="submit" loading={guardando}>Guardar recepción</Button>
		</div>
	</form>
</Modal>
