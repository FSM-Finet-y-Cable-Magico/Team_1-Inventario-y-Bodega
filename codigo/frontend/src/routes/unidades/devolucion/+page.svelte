<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getEquipoParaDevolucion, registrarDevolucion, getWarehouses } from '$lib/api/index';
	import type { EquipoDevolucion } from '$lib/types';
	import Button from '$lib/components/Button.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { ArrowLeft, Search } from '@lucide/svelte';

	// CU-71: estado visual del equipo al momento de la devolución (lista cerrada del CU)
	const ESTADOS_VISUALES = ['Sin daño visible', 'Daño leve', 'Daño grave', 'No enciende', 'Incompleto'];

	// Fecha de hoy en Chile (YYYY-MM-DD) como tope del selector: no se permiten fechas futuras
	const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });

	let numeroSerie = $state('');
	let buscando = $state(false);
	let errorBusqueda = $state('');
	let equipo = $state<EquipoDevolucion | null>(null);

	let warehouses = $state<any[]>([]);
	let form = $state({ fecha_devolucion: hoy, estado_visual: '', nombre_tecnico_retiro: '', id_bodega_destino: 0 });
	let formError = $state('');
	let showConfirm = $state(false);
	let guardando = $state(false);
	let success = $state('');

	onMount(async () => {
		try {
			warehouses = await getWarehouses({ activa: true });
		} catch {
			warehouses = [];
		}
	});

	function resetForm() {
		form = { fecha_devolucion: hoy, estado_visual: '', nombre_tecnico_retiro: '', id_bodega_destino: 0 };
		formError = '';
	}

	async function buscar() {
		const serie = numeroSerie.trim();
		errorBusqueda = '';
		success = '';
		equipo = null;
		resetForm();
		if (!serie) {
			errorBusqueda = 'El número de serie es obligatorio.';
			return;
		}
		buscando = true;
		try {
			equipo = await getEquipoParaDevolucion(serie);
		} catch (err: unknown) {
			// E1: el backend responde el mensaje exacto con el estado actual del equipo
			errorBusqueda = err instanceof Error ? err.message : 'Error al buscar el equipo';
		} finally {
			buscando = false;
		}
	}

	// DD/MM/YYYY para mostrar la fecha elegida
	function fmtFecha(iso: string): string {
		const [y, m, d] = iso.split('-');
		return y && m && d ? `${d}/${m}/${y}` : iso;
	}

	function validar(): string {
		if (!form.fecha_devolucion) return 'La fecha de devolución es obligatoria.';
		if (form.fecha_devolucion > hoy) return 'La fecha de devolución no puede ser una fecha futura.';
		if (!form.estado_visual) return 'Debe seleccionar el estado visual del equipo al momento de la devolución.';
		if (!form.nombre_tecnico_retiro.trim()) return 'Debe ingresar el nombre del técnico que realiza el retiro.';
		if (!form.id_bodega_destino) return 'Debe seleccionar una bodega de destino para continuar.';
		return '';
	}

	function solicitarConfirmacion() {
		formError = validar();
		if (!formError) showConfirm = true;
	}

	async function confirmar() {
		if (!equipo) return;
		showConfirm = false;
		guardando = true;
		formError = '';
		try {
			await registrarDevolucion(equipo.id_unidad, {
				fecha_devolucion: form.fecha_devolucion,
				estado_visual: form.estado_visual,
				nombre_tecnico_retiro: form.nombre_tecnico_retiro.trim(),
				id_bodega_destino: form.id_bodega_destino
			});
			success = `Devolución registrada: el equipo ${equipo.numero_serie} quedó En revisión.`;
			equipo = null;
			numeroSerie = '';
			resetForm();
		} catch (err: unknown) {
			formError = err instanceof Error ? err.message : 'Error al registrar la devolución';
		} finally {
			guardando = false;
		}
	}

	const nombreBodega = $derived(warehouses.find((w) => w.id_bodega === form.id_bodega_destino)?.nombre ?? '');
</script>

