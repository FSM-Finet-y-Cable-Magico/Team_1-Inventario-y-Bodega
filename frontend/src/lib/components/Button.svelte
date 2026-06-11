<script lang="ts">
	let {
		children,
		variant = 'primary' as 'primary' | 'secondary' | 'destructive' | 'ghost',
		size = 'default' as 'default' | 'sm' | 'lg',
		disabled = false,
		loading = false,
		type = 'button' as 'button' | 'submit',
		onclick = undefined as ((e: MouseEvent) => void) | undefined,
		...rest
	} = $props();

	const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

	const variants: Record<string, string> = {
		primary: 'bg-accent text-white hover:bg-accent-hover',
		secondary: 'bg-white text-foreground border border-border hover:bg-surface-alt',
		destructive: 'bg-destructive text-white hover:bg-destructive-hover',
		ghost: 'text-foreground hover:bg-surface-alt'
	};

	const sizes: Record<string, string> = {
		sm: 'px-2.5 py-1.5 text-xs',
		default: 'px-4 py-2 text-sm',
		lg: 'px-6 py-3 text-base'
	};
</script>

<button
	{type}
	{disabled}
	onclick={onclick}
	class="{base} {variants[variant]} {sizes[size]}"
	{...rest}
>
	{#if loading}
		<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
		</svg>
	{/if}
	{@render children?.()}
</button>
