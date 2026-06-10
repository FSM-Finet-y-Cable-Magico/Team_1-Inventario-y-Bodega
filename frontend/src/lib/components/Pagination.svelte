<script lang="ts">
	let {
		page = 1,
		total = 0,
		limit = 20,
		onpagechange
	} = $props();

	const totalPages = $derived(Math.max(1, Math.ceil(total / limit)));

	function goTo(p: number) {
		if (p >= 1 && p <= totalPages) onpagechange?.(p);
	}
</script>

{#if totalPages > 1}
	<div class="flex items-center justify-between mt-4">
		<p class="text-sm text-muted">
			Página {page} de {totalPages} ({total} registros)
		</p>
		<div class="flex items-center gap-1">
			<button
				onclick={() => goTo(page - 1)}
				disabled={page <= 1}
				class="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-surface-alt disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				Anterior
			</button>

			{#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
				{#if p === page || p === 1 || p === totalPages || Math.abs(p - page) <= 1}
					<button
						onclick={() => goTo(p)}
						class="px-3 py-1.5 text-sm border rounded-md transition-colors
							{p === page ? 'bg-accent text-white border-accent' : 'border-border hover:bg-surface-alt'}"
					>
						{p}
					</button>
				{:else if p === page - 2 || p === page + 2}
					<span class="px-1 text-muted">...</span>
				{/if}
			{/each}

			<button
				onclick={() => goTo(page + 1)}
				disabled={page >= totalPages}
				class="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-surface-alt disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				Siguiente
			</button>
		</div>
	</div>
{/if}
