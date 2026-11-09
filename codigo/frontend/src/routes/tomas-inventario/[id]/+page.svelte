<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import {
		cancelarTomaInventario,
		confirmarTomaInventario,
		descargarActaToma,
		esMovimientosDuranteConteo,
		obtenerTomaInventario,
		registrarConteoToma
	} from '$lib/api/index';
	import type { TomaInventario, TomaInventarioLinea } from '$lib/types';
	import Badge from '$lib/components/Badge.svelte';
	import Button from '$lib/components/Button.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { ArrowLeft, FileDown, Save } from '@lucide/svelte';

	// CU-97: registro del conteo, revisión de diferencias y confirmación del ajuste
	let toma = $state<TomaInventario | null>(null);
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');
	let success = $state('');

	// bind:value de un input numérico entrega número, o null si queda vacío
	let contadas = $state<Record<number, string | number | null>>({});
	let seriesTexto = $state('');

	let showConfirmar = $state(false);
	let showCancelar = $state(false);
	// CU-97 E3: aviso de movimientos durante el conteo
	let avisoMovimientos = $state('');

	const abierta = $derived(toma?.estado === 'ABIERTA');
	const estadoLabel: Record<string, string> = { ABIERTA: 'Abierta', CONFIRMADA: 'Confirmada', CANCELADA: 'Cancelada' };
	const resultadoLabel: Record<string, string> = {
		COINCIDE: 'Coincide',
		FALTANTE: 'Faltante',
		SOBRANTE: 'Sobrante',
		OTRA_UBICACION: 'En otra ubicación',
		NO_REGISTRADA: 'No registrada'
	};
	const resultadoBadge: Record<string, 'success' | 'danger' | 'warning' | 'info'> = {
		COINCIDE: 'success',
		FALTANTE: 'danger',
		SOBRANTE: 'info',
		OTRA_UBICACION: 'warning',
		NO_REGISTRADA: 'warning'
	};

	function aplicar(data: TomaInventario) {
		toma = data;
		contadas = Object.fromEntries(
			data.consumibles.map((c) => [c.id_detalle, c.cantidad_contada])
		);
		seriesTexto = data.series
			.filter((s) => s.cantidad_contada === 1)
			.map((s) => s.numero_serie)
			.join('\n');
	}

	async function load() {
		loading = true;
		error = '';
		try {
			aplicar(await obtenerTomaInventario(Number($page.params.id)));
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cargar la toma';
		} finally {
			loading = false;
		}
	}

	onMount(load);

	async function guardarConteo(): Promise<boolean> {
		if (!toma) return false;
		error = '';
		success = '';
		saving = true;
		try {
			const consumibles = toma.consumibles
				.filter((c) => contadas[c.id_detalle] !== null && contadas[c.id_detalle] !== '')
				.map((c) => ({ id_detalle: c.id_detalle, cantidad_contada: Number(contadas[c.id_detalle]) }));
			const series = seriesTexto.split('\n').map((s) => s.trim()).filter(Boolean);
			aplicar(await registrarConteoToma(toma.id_toma, { consumibles, series }));
			return true;
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al guardar el conteo';
			return false;
		} finally {
			saving = false;
		}
	}

	async function guardarYAvisar() {
		if (await guardarConteo()) success = 'Conteo guardado. Revise las diferencias antes de confirmar.';
	}

	async function pedirConfirmacion() {
		if (await guardarConteo()) showConfirmar = true;
	}

	async function confirmar(forzar = false) {
		if (!toma) return;
		showConfirmar = false;
		avisoMovimientos = '';
		error = '';
		saving = true;
		try {
			const res = await confirmarTomaInventario(toma.id_toma, forzar);
			aplicar(res);
			success = `Toma confirmada. Ajustes de stock aplicados: ${res.ajustes_aplicados ?? 0}.`;
		} catch (err: unknown) {
			if (esMovimientosDuranteConteo(err)) {
				avisoMovimientos = err instanceof Error ? err.message : '';
			} else {
				error = err instanceof Error ? err.message : 'Error al confirmar la toma';
			}
		} finally {
			saving = false;
		}
	}

	async function cancelar() {
		if (!toma) return;
		showCancelar = false;
		error = '';
		try {
			aplicar(await cancelarTomaInventario(toma.id_toma));
			success = 'Toma cancelada. El inventario no cambió.';
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cancelar la toma';
		}
	}

	// CU-99: acta PDF de la toma confirmada
	let descargandoActa = $state(false);
	async function descargarActa() {
		if (!toma) return;
		error = '';
		descargandoActa = true;
		try {
			await descargarActaToma(toma.id_toma);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'No se pudo generar el acta';
		} finally {
			descargandoActa = false;
		}
	}

	function textoDiferencia(linea: TomaInventarioLinea): string {
		if (linea.diferencia === null) return '—';
		return linea.diferencia > 0 ? `+${linea.diferencia}` : String(linea.diferencia);
	}
</script>

