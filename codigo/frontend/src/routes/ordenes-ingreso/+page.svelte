<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getOrdenesIngreso, createOrdenIngreso, getProveedores, getCatalog, getWarehouses, getWarehousesByEmpresa, getEmpresas } from '$lib/api/index';
	import type { OrdenIngreso, Proveedor, TipoEquipo, Bodega } from '$lib/types';
	import { authStore, userRoles } from '$lib/stores/auth';
	import SearchInput from '$lib/components/SearchInput.svelte';
	import Button from '$lib/components/Button.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { Plus, RotateCw, Trash2 } from '@lucide/svelte';

	let ordenes = $state<OrdenIngreso[]>([]);
	let loading = $state(true);
	let error = $state('');
	let search = $state('');

	// CU-53: filtros por estado, nombre del proveedor, rango de fechas y empresa destinataria
	let filters = $state({ estado: '', proveedor: '', fecha_desde: '', fecha_hasta: '', id_empresa: '' });
	// CU-53: estados literales exactos de orden_ingreso.estado
	const ESTADOS = ['Pendiente de recepción', 'Recepción parcial', 'Completada'];
	const hayFiltros = $derived(
		!!(search || filters.estado || filters.proveedor || filters.fecha_desde || filters.fecha_hasta || filters.id_empresa)
	);

	// CU-52: catálogos que alimentan el formulario (proveedores activos, tipos de equipo
	// activos, bodegas y empresas). Se cargan por separado porque no todos los roles
	// tienen permiso sobre todos los endpoints.
	let proveedores = $state<Proveedor[]>([]);
	let tiposEquipo = $state<TipoEquipo[]>([]);
	let bodegas = $state<Bodega[]>([]);
	let empresas = $state<{ id: number; nombre: string }[]>([]);

	type ItemForm = { id_tipo_equipo: number; cantidad_esperada: number; garantia_dias: number };
	let showCreate = $state(false);
	let createForm = $state({ id_proveedor: 0, numero_documento: '', fecha_documento: '', id_empresa_destino: 0, id_bodega_destino: 0, items: [] as ItemForm[] });
	let createError = $state('');
	let creating = $state(false);
	let successMessage = $state('');

	const roles = $derived($userRoles);
	// CU-52: los tres actores del caso de uso pueden consultar y registrar órdenes
	const puedeCrear = $derived(roles.some((r) => ['SUPERUSUARIO', 'ADMIN', 'ADMIN_BODEGA'].includes(r)));
	// CU-52: solo el Superusuario elige la empresa destinataria; para el resto es la suya
	// y la fija el backend (mismo patrón que CU-41 en bodegas). Además `/api/empresas`
	// solo responde a ADMIN y SUPERUSUARIO, así que un ADMIN_BODEGA no tendría opciones.
	const esSuperusuario = $derived(roles.includes('SUPERUSUARIO'));
	// CU-52: la bodega de destino debe estar activa y pertenecer a la empresa destinataria.
	// `GET /bodegas` devuelve el NOMBRE de la empresa, no su id, así que para el Superusuario
	// se piden las bodegas de la empresa elegida con `GET /bodegas/empresa/:id` (mismo patrón
	// que CU-20 en transferencias, y ya devuelve solo las activas); para el resto de roles
	// basta `GET /bodegas`, que el backend acota a su propia empresa.
	let bodegasDestino = $state<Bodega[]>([]);
	$effect(() => {
		const idEmpresa = createForm.id_empresa_destino;
		if (!esSuperusuario) {
			bodegasDestino = bodegas.filter((b) => b.activa);
			return;
		}
		bodegasDestino = [];
		if (idEmpresa) {
			getWarehousesByEmpresa(idEmpresa).then((b) => (bodegasDestino = b)).catch(() => (bodegasDestino = []));
		}
	});

	async function load() {
		loading = true;
		error = '';
		try {
			// CU-53: el backend aplica los filtros; el no-superusuario ignora id_empresa
			ordenes = await getOrdenesIngreso({
				buscar: search || undefined,
				estado: filters.estado || undefined,
				proveedor: filters.proveedor || undefined,
				fecha_desde: filters.fecha_desde || undefined,
				fecha_hasta: filters.fecha_hasta || undefined,
				id_empresa: filters.id_empresa ? Number(filters.id_empresa) : undefined
			});
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cargar órdenes de ingreso';
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		load();
		// CU-52 precondición: debe existir al menos un proveedor registrado y una bodega activa
		try { proveedores = await getProveedores({ activa: true }); } catch { /* sin permiso */ }
		try { tiposEquipo = (await getCatalog({ activo: true })) as TipoEquipo[]; } catch { /* sin permiso */ }
		try { bodegas = (await getWarehouses()) as Bodega[]; } catch { /* sin permiso */ }
		// CU-52: solo el Superusuario necesita el listado de empresas; para el resto el
		// endpoint responde 403 y se ignora sin romper el resto del formulario
		try { empresas = await getEmpresas(); } catch { /* sin permiso */ }
	});

	// CU-53: cualquier cambio de filtro recarga el listado
	$effect(() => {
		search;
		filters.estado; filters.proveedor; filters.fecha_desde; filters.fecha_hasta; filters.id_empresa;
		load();
	});

	function openCreate() {
		// CU-52: para los roles que no son Superusuario la empresa destinataria es la propia;
		// se preselecciona para poder filtrar las bodegas de destino
		createForm = { id_proveedor: 0, numero_documento: '', fecha_documento: '', id_empresa_destino: esSuperusuario ? 0 : ($authStore.id_empresa ?? 0), id_bodega_destino: 0, items: [] };
		createError = '';
		successMessage = '';
		showCreate = true;
	}

	function addItem() {
		createForm.items = [...createForm.items, { id_tipo_equipo: 0, cantidad_esperada: 1, garantia_dias: 0 }];
	}

	function removeItem(index: number) {
		createForm.items = createForm.items.filter((_, i) => i !== index);
	}

	// CU-52: la garantía en días toma por defecto el valor del tipo de equipo elegido
	function onTipoEquipoChange(index: number, idTipo: number) {
		createForm.items[index].id_tipo_equipo = idTipo;
		const tipo = tiposEquipo.find((t) => t.id_tipo_equipo === idTipo);
		if (tipo && tipo.garantiaDias !== null && tipo.garantiaDias !== undefined) {
			createForm.items[index].garantia_dias = tipo.garantiaDias;
		}
		createForm.items = [...createForm.items];
	}

	// CU-52: al cambiar la empresa destinataria se descarta la bodega elegida antes
	function onEmpresaChange(idEmpresa: number) {
		createForm.id_empresa_destino = idEmpresa;
		createForm.id_bodega_destino = 0;
	}

	async function handleCreate() {
		createError = '';

		// CU-52 Excepción 1: si el listado de ítems está vacío o falta un campo obligatorio,
		// se indica el error específico y no se registra la orden. El backend repite estas
		// validaciones (ValidationPipe + service) como red de seguridad.
		if (!createForm.id_proveedor) {
			createError = 'Debe seleccionar un proveedor.';
			return;
		}
		if (!createForm.numero_documento.trim()) {
			createError = 'El número de documento es obligatorio.';
			return;
		}
		if (!createForm.fecha_documento) {
			createError = 'La fecha del documento es obligatoria.';
			return;
		}
		if (esSuperusuario && !createForm.id_empresa_destino) {
			createError = 'Debe seleccionar la empresa destinataria.';
			return;
		}
		if (!createForm.id_bodega_destino) {
			createError = 'Debe seleccionar la bodega de destino.';
			return;
		}
		if (createForm.items.length === 0) {
			createError = 'Debe agregar al menos un ítem a la orden de ingreso.';
			return;
		}
		for (let i = 0; i < createForm.items.length; i++) {
			const item = createForm.items[i];
			if (!item.id_tipo_equipo) {
				createError = `El ítem ${i + 1} no tiene tipo de equipo seleccionado.`;
				return;
			}
			if (!item.cantidad_esperada || item.cantidad_esperada < 1) {
				createError = `La cantidad esperada del ítem ${i + 1} debe ser mayor a 0.`;
				return;
			}
			if (item.garantia_dias < 0 || item.garantia_dias > 3650) {
				createError = `La garantía del ítem ${i + 1} debe estar entre 0 y 3650 días.`;
				return;
			}
		}

		creating = true;
		try {
			const payload: Record<string, unknown> = {
				id_proveedor: createForm.id_proveedor,
				numero_documento: createForm.numero_documento.trim(),
				fecha_documento: createForm.fecha_documento,
				id_bodega_destino: createForm.id_bodega_destino,
				items: createForm.items
			};
			// CU-52: solo el Superusuario indica la empresa; para el resto la fija el backend
			if (esSuperusuario) payload.id_empresa_destino = createForm.id_empresa_destino;
			const result = await createOrdenIngreso(payload);
			showCreate = false;
			// CU-52 poscondición: la orden queda registrada con su correlativo asignado
			successMessage = `Orden de ingreso ${result.correlativo} creada exitosamente.`;
			setTimeout(() => (successMessage = ''), 5000);
			await load();
		} catch (err: unknown) {
			createError = err instanceof Error ? err.message : 'Error al crear la orden de ingreso';
		} finally {
			creating = false;
		}
	}

	// CU-53: badge por estado, mismo patrón que /transferencias
	const estadoBadge: Record<string, string> = {
		'Pendiente de recepción': 'warning',
		'Recepción parcial': 'info',
		Completada: 'success'
	};

	// CU-53: la fecha del documento se muestra en formato DD/MM/YYYY.
	// `fecha_documento` es un DATE (YYYY-MM-DD) sin hora: se parte el string en vez de
	// usar new Date() para no correr un día por zona horaria.
	function fmtFecha(fecha: string): string {
		if (!fecha) return '—';
		const [y, m, d] = fecha.slice(0, 10).split('-');
		return d && m && y ? `${d}/${m}/${y}` : fecha;
	}
