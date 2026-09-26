<script lang="ts">
	let {
		open = false,
		title = 'Confirmar',
		message = '¿Estás seguro?',
		confirmlabel = 'Confirmar',
		cancellabel = 'Cancelar',
		variant = 'destructive' as 'destructive' | 'primary',
		onconfirm,
		oncancel
	} = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) oncancel?.();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
		onclick={(e) => { if (e.target === e.currentTarget) oncancel?.(); }}
		role="dialog"
		aria-modal="true"
		aria-label={title}
	>
		<div class="bg-white rounded-lg border border-border shadow-lg w-full max-w-sm mx-4 p-6">
			<h3 class="text-base font-semibold text-foreground mb-2">{title}</h3>
			<p class="text-sm text-muted mb-6 whitespace-pre-line">{message}</p>
			<div class="flex justify-end gap-3">
				<button
					onclick={() => oncancel?.()}
					class="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-surface-alt transition-colors"
				>
					{cancellabel}
				</button>
				<button
					onclick={() => onconfirm?.()}
					class="px-4 py-2 text-sm font-medium text-white rounded-md transition-colors
						{variant === 'destructive' ? 'bg-destructive hover:bg-destructive-hover' : 'bg-accent hover:bg-accent-hover'}"
				>
					{confirmlabel}
				</button>
			</div>
		</div>
	</div>
{/if}
