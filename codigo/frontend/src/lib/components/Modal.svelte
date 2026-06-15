<script lang="ts">
	let {
		children,
		open = false,
		title = '',
		onclose
	} = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) onclose?.();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
		onclick={(e) => { if (e.target === e.currentTarget) onclose?.(); }}
		role="dialog"
		aria-modal="true"
		aria-label={title || 'Diálogo'}
	>
		<div class="bg-white rounded-lg border border-border shadow-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
			{#if title}
				<div class="flex items-center justify-between px-6 py-4 border-b border-border">
					<h2 class="text-base font-semibold text-foreground">{title}</h2>
					<button
						onclick={() => onclose?.()}
						class="p-1 rounded-md hover:bg-surface-alt text-muted hover:text-foreground transition-colors"
						aria-label="Cerrar"
					>
						<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M18 6L6 18M6 6l12 12" />
						</svg>
					</button>
				</div>
			{/if}
			<div class="p-6">
				{@render children?.()}
			</div>
		</div>
	</div>
{/if}
