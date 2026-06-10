<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getWarehouses, createWarehouse, deactivateWarehouse } from '$lib/api/index';
	import type { Bodega } from '$lib/types';
	import Button from '$lib/components/Button.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { Plus, RotateCw, Pencil, Trash2 } from '@lucide/svelte';

	let warehouses = $state<Bodega[]>([]);
	let loading = $state(true);
	let error = $state('');

	let showCreate = $state(false);
	let createForm = $state({ nombre: '', direccion: '' });
	let createError = $state('');
	let creating = $state(false);

	let deletingWh = $state<Bodega | null>(null);

	async function load() {
		loading = true;
		error = '';
		try {
			warehouses = await getWarehouses();
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al cargar bodegas';
		} finally {
			loading = false;
		}
	}

	onMount(load);

	async function handleCreate() {
		createError = '';
		creating = true;
		try {
			await createWarehouse(createForm as unknown as Record<string, unknown>);
			showCreate = false;
			createForm = { nombre: '', direccion: '' };
			await load();
		} catch (err: unknown) {
			createError = err instanceof Error ? err.message : 'Error al crear bodega';
		} finally {
			creating = false;
		}
	}

	async function handleDelete() {
		if (!deletingWh) return;
		try {
			await deactivateWarehouse(deletingWh.id_bodega);
			await load();
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Error al desactivar bodega';
		} finally {
			deletingWh = null;
		}
	}
</script>

<div class="max-w-6xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-xl font-bold text-foreground">Bodegas</h1>
		<div class="flex items-center gap-3">
			<Button variant="secondary" onclick={load}>
				<RotateCw class="h-4 w-4" />
				Actualizar
			</Button>
			<Button onclick={() => (showCreate = true)}>
				<Plus class="h-4 w-4" />
				Nueva bodega
			</Button>
		</div>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4">{error}</div>
	{/if}

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		{#if loading}
			{#each [1, 2, 3] as _}
				<div class="bg-white rounded-lg border border-border p-5 animate-pulse">
					<div class="h-5 w-32 bg-surface-alt rounded mb-3"></div>
					<div class="h-4 w-full bg-surface-alt rounded"></div>
				</div>
			{/each}
		{:else if warehouses.length === 0}
			<div class="col-span-full">
				<EmptyState message="No hay bodegas registradas" action={() => (showCreate = true)} actionlabel="Crear bodega" />
			</div>
		{:else}
			{#each warehouses as wh}
				<div class="bg-white rounded-lg border border-border p-5 hover:shadow-sm transition-shadow cursor-pointer"
					onclick={() => goto(`/bodegas/${wh.id_bodega}`)}
					role="button"
					tabindex={0}
					onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && goto(`/bodegas/${wh.id_bodega}`)}
				>
					<div class="flex items-center justify-between mb-2">
						<h3 class="text-base font-semibold text-foreground">{wh.nombre}</h3>
						<Badge variant={wh.activa ? 'success' : 'danger'}>{wh.activa ? 'Activa' : 'Inactiva'}</Badge>
					</div>
					<p class="text-sm text-muted">{wh.direccion || 'Sin dirección'}</p>
					<div class="flex items-center gap-1 mt-3 pt-3 border-t border-border">
						<button onclick={(e: Event) => { e.stopPropagation(); goto(`/bodegas/${wh.id_bodega}`); }}
							class="p-1.5 rounded-md hover:bg-surface-alt text-muted hover:text-foreground transition-colors"
							aria-label="Editar bodega">
							<Pencil class="h-4 w-4" />
						</button>
						{#if wh.activa}
							<button onclick={(e: Event) => { e.stopPropagation(); deletingWh = wh; }}
								class="p-1.5 rounded-md hover:bg-red-50 text-muted hover:text-destructive transition-colors"
								aria-label="Desactivar bodega">
								<Trash2 class="h-4 w-4" />
							</button>
						{/if}
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<Modal title="Nueva bodega" open={showCreate} onclose={() => (showCreate = false)}>
	<form onsubmit={(e: Event) => { e.preventDefault(); handleCreate(); }} class="space-y-4">
		{#if createError}
			<div class="bg-red-50 border border-red-200 text-destructive text-sm rounded-md px-3 py-2">{createError}</div>
		{/if}

		<FormField label="Nombre" name="nom" required helper="3-60 caracteres">
			<input id="nom" type="text" required bind:value={createForm.nombre}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				placeholder="Ej: Bodega Central" minlength={3} maxlength={60} />
		</FormField>

		<FormField label="Dirección" name="dir" helper="Máximo 200 caracteres">
			<input id="dir" type="text" bind:value={createForm.direccion}
				class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				placeholder="Dirección física" maxlength={200} />
		</FormField>

		<div class="flex justify-end gap-3 pt-2">
			<Button variant="secondary" onclick={() => (showCreate = false)} type="button">Cancelar</Button>
			<Button type="submit" loading={creating}>Crear bodega</Button>
		</div>
	</form>
</Modal>

<ConfirmDialog
	open={deletingWh !== null}
	title="Desactivar bodega"
	message={deletingWh ? `¿Desactivar "${deletingWh.nombre}"?` : ''}
	confirmlabel="Desactivar"
	onconfirm={handleDelete}
	oncancel={() => (deletingWh = null)}
/>
