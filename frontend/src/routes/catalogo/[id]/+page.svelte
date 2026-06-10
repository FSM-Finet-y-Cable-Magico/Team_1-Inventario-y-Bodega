<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { getCatalog, updateCatalogItem, uploadFichaTecnica } from '$lib/api/index';
	import type { TipoEquipo } from '$lib/types';
	import Button from '$lib/components/Button.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { ArrowLeft, Save, Upload } from '@lucide/svelte';

	let item = $state<TipoEquipo | null>(null);
	let loading = $state(true);
	let saving = $state(false);
	let uploading = $state(false);
	let error = $state('');
	let success = $state('');

	let editForm = $state({ nombre: '', categoria: '' });
	// For the radio binding, use a separate boolean
	let requiereSerial = $state(true);

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
				requiereSerial = item.requiere_serie_individual ?? true;
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
			await updateCatalogItem(Number($page.params.id), {
				nombre: editForm.nombre,
				categoria: editForm.categoria || undefined,
				requiereSerialNumber: requiereSerial
			});
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
				<FormField label="Nombre" name="nom" required>
					<input id="nom" type="text" required bind:value={editForm.nombre}
						class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
				</FormField>

				<FormField label="Categoría" name="cat">
					<select id="cat" bind:value={editForm.categoria}
						class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
						<option value="">Sin categoría</option>
						<option value="ONT/ONU">ONT/ONU</option>
						<option value="Decodificador">Decodificador</option>
						<option value="Splitter">Splitter</option>
						<option value="Router">Router</option>
						<option value="Fuente de poder">Fuente de poder</option>
						<option value="Fibra óptica">Fibra óptica</option>
						<option value="Conector">Conector</option>
						<option value="Otro">Otro</option>
					</select>
				</FormField>

				<FormField label="Naturaleza" name="nat">
					<div class="flex gap-4">
						<label class="flex items-center gap-2 text-sm cursor-pointer">
							<input type="radio" name="requiere_serie" bind:group={requiereSerial} value={true} class="text-accent" />
							Individualizable (con serie)
						</label>
						<label class="flex items-center gap-2 text-sm cursor-pointer">
							<input type="radio" name="requiere_serie" bind:group={requiereSerial} value={false} class="text-accent" />
							Consumible / Volumen
						</label>
					</div>
				</FormField>

				<div class="flex justify-end gap-3 pt-2">
					<Button variant="secondary" onclick={() => goto('/catalogo')} type="button">Cancelar</Button>
					<Button type="submit" loading={saving}>
						<Save class="h-4 w-4" />
						Guardar cambios
					</Button>
				</div>
			</form>

			<div class="px-6 py-4 border-t border-border">
				<h3 class="text-sm font-semibold text-foreground mb-3">Ficha técnica</h3>
				{#if item.ficha_tecnica_pdf_url}
					<div class="flex items-center gap-2 mb-3">
						<a href={item.ficha_tecnica_pdf_url} target="_blank"
							class="text-sm text-accent hover:text-accent-hover">Ver ficha actual</a>
					</div>
				{/if}
				<label class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-surface-alt cursor-pointer transition-colors">
					<Upload class="h-4 w-4" />
					{uploading ? 'Subiendo...' : 'Subir ficha técnica (PDF, máx 5MB)'}
					<input type="file" accept=".pdf" onchange={handlePdfUpload} class="hidden" disabled={uploading} />
				</label>
			</div>
		</div>
	{/if}
</div>