<div class="max-w-3xl mx-auto">
	<button onclick={() => goto('/unidades')}
		class="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-4">
		<ArrowLeft class="h-4 w-4" />
		Volver a unidades
	</button>

	<h1 class="text-xl font-bold text-foreground mb-6">Devolución de equipo desde cliente</h1>

	{#if success}
		<div class="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md p-4 text-sm mb-4">{success}</div>
	{/if}

	<div class="bg-white rounded-lg border border-border p-6 mb-4">
		<form onsubmit={(e: Event) => { e.preventDefault(); buscar(); }} class="flex items-end gap-3">
			<div class="flex-1">
				<FormField label="Número de serie (NS)" name="dev_ns" required>
					<input id="dev_ns" type="text" bind:value={numeroSerie} maxlength={80}
						class="w-full px-3 py-2 border border-border rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
						placeholder="Ingrese el NS del equipo a devolver" />
				</FormField>
			</div>
			<Button type="submit" variant="secondary" loading={buscando} disabled={buscando}>
				<Search class="h-4 w-4" />
				Buscar
			</Button>
		</form>
		{#if errorBusqueda}
			<div class="bg-red-50 border border-red-200 text-destructive text-sm rounded-md px-3 py-2 mt-4">{errorBusqueda}</div>
		{/if}
	</div>

	{#if equipo}
		<div class="bg-white rounded-lg border border-border p-6 mb-4">
			<h2 class="text-sm font-semibold text-foreground mb-4">Información del equipo</h2>
			<dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
				<div><dt class="text-muted">NS</dt><dd class="text-foreground font-mono">{equipo.numero_serie}</dd></div>
				<div><dt class="text-muted">Tipo</dt><dd class="text-foreground">{equipo.tipo ?? 'No registrado'}</dd></div>
				<div><dt class="text-muted">Marca</dt><dd class="text-foreground">{equipo.marca ?? 'No registrado'}</dd></div>
				<div><dt class="text-muted">Modelo</dt><dd class="text-foreground">{equipo.modelo ?? 'No registrado'}</dd></div>
				<div><dt class="text-muted">Cliente</dt><dd class="text-foreground">{equipo.nombre_cliente ?? 'No registrado'}</dd></div>
				<div><dt class="text-muted">Dirección de instalación</dt><dd class="text-foreground">{equipo.direccion_instalacion ?? 'No registrada'}</dd></div>
			</dl>
		</div>

		<div class="bg-white rounded-lg border border-border p-6">
			<h2 class="text-sm font-semibold text-foreground mb-4">Formulario de devolución</h2>
			<form onsubmit={(e: Event) => { e.preventDefault(); solicitarConfirmacion(); }} class="space-y-4">
				{#if formError}
					<div class="bg-red-50 border border-red-200 text-destructive text-sm rounded-md px-3 py-2">{formError}</div>
				{/if}

				<FormField label="Fecha de devolución" name="dev_fecha" required
					helper={form.fecha_devolucion ? `DD/MM/YYYY: ${fmtFecha(form.fecha_devolucion)}` : ''}>
					<input id="dev_fecha" type="date" bind:value={form.fecha_devolucion} max={hoy}
						class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
				</FormField>

				<FormField label="Estado visual del equipo" name="dev_estado" required>
					<select id="dev_estado" bind:value={form.estado_visual}
						class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
						<option value="" disabled>Seleccionar...</option>
						{#each ESTADOS_VISUALES as ev}
							<option value={ev}>{ev}</option>
						{/each}
					</select>
				</FormField>

				<FormField label="Nombre del técnico que realiza el retiro" name="dev_tecnico" required>
					<input id="dev_tecnico" type="text" bind:value={form.nombre_tecnico_retiro}
						class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
				</FormField>

				<FormField label="Bodega de destino" name="dev_bodega" required>
					<select id="dev_bodega" bind:value={form.id_bodega_destino}
						class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
						<option value={0} disabled>Seleccionar...</option>
						{#each warehouses as wh}
							<option value={wh.id_bodega}>{wh.nombre}</option>
						{/each}
					</select>
				</FormField>

				<div class="flex justify-end gap-3 pt-2">
					<Button variant="secondary" type="button" onclick={() => { equipo = null; resetForm(); }}>Cancelar</Button>
					<Button type="submit" loading={guardando} disabled={guardando}>Confirmar devolución</Button>
				</div>
			</form>
		</div>
	{/if}
</div>

<ConfirmDialog
	open={showConfirm}
	title="Confirmar devolución"
	message={equipo
		? `El equipo ${equipo.numero_serie} pasará de Instalado en cliente a En revisión en la bodega ${nombreBodega}. ¿Desea continuar?`
		: ''}
	confirmlabel="Confirmar"
	variant="primary"
	onconfirm={confirmar}
	oncancel={() => (showConfirm = false)}
/>
