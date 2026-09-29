<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getUnits, getCatalog, createUnit, getWarehouses, ingresarConsumible, updateConsumible } from '$lib/api/index';
	import { currentUser, userRoles } from '$lib/stores/auth';
	import type { UnidadEquipo, TipoEquipo } from '$lib/types';
	import Button from '$lib/components/Button.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import SearchInput from '$lib/components/SearchInput.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { Plus, RotateCw } from '@lucide/svelte';

	let units = $state<UnidadEquipo[]>([]);
	let tipos = $state<TipoEquipo[]>([]);
	let bodegas = $state<{ id_bodega: number; nombre: string }[]>([]);
	let loading = $state(true);
	let error = $state('');
	let search = $state('');
	let estadoFilter = $state('');

	let showCreate = $state(false);
	// CU-28/CU-31: modal de detalle/edición de consumible
	let consumableSeleccionado = $state<UnidadEquipo | null>(null);
	let consumableForm = $state({ cantidad_disponible: 0, umbral_minimo: 0 });
	let consumableSaving = $state(false);
	let consumableError = $state('');
	let consumableSuccess = $state('');
	// CU-32: NS, MAC, tipo (solo con serie), empresa (automática), bodega,
	// proveedor, fecha de adquisición (no futura) y observaciones iniciales
	let createForm = $state({
		id_tipo_equipo: 0, numero_serie: '', mac_address: '', modelo: '',
		proveedor: '', fecha_adquisicion: '', observaciones: '', id_bodega_actual: 0
	});
	// CU-28/CU-31: los consumibles se ingresan por cantidad
	let cantidadConsumible = $state(1);
	const hoyISO = new Date().toISOString().slice(0, 10);
	// CU-31: el tipo seleccionado determina si se pide NS o cantidad
	const tipoSeleccionado = $derived(tipos.find((t) => t.id_tipo_equipo === createForm.id_tipo_equipo) ?? null);
	const esConsumible = $derived(tipoSeleccionado?.requiereSerialNumber === false);
	const roles = $derived($userRoles);
	const puedeCrearUnidad = $derived(roles.some((r) => ['SUPERUSUARIO', 'ADMIN', 'ADMIN_BODEGA'].includes(r)));
	const puedeVerEnRevision = $derived(roles.some((r) => ['SUPERUSUARIO', 'ADMIN', 'ADMIN_BODEGA'].includes(r)));
	// CU-71: la devolución desde cliente la registran los 4 roles
	const puedeRegistrarDevolucion = $derived(roles.some((r) => ['SUPERUSUARIO', 'ADMIN', 'ADMIN_BODEGA', 'TECNICO_TERRENO'].includes(r)));
	const puedeEditarConsumible = $derived(roles.some((r) => ['SUPERUSUARIO', 'ADMIN', 'ADMIN_BODEGA'].includes(r)));
	let createError = $state('');
	let creating = $state(false);
	let createSuccess = $state('');

	// Deben coincidir exactamente (tildes incluidas) con los estados del backend
	const estados = [
		'En bodega', 'Asignado a técnico', 'Instalado en cliente',
		'En revisión', 'En préstamo externo', 'Dado de baja'
	];

	const estadoBadge: Record<string, string> = {
		'En bodega': 'default',
		'Asignado a técnico': 'info',
		'Instalado en cliente': 'success',
		'En revisión': 'warning',
		'En préstamo externo': 'info',
		'Dado de baja': 'danger'
	};

	async function load() {
		loading = true;
		error = '';
		try {
			const [unitsData, tiposData, bodegasData] = await Promise.all([
				getUnits({ estado: estadoFilter || undefined, buscar: search || undefined }),
				getCatalog({ activo: true }),
				getWarehouses({ activa: true })
			]);
			units = unitsData;
			tipos = tiposData;
			bodegas = bodegasData;
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cargar unidades';
		} finally {
			loading = false;
		}
	}

	onMount(load);

	$effect(() => { search; estadoFilter; load(); });

	async function handleCreate() {
		createError = '';
		creating = true;
		try {
			if (esConsumible) {
				// CU-28/CU-31: consumible → cantidad y unidad de medida, sin NS
				const res = await ingresarConsumible({
					id_tipo_equipo: createForm.id_tipo_equipo,
					id_bodega: createForm.id_bodega_actual,
					cantidad: Number(cantidadConsumible)
				});
				createSuccess = res?.message ?? 'Stock de consumible ingresado correctamente';
			} else {
				await createUnit(createForm as unknown as Record<string, unknown>);
				createSuccess = 'Unidad registrada correctamente';
			}
			showCreate = false;
			createForm = { id_tipo_equipo: 0, numero_serie: '', mac_address: '', modelo: '',
				proveedor: '', fecha_adquisicion: '', observaciones: '', id_bodega_actual: 0 };
			cantidadConsumible = 1;
			await load();
		} catch (err: unknown) {
			createError = err instanceof Error ? err.message : 'Error al registrar unidad';
		} finally {
			creating = false;
		}
	}

	function abrirConsumible(unit: UnidadEquipo) {
		consumableSeleccionado = unit;
		consumableForm = {
			cantidad_disponible: unit.cantidad_disponible ?? 0,
			umbral_minimo: unit.umbral_minimo ?? 0
		};
		consumableError = '';
		consumableSuccess = '';
	}

	function cerrarConsumible() {
		consumableSeleccionado = null;
		consumableError = '';
		consumableSuccess = '';
	}

	function nombreBodega(idBodega: number | null | undefined) {
		if (!idBodega) return '-';
		return bodegas.find((b) => b.id_bodega === idBodega)?.nombre || `ID: ${idBodega}`;
	}

	async function handleSaveConsumible() {
		if (!consumableSeleccionado?.id_stock_consumible) return;
		consumableError = '';
		consumableSuccess = '';
		consumableSaving = true;
		try {
			const res = await updateConsumible(consumableSeleccionado.id_stock_consumible, {
				cantidad_disponible: Number(consumableForm.cantidad_disponible),
				umbral_minimo: Number(consumableForm.umbral_minimo)
			});
			consumableSuccess = res?.message ?? 'Stock actualizado correctamente';
			await load();
			setTimeout(() => { consumableSuccess = ''; }, 3000);
		} catch (err: unknown) {
			consumableError = err instanceof Error ? err.message : 'Error al actualizar stock';
		} finally {
			consumableSaving = false;
		}
	}