<div class="max-w-6xl mx-auto">
	<button onclick={() => goto('/tomas-inventario')}
		class="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-4">
		<ArrowLeft class="h-4 w-4" />
		Volver a tomas de inventario
	</button>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4">{error}</div>
	{/if}
	{#if success}
		<div class="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md p-4 text-sm mb-4">{success}</div>
	{/if}

	{#if loading}
		<div class="bg-white rounded-lg border border-border p-6 animate-pulse space-y-4">
			<div class="h-6 w-48 bg-surface-alt rounded"></div>
			<div class="h-4 w-full bg-surface-alt rounded"></div>
		</div>
	{:else if toma}
		<div class="bg-white rounded-lg border border-border p-6 mb-6">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 class="text-lg font-semibold text-foreground">Toma #{toma.id_toma} · {toma.bodega_nombre}</h1>
					<p class="text-sm text-muted">Estado: {estadoLabel[toma.estado]}</p>
				</div>
				{#if abierta}
					<div class="flex items-center gap-2">
						<Button variant="secondary" onclick={() => (showCancelar = true)}>Cancelar toma</Button>
						<Button variant="secondary" loading={saving} onclick={guardarYAvisar}>
							<Save class="h-4 w-4" />
							Guardar conteo
						</Button>
						<Button loading={saving} onclick={pedirConfirmacion}>Confirmar y ajustar</Button>
					</div>
				{:else if toma.estado === 'CONFIRMADA'}
					<Button variant="secondary" loading={descargandoActa} onclick={descargarActa}>
						<FileDown class="h-4 w-4" />
						Descargar acta PDF
					</Button>
				{/if}
			</div>
		</div>

		{#if avisoMovimientos}
			<div class="bg-amber-50 border border-amber-200 text-amber-700 rounded-md p-4 text-sm mb-4">
				<p class="mb-3">{avisoMovimientos} El ajuste se aplicará sobre el stock actual.</p>
				<Button size="sm" onclick={() => confirmar(true)}>Ajustar de todos modos</Button>
			</div>
		{/if}

		<div class="bg-white rounded-lg border border-border p-6 mb-6">
			<h2 class="text-base font-semibold text-foreground mb-4">Consumibles</h2>
			{#if toma.consumibles.length === 0}
				<EmptyState message="Esta bodega no tiene consumibles que contar" />
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-border text-left text-muted text-xs uppercase">
								<th class="py-2 pr-4 font-medium">Tipo de equipo</th>
								<th class="py-2 pr-4 font-medium">Esperado</th>
								<th class="py-2 pr-4 font-medium">Contado</th>
								<th class="py-2 pr-4 font-medium">Diferencia</th>
								<th class="py-2 font-medium">Resultado</th>
							</tr>
						</thead>
						<tbody>
							{#each toma.consumibles as c}
								<tr class="border-b border-border last:border-0">
									<td class="py-2 pr-4">{c.tipo_equipo_nombre}</td>
									<td class="py-2 pr-4">{c.cantidad_esperada} {c.unidad_medida ?? ''}</td>
									<td class="py-2 pr-4">
										{#if abierta}
											<input type="number" min="0" step="0.01" bind:value={contadas[c.id_detalle]}
												aria-label="Cantidad contada de {c.tipo_equipo_nombre}"
												class="w-28 px-3 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
										{:else}
											{c.cantidad_contada ?? '—'}
										{/if}
									</td>
									<td class="py-2 pr-4">{textoDiferencia(c)}</td>
									<td class="py-2">
										{#if c.resultado}
											<Badge variant={resultadoBadge[c.resultado]}>{resultadoLabel[c.resultado]}</Badge>
										{:else}
											<span class="text-muted">Sin contar</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>

		<div class="bg-white rounded-lg border border-border p-6">
			<h2 class="text-base font-semibold text-foreground mb-4">Equipos con número de serie</h2>
			{#if abierta}
				<label for="series" class="block text-sm font-medium text-foreground mb-1">Series contadas (una por línea)</label>
				<textarea id="series" rows="5" bind:value={seriesTexto}
					class="w-full px-3 py-2 border border-border rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary mb-2"></textarea>
				<p class="text-xs text-muted mb-4">Las series faltantes solo se informan: no cambian de estado.</p>
			{/if}
			{#if toma.series.length === 0}
				<EmptyState message="Esta bodega no tiene equipos con número de serie" />
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-border text-left text-muted text-xs uppercase">
								<th class="py-2 pr-4 font-medium">Número de serie</th>
								<th class="py-2 pr-4 font-medium">Tipo de equipo</th>
								<th class="py-2 font-medium">Resultado</th>
							</tr>
						</thead>
						<tbody>
							{#each toma.series as s}
								<tr class="border-b border-border last:border-0">
									<td class="py-2 pr-4 font-mono">{s.numero_serie}</td>
									<td class="py-2 pr-4">{s.tipo_equipo_nombre ?? '—'}</td>
									<td class="py-2">
										{#if s.resultado}
											<Badge variant={resultadoBadge[s.resultado]}>{resultadoLabel[s.resultado]}</Badge>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{:else}
		<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm">Toma de inventario no encontrada</div>
	{/if}
</div>

<ConfirmDialog
	open={showConfirmar}
	variant="primary"
	title="Confirmar toma de inventario"
	message="Se ajustará el stock de consumibles según lo contado y la toma quedará cerrada. Las series faltantes solo se informan."
	confirmlabel="Confirmar y ajustar"
	onconfirm={() => confirmar(false)}
	oncancel={() => (showConfirmar = false)}
/>
<ConfirmDialog
	open={showCancelar}
	title="Cancelar toma de inventario"
	message="La toma quedará cancelada y el inventario no cambiará."
	confirmlabel="Cancelar toma"
	cancellabel="Volver"
	onconfirm={cancelar}
	oncancel={() => (showCancelar = false)}
/>
