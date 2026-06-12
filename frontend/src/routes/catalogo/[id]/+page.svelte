<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { getCatalog, updateCatalogItem, uploadFichaTecnica, downloadFichaTecnica } from '$lib/api/index';
	import type { TipoEquipo } from '$lib/types';
	import Button from '$lib/components/Button.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { ArrowLeft, Save, Upload, Download, FileText } from '@lucide/svelte';

	let item = $state<TipoEquipo | null>(null);
	let loading = $state(true);
	let saving = $state(false);
	let uploading = $state(false);
	let downloading = $state(false);
	let error = $state('');
	let success = $state('');

	// CU-26: todos los campos del tipo de equipo son editables
	let editForm = $state({
		nombre: '',
		categoria: '',
		marca: '',
		modelo: '',
		descripcionTecnica: '',
		unidadMedida: '',
		garantiaDias: 0
	});
	// CU-26/CU-31: null = campo 'Requiere número de serie individual' sin definir
	let requiereSerial = $state<boolean | null>(null);

	// CU-24: categorías y unidades de medida definidas en el caso de uso
	const categorias = ['ONT/ONU', 'Decodificador', 'Splitter', 'Herramienta', 'Consumible fibra óptica', 'Consumible conector', 'Consumible otro', 'Otro'];
	const unidadesMedida = ['Unidad', 'Metro', 'Rollo'];

	async function load() {
		loading = true;
		error = '';
		try {
			const data = await getCatalog({ buscar: '' });
			const found = data.find((t: TipoEquipo) => t.id_tipo_equipo === Number($page.params.id));
			item = found || null;
			if (item) {
				editForm.nombre = item.nombre;
				editForm.categoria = item.categoria ?? '';
				editForm.marca = item.marca ?? '';
				editForm.modelo = item.modelo ?? '';
				editForm.descripcionTecnica = item.descripcionTecnica ?? '';
				editForm.unidadMedida = item.unidadMedida ?? '';
				editForm.garantiaDias = item.garantiaDias ?? 0;
				// la API serializa la propiedad de la entidad (requiereSerialNumber)
				requiereSerial = item.requiereSerialNumber ?? null;
			}
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cargar';
		} finally {
			loading = false;
		}
	}

	onMount(load);

	async function handleSave() {
		saving = true;
		error = '';
		success = '';
		try {
			const payload: Record<string, unknown> = {
				nombre: editForm.nombre,
				categoria: editForm.categoria || undefined,
				marca: editForm.marca,
				modelo: editForm.modelo,
				descripcionTecnica: editForm.descripcionTecnica,
				garantiaDias: Number(editForm.garantiaDias)
			};
			if (requiereSerial !== null) payload.requiereSerialNumber = requiereSerial;
			if (requiereSerial === false) payload.unidadMedida = editForm.unidadMedida;
			await updateCatalogItem(Number($page.params.id), payload);
			success = 'Tipo de equipo actualizado';
			await load();
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al actualizar';
		} finally {
			saving = false;
		}
	}

	async function handlePdfUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		uploading = true;
		error = '';
		success = '';
		try {
			await uploadFichaTecnica(Number($page.params.id), file);
			success = 'Ficha técnica subida correctamente';
			await load();
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al subir ficha';
		} finally {
			uploading = false;
			input.value = '';
		}
	}

	// CU-30: descarga de la ficha técnica PDF
	async function handlePdfDownload() {
		if (!item) return;
		downloading = true;
		error = '';
		try {
			await downloadFichaTecnica(item.id_tipo_equipo, item.fichaTecnicaNombre ?? 'ficha-tecnica.pdf');
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al descargar ficha';
		} finally {
			downloading = false;
		}
	}
</script>