</script>

<div class="max-w-6xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-xl font-bold text-foreground">Unidades de Equipo</h1>
		<div class="flex items-center gap-3">
			<Button variant="secondary" onclick={load}>
				<RotateCw class="h-4 w-4" />
				Actualizar
			</Button>
			{#if puedeRegistrarDevolucion}
				<Button variant="secondary" onclick={() => goto('/unidades/devolucion')}>
					Devolución desde cliente
				</Button>
			{/if}
			{#if puedeVerEnRevision}
				<Button variant="secondary" onclick={() => goto('/unidades/en-revision')}>
					Equipos en revisión
				</Button>
			{/if}
			{#if puedeCrearUnidad}
				<Button onclick={() => (showCreate = true)}>
					<Plus class="h-4 w-4" />
					Registrar unidad
				</Button>
			{/if}
		</div>
	</div>

	<div class="flex items-center gap-4 mb-4">
		<div class="flex-1 max-w-xs">
			<SearchInput bind:value={search} placeholder="Buscar por serie, modelo o tipo..." maxlength={30} />
		</div>
		<select bind:value={estadoFilter}
			class="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
			<option value="">Todos los estados</option>
			{#each estados as est}
				<option value={est}>{est}</option>
			{/each}
		</select>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4">{error}</div>
	{/if}
	{#if createSuccess}
		<div class="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md p-4 text-sm mb-4">{createSuccess}</div>
	{/if}

	<div class="bg-white rounded-lg border border-border overflow-hidden">
		{#if loading}
			<div class="p-8 text-center text-sm text-muted">Cargando...</div>
		{:else if units.length === 0 && search}
			<!-- CU-33 Excepción 1: la búsqueda no coincide con ningún NS registrado -->
			<EmptyState message="Número de serie no encontrado." />
		{:else if units.length === 0}
			<EmptyState
				message="No hay unidades registradas"
				action={puedeCrearUnidad ? () => (showCreate = true) : undefined}
				actionlabel={puedeCrearUnidad ? 'Registrar unidad' : undefined}
			/>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border bg-surface/50">
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Serie</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Tipo</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Modelo</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Estado</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Garantía</th>
							<th class="text-right px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#each units as unit, i}
							<tr class="border-b border-border transition-colors hover:bg-surface-alt/50 {i % 2 === 0 ? 'bg-white' : 'bg-surface/30'}">
								<td class="px-4 py-3 font-mono text-sm font-medium text-foreground">{unit.numero_serie}</td>
								<td class="px-4 py-3 text-foreground">{unit.tipo_equipo?.nombre || '-'}</td>
								<td class="px-4 py-3 text-muted">{unit.modelo || '-'}</td>
								<td class="px-4 py-3">
									<Badge variant={estadoBadge[unit.estado] as 'default' | 'info' | 'success' | 'warning' | 'danger'}>
										{unit.estado}
									</Badge>
								</td>
								<td class="px-4 py-3">
									<!-- CU-38: fecha calculada, 'Sin garantía' (duración 0) o no calculable -->
									<!-- CU-28/CU-31: los consumibles no tienen garantía individual -->
									{#if unit.es_consumible}
										<span class="text-xs text-muted">No aplica</span>
									{:else if unit.garantia_no_calculable}
										<span class="text-xs text-amber-700">Garantía no calculable</span>
									{:else if unit.fecha_venc_garantia}
										<span class="text-xs text-muted">{unit.fecha_venc_garantia}</span>
									{:else}
										<span class="text-xs text-muted">Sin garantía</span>
									{/if}
								</td>
									<td class="px-4 py-3 text-right">
										{#if unit.es_consumible}
											<Button variant="ghost" size="sm" onclick={() => abrirConsumible(unit)}>
												Ver detalle
											</Button>
										{:else}
											<Button variant="ghost" size="sm" onclick={() => goto(`/unidades/${unit.id_unidad}`)}>
												Ver detalle
											</Button>
										{/if}
									</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<Modal title="Registrar ítem de inventario" open={showCreate} onclose={() => (showCreate = false)}>
	<form onsubmit={(e: Event) => { e.preventDefault(); handleCreate(); }} class="space-y-4">
		{#if createError}
			<div class="bg-red-50 border border-red-200 text-destructive text-sm rounded-md px-3 py-2">{createError}</div>
		{/if}

		<!-- CU-31: la naturaleza del tipo (NS=Sí/No) determina los campos a pedir -->
		<FormField label="Tipo de equipo" name="tipo" required>
			<select id="tipo" required bind:value={createForm.id_tipo_equipo}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
				<option value={0} disabled>Seleccionar tipo</option>
				{#each tipos as t}
					<option value={t.id_tipo_equipo}>
						{t.nombre} {t.categoria ? `(${t.categoria})` : ''} — {t.requiereSerialNumber === false ? 'Consumible' : t.requiereSerialNumber === true ? 'Con N° de serie' : 'Sin definir'}
					</option>
				{/each}
			</select>
		</FormField>

		<!-- CU-17/CU-32: la empresa propietaria es la del usuario autenticado -->
		<FormField label="Empresa propietaria" name="emp">
			<input id="emp" type="text" disabled value={$currentUser?.empresa?.nombre ?? '—'}
				class="w-full px-3 py-2 border border-border rounded-md text-sm bg-surface-alt text-muted" />
		</FormField>

		<FormField label="Bodega de destino" name="bod" required>
			<select id="bod" required bind:value={createForm.id_bodega_actual}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
				<option value={0} disabled>Seleccionar bodega</option>
				{#each bodegas as b}
					<option value={b.id_bodega}>{b.nombre}</option>
				{/each}
			</select>
		</FormField>

		{#if esConsumible}
			<!-- CU-28/CU-31: consumible → cantidad (entero > 0) y unidad de medida -->
			<div class="grid grid-cols-2 gap-4">
				<FormField label="Cantidad" name="cant" required helper="Número entero positivo mayor a cero">
					<input id="cant" type="number" required min={1} bind:value={cantidadConsumible}
						class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
				</FormField>
				<FormField label="Unidad de medida" name="um_cons">
					<input id="um_cons" type="text" disabled value={tipoSeleccionado?.unidadMedida ?? '—'}
						class="w-full px-3 py-2 border border-border rounded-md text-sm bg-surface-alt text-muted" />
				</FormField>
			</div>
		{:else}
			<!-- CU-28/CU-32: el formato del NS lo valida el sistema
			     (4-30 caracteres, solo A-Z, 0-9 y guión) -->
			<!-- CU-28: el NS se asigna y valida al registrar la unidad física -->
			<FormField label="Número de serie" name="serie" required
				helper="4-30 caracteres, solo mayúsculas (A-Z), números (0-9) y guión (-)">
				<input id="serie" type="text" required
					minlength={4} maxlength={30} pattern={"[A-Z0-9-]{4,30}"}
					bind:value={createForm.numero_serie}
					class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
					placeholder="Ej: ONT-2024-0001" />
			</FormField>

			<FormField label="Dirección MAC" name="mac" helper="Opcional, formato XX:XX:XX:XX:XX:XX">
				<input id="mac" type="text" bind:value={createForm.mac_address}
					class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
					placeholder="A1:B2:C3:D4:E5:F6" />
			</FormField>

			<FormField label="Modelo" name="mod">
				<input id="mod" type="text" bind:value={createForm.modelo}
					class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
					placeholder="Ej: HG8245H" />
			</FormField>

			<div class="grid grid-cols-2 gap-4">
				<FormField label="Proveedor" name="prov">
					<input id="prov" type="text" bind:value={createForm.proveedor} maxlength={80}
						class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
						placeholder="Nombre del proveedor" />
				</FormField>
				<!-- CU-32: la fecha de adquisición no puede ser futura -->
				<FormField label="Fecha adquisición" name="fec_adq">
					<input id="fec_adq" type="date" bind:value={createForm.fecha_adquisicion} max={hoyISO}
						class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
				</FormField>
			</div>

			<!-- CU-38: el vencimiento de garantía lo calcula el sistema
			     (fecha de adquisición + días de garantía del tipo de equipo) -->
			<FormField label="Observaciones iniciales" name="obs" helper="Opcional, máximo 300 caracteres">
				<textarea id="obs" bind:value={createForm.observaciones} maxlength={300} rows="2"
					class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"></textarea>
			</FormField>
		{/if}

		<div class="flex justify-end gap-3 pt-2">
			<Button variant="secondary" onclick={() => (showCreate = false)} type="button">Cancelar</Button>
			<Button type="submit" loading={creating}>{esConsumible ? 'Ingresar consumible' : 'Registrar unidad'}</Button>
		</div>
	</form>
</Modal>

<!-- CU-28/CU-31: detalle y edición de stock consumible -->
<Modal
	title="Detalle de consumible"
	open={consumableSeleccionado !== null}
	onclose={cerrarConsumible}>
	{#if consumableSeleccionado}
		<form onsubmit={(e: Event) => { e.preventDefault(); handleSaveConsumible(); }} class="space-y-4">
			{#if consumableError}
				<div class="bg-red-50 border border-red-200 text-destructive text-sm rounded-md px-3 py-2">{consumableError}</div>
			{/if}
			{#if consumableSuccess}
				<div class="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-md px-3 py-2">{consumableSuccess}</div>
			{/if}

			<div class="grid grid-cols-2 gap-4 text-sm">
				<div>
					<span class="text-muted">Tipo de equipo</span>
					<p class="text-foreground font-medium">{consumableSeleccionado.tipo_equipo?.nombre || '-'}</p>
				</div>
				<div>
					<span class="text-muted">Bodega</span>
					<p class="text-foreground font-medium">{nombreBodega(consumableSeleccionado.id_bodega_actual)}</p>
				</div>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<FormField label="Cantidad disponible" name="cons_cant" required helper="Número mayor o igual a cero">
					<input id="cons_cant" type="number" required min={0}
						bind:value={consumableForm.cantidad_disponible}
						disabled={!puedeEditarConsumible}
						class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-surface-alt disabled:text-muted" />
				</FormField>
				<FormField label="Unidad de medida" name="cons_um">
					<input id="cons_um" type="text" disabled value={consumableSeleccionado.unidad_medida || '—'}
						class="w-full px-3 py-2 border border-border rounded-md text-sm bg-surface-alt text-muted" />
				</FormField>
			</div>

			<FormField label="Umbral mínimo" name="cons_umbral" helper="0 = sin alerta; máximo 9999">
				<input id="cons_umbral" type="number" min={0} max={9999}
					bind:value={consumableForm.umbral_minimo}
					disabled={!puedeEditarConsumible}
					class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-surface-alt disabled:text-muted" />
			</FormField>

			<div class="flex justify-end gap-3 pt-2">
				<Button variant="secondary" onclick={cerrarConsumible} type="button">Cerrar</Button>
				{#if puedeEditarConsumible}
					<Button type="submit" loading={consumableSaving}>Guardar cambios</Button>
				{/if}
			</div>
		</form>
	{/if}
</Modal>
