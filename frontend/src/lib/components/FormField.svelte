<script lang="ts">
	let {
		children,
		label = '',
		name = '',
		error = '',
		helper = '',
		required = false
	} = $props();
</script>

<div class="space-y-1">
	{#if label}
		<label for={name} class="block text-sm font-medium text-foreground">
			{label}
			{#if required}<span class="text-destructive ml-0.5">*</span>{/if}
		</label>
	{/if}
	{@render children()}
	{#if error}
		<p id={name ? `${name}-error` : undefined} class="text-xs text-destructive">{error}</p>
	{:else if helper}
		<p id={name ? `${name}-helper` : undefined} class="text-xs text-muted">{helper}</p>
	{/if}
</div>