<div class="max-w-3xl mx-auto">
	<button onclick={() => goto('/catalogo')}
		class="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-4">
		<ArrowLeft class="h-4 w-4" />
		Volver al catálogo
	</button>

	{#if loading}
		<div class="bg-white rounded-lg border border-border p-6 animate-pulse space-y-4">
			<div class="h-6 w-48 bg-surface-alt rounded"></div>
			<div class="h-4 w-full bg-surface-alt rounded"></div>
		</div>
	{:else if !item}
		<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm">Tipo de equipo no encontrado</div>
	{:else}
		<div class="bg-white rounded-lg border border-border">
			<div class="px-6 py-4 border-b border-border">
				<h1 class="text-lg font-semibold text-foreground">{item.nombre}</h1>
				<Badge class="mt-1">{item.categoria || 'Sin categoría'}</Badge>
			</div>

			{#if error}
				<div class="mx-6 mt-4 bg-red-50 border border-red-200 text-destructive text-sm rounded-md px-3 py-2">{error}</div>
			{/if}
			{#if success}
				<div class="mx-6 mt-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-md px-3 py-2">{success}</div>
			{/if}

			<form onsubmit={(e: Event) => { e.preventDefault(); handleSave(); }} class="p-6 space-y-4">
				<FormField label="Nombre" name="nom" required helper="3-80 caracteres">
					<input id="nom" type="text" required bind:value={editForm.nombre}
						class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
				</FormField>

				<FormField label="Categoría" name="cat">
					<select id="cat" bind:value={editForm.categoria}
						class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
						<option value="">Sin categoría</option>
						{#each categorias as cat}
							<option value={cat}>{cat}</option>
						{/each}
					</select>
				</FormField>

				<!-- CU-26: marca y modelo editables -->
				<div class="grid grid-cols-2 gap-4">
					<FormField label="Marca" name="mar" required helper="2-50 caracteres">
						<input id="mar" type="text" required bind:value={editForm.marca}
							class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
							placeholder="Ej: Huawei" />
					</FormField>
					<FormField label="Modelo" name="mod" required helper="1-50 caracteres">
						<input id="mod" type="text" required bind:value={editForm.modelo}
							class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
							placeholder="Ej: EG8145V5" />
					</FormField>
				</div>

				<FormField label="Descripción técnica" name="desc" helper="Opcional, máximo 500 caracteres">
					<textarea id="desc" bind:value={editForm.descripcionTecnica} rows="2"
						class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"></textarea>
				</FormField>

				<!-- CU-26 Excepción 1: el backend bloquea el cambio si existen unidades registradas -->
				<FormField label="¿Requiere número de serie individual?" name="nat" required>
					{#if requiereSerial === null}
						<!-- CU-31 Excepción 1: tipo sin la naturaleza definida -->
						<div class="mb-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-md px-3 py-2">
							Este tipo de equipo no tiene definido el campo. Seleccione una opción para corregir la configuración.
						</div>
					{/if}
					<div class="flex gap-4">
						<label class="flex items-center gap-2 text-sm cursor-pointer">
							<input type="radio" name="requiere_serie" bind:group={requiereSerial} value={true} class="text-accent" />
							Sí (individualizable, con serie)
						</label>
						<label class="flex items-center gap-2 text-sm cursor-pointer">
							<input type="radio" name="requiere_serie" bind:group={requiereSerial} value={false} class="text-accent" />
							No (consumible / volumen)
						</label>
					</div>
				</FormField>

				<!-- CU-24/CU-26: la unidad de medida solo aplica (y es obligatoria) si NO requiere serie -->
				{#if requiereSerial === false}
					<FormField label="Unidad de medida" name="um" required>
						<select id="um" required bind:value={editForm.unidadMedida}
							class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
							<option value="" disabled>Seleccionar...</option>
							{#each unidadesMedida as um}
								<option value={um}>{um}</option>
							{/each}
						</select>
					</FormField>
				{/if}

				<FormField label="Duración de garantía (días)" name="gar" helper="0 a 3650; 0 significa sin garantía">
					<input id="gar" type="number" min={0} max={3650} step={1} bind:value={editForm.garantiaDias}
						class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
				</FormField>

				<div class="flex justify-end gap-3 pt-2">
					<Button variant="secondary" onclick={() => goto('/catalogo')} type="button">Cancelar</Button>
					<Button type="submit" loading={saving}>
						<Save class="h-4 w-4" />
						Guardar cambios
					</Button>
				</div>
			</form>

			<!-- CU-29/CU-30: ficha técnica adjunta, con nombre del archivo y descarga -->
			<div class="px-6 py-4 border-t border-border">
				<h3 class="text-sm font-semibold text-foreground mb-3">Ficha técnica</h3>
				{#if item.fichaTecnicaPdfUrl}
					<div class="flex items-center gap-3 mb-3">
						<span class="inline-flex items-center gap-1.5 text-sm text-foreground">
							<FileText class="h-4 w-4 text-muted" />
							{item.fichaTecnicaNombre ?? 'ficha-tecnica.pdf'}
						</span>
						<Button variant="secondary" size="sm" onclick={handlePdfDownload} loading={downloading}>
							<Download class="h-4 w-4" />
							Descargar ficha técnica
						</Button>
					</div>
				{:else}
					<p class="text-sm text-muted mb-3">Este tipo de equipo no tiene ficha técnica adjunta.</p>
				{/if}
				<label class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-surface-alt cursor-pointer transition-colors">
					<Upload class="h-4 w-4" />
					{uploading ? 'Subiendo...' : item.fichaTecnicaPdfUrl ? 'Reemplazar ficha técnica (PDF, máx 5MB)' : 'Adjuntar ficha técnica (PDF, máx 5MB)'}
					<input type="file" accept=".pdf" onchange={handlePdfUpload} class="hidden" disabled={uploading} />
				</label>
			</div>
		</div>
	{/if}
</div>
