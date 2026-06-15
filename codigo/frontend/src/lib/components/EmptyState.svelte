<script lang="ts">
	let {
		message = 'No hay datos disponibles',
		action = undefined,
		actionlabel = undefined
	}: { message?: string; action?: (() => void) | undefined; actionlabel?: string | undefined } = $props();
</script>

<div class="flex flex-col items-center justify-center py-12 text-center">
	<svg class="h-12 w-12 text-muted mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
		<path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
	</svg>
	<p class="text-sm text-muted">{message}</p>
	{#if action}
		<button
			onclick={action}
			class="mt-3 text-sm font-medium text-accent hover:text-accent-hover transition-colors"
		>
			{actionlabel || 'Crear'}
		</button>
	{/if}
</div>