</script>

<div class="max-w-6xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-xl font-bold text-foreground">Órdenes de ingreso</h1>
		<div class="flex items-center gap-3">
			<Button variant="secondary" onclick={load}>
				<RotateCw class="h-4 w-4" />
				Actualizar
			</Button>
			{#if puedeCrear}
				<Button onclick={openCreate}>
					<Plus class="h-4 w-4" />
					Nueva orden de ingreso
				</Button>
			{/if}
		</div>
	</div>

	<!-- CU-53: filtros por estado, nombre del proveedor, rango de fechas y empresa -->
	<div class="flex flex-wrap items-center gap-3 mb-4">
		<div class="flex-1 min-w-[16rem] max-w-xs">
			<SearchInput bind:value={search} placeholder="Buscar por correlativo o N.o documento..." />
		</div>
		<input type="text" bind:value={filters.proveedor} placeholder="Nombre del proveedor..."
			aria-label="Filtrar por nombre del proveedor"
			class="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
		<select bind:value={filters.estado} aria-label="Filtrar por estado"
			class="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
			<option value="">Todos los estados</option>
			{#each ESTADOS as e}
				<option value={e}>{e}</option>
			{/each}
		</select>
		<!-- CU-53: la empresa destinataria solo la filtra el Superusuario; el resto ya
		     está acotado a la suya por el backend -->
		{#if esSuperusuario}
			<select bind:value={filters.id_empresa} aria-label="Filtrar por empresa destinataria"
				class="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
				<option value="">Todas las empresas</option>
				{#each empresas as emp}
					<option value={String(emp.id)}>{emp.nombre}</option>
				{/each}
			</select>
		{/if}
		<input type="date" bind:value={filters.fecha_desde} aria-label="Fecha del documento desde"
			class="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
		<input type="date" bind:value={filters.fecha_hasta} aria-label="Fecha del documento hasta"
			class="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
	</div>

	{#if successMessage}
		<div class="bg-green-50 border border-green-200 text-green-800 rounded-md p-4 text-sm mb-4">{successMessage}</div>
	{/if}

	{#if error}
		<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4">{error}</div>
	{/if}

	<div class="bg-white rounded-lg border border-border overflow-hidden">
		{#if loading}
			<div class="p-8 text-center text-sm text-muted">Cargando...</div>
		{:else if ordenes.length === 0}
			<!-- CU-53 Excepción 1: listado vacío con el mensaje de filtros sin coincidencias.
			     Sin filtros aplicados no es la excepción del CU, sino que aún no hay órdenes. -->
			<EmptyState
				message={hayFiltros ? 'No se encontraron órdenes con los filtros seleccionados.' : 'No se encontraron órdenes de ingreso.'}
				action={!hayFiltros && puedeCrear ? openCreate : undefined}
				actionlabel={!hayFiltros && puedeCrear ? 'Nueva orden de ingreso' : undefined} />
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border bg-surface/50">
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Correlativo</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Proveedor</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">N.o documento</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Fecha doc.</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Empresa</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Bodega</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Estado</th>
							<th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Total de ítems</th>
						</tr>
					</thead>
					<tbody>
						<!-- CU-53: al seleccionar una orden se abre su ficha de detalle -->
						{#each ordenes as o, i}
							<tr class="border-b border-border transition-colors hover:bg-surface-alt/50 cursor-pointer {i % 2 === 0 ? 'bg-white' : 'bg-surface/30'}"
								onclick={() => goto(`/ordenes-ingreso/${o.id_orden}`)}>
								<td class="px-4 py-3 font-mono font-medium text-primary">{o.correlativo}</td>
								<td class="px-4 py-3 text-foreground">{o.nombre_proveedor ?? '—'}</td>
								<td class="px-4 py-3 text-muted font-mono">{o.numero_documento}</td>
								<td class="px-4 py-3 text-muted">{fmtFecha(o.fecha_documento)}</td>
								<td class="px-4 py-3 text-muted">{o.nombre_empresa ?? '—'}</td>
								<td class="px-4 py-3 text-muted">{o.nombre_bodega ?? '—'}</td>
								<td class="px-4 py-3">
									<Badge variant={(estadoBadge[o.estado] ?? 'default') as 'default' | 'success' | 'warning' | 'danger' | 'info'}>{o.estado}</Badge>
								</td>
								<td class="px-4 py-3 text-muted">{o.detalles?.length ?? 0}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<!-- CU-52: modal de registro de una orden de ingreso desde proveedor -->
<Modal title="Nueva orden de ingreso" open={showCreate} onclose={() => (showCreate = false)}>
	<form onsubmit={(e: Event) => { e.preventDefault(); handleCreate(); }} class="space-y-4">
		{#if createError}
			<!-- CU-52 Excepción 1: se indica el error específico y no se registra la orden -->
			<div class="bg-red-50 border border-red-200 text-destructive text-sm rounded-md px-3 py-2">{createError}</div>
		{/if}

		<!-- CU-52 precondición: debe existir al menos un proveedor registrado -->
		<FormField label="Proveedor" name="proveedor" required
			helper={proveedores.length === 0 ? 'No hay proveedores activos registrados. Registre uno en Proveedores.' : ''}>
			<select id="proveedor" bind:value={createForm.id_proveedor} required disabled={proveedores.length === 0}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary">
				<option value={0} disabled>Seleccione un proveedor</option>
				{#each proveedores as p}
					<option value={p.id_proveedor}>{p.nombre_comercial} ({p.rut})</option>
				{/each}
			</select>
		</FormField>

		<FormField label="Número de documento" name="numdoc" required helper="1–30 caracteres alfanuméricos">
			<input id="numdoc" type="text" required bind:value={createForm.numero_documento} maxlength={30} pattern="^[a-zA-Z0-9]+$"
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
				placeholder="Ej: FAC12345" />
		</FormField>

		<!-- CU-52: la fecha del documento no puede ser futura (el backend la revalida) -->
		<FormField label="Fecha del documento" name="fechadoc" required helper="No puede ser fecha futura">
			<input id="fechadoc" type="date" required bind:value={createForm.fecha_documento} max={new Date().toISOString().split('T')[0]}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
		</FormField>

		<!-- CU-52: la empresa destinataria (Finet o Cable Mágico) solo la elige el
		     Superusuario; para el resto de roles es la del usuario autenticado -->
		{#if esSuperusuario}
			<FormField label="Empresa destinataria" name="empresa" required>
				<select id="empresa" value={createForm.id_empresa_destino} required
					onchange={(e) => onEmpresaChange(Number((e.target as HTMLSelectElement).value))}
					class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary">
					<option value={0} disabled>Seleccione empresa</option>
					{#each empresas as emp}
						<option value={emp.id}>{emp.nombre}</option>
					{/each}
				</select>
			</FormField>
		{/if}

		<FormField label="Bodega de destino" name="bodega" required helper="Solo bodegas activas de la empresa">
			<select id="bodega" bind:value={createForm.id_bodega_destino} required disabled={bodegasDestino.length === 0}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary">
				<option value={0} disabled>
					{bodegasDestino.length === 0 ? (esSuperusuario ? 'Seleccione primero una empresa' : 'No hay bodegas activas en su empresa') : 'Seleccione una bodega'}
				</option>
				{#each bodegasDestino as b}
					<option value={b.id_bodega}>{b.nombre}</option>
				{/each}
			</select>
		</FormField>

		<!-- CU-52: listado de ítems esperados; se agrega al menos uno con tipo de equipo
		     del catálogo activo, cantidad esperada (> 0) y garantía en días (0–3650) -->
		<div>
			<div class="flex items-center justify-between mb-2">
				<span class="text-sm font-medium text-foreground">Ítems de la orden</span>
				<Button type="button" variant="secondary" onclick={addItem}>
					<Plus class="h-3 w-3" />
					Agregar ítem
				</Button>
			</div>

			{#if createForm.items.length === 0}
				<div class="border border-dashed border-border rounded-md p-4 text-center text-sm text-muted">
					No hay ítems. Presione "Agregar ítem" para comenzar.
				</div>
			{:else}
				<div class="space-y-3">
					{#each createForm.items as item, idx}
						<div class="border border-border rounded-md p-3 bg-surface/30 space-y-2">
							<div class="flex items-center justify-between">
								<span class="text-xs font-semibold text-muted">Ítem {idx + 1}</span>
								<button type="button" onclick={() => removeItem(idx)} title="Quitar ítem"
									class="text-destructive hover:text-destructive/80 transition-colors">
									<Trash2 class="h-4 w-4" />
								</button>
							</div>

							<div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
								<div>
									<label for="tipo_{idx}" class="block text-xs font-medium text-muted mb-1">Tipo de equipo</label>
									<select id="tipo_{idx}" value={item.id_tipo_equipo} required
										onchange={(e) => onTipoEquipoChange(idx, Number((e.target as HTMLSelectElement).value))}
										class="w-full px-2 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary">
										<option value={0} disabled>Seleccione</option>
										{#each tiposEquipo as te}
											<option value={te.id_tipo_equipo}>{te.nombre}</option>
										{/each}
									</select>
								</div>
								<div>
									<label for="cant_{idx}" class="block text-xs font-medium text-muted mb-1">Cantidad esperada</label>
									<input id="cant_{idx}" type="number" bind:value={item.cantidad_esperada} min={1} required
										class="w-full px-2 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
								</div>
								<div>
									<label for="gar_{idx}" class="block text-xs font-medium text-muted mb-1">Garantía (días)</label>
									<input id="gar_{idx}" type="number" bind:value={item.garantia_dias} min={0} max={3650} required
										class="w-full px-2 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
										placeholder={item.id_tipo_equipo ? String(tiposEquipo.find((t) => t.id_tipo_equipo === item.id_tipo_equipo)?.garantiaDias ?? 0) : '0'} />
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<div class="flex justify-end gap-3 pt-2">
			<Button variant="secondary" onclick={() => (showCreate = false)} type="button">Cancelar</Button>
			<Button type="submit" loading={creating}>Crear orden</Button>
		</div>
	</form>
</Modal>
