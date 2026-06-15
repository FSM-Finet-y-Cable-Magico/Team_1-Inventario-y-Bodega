<script lang="ts">
	let {
		variant = 'default' as 'default' | 'success' | 'warning' | 'danger' | 'info',
		class: className = '',
		children
	} = $props();

	const colors: Record<string, string> = {
		default: 'bg-surface-alt text-foreground',
		success: 'bg-emerald-50 text-emerald-700',
		warning: 'bg-amber-50 text-amber-700',
		danger: 'bg-red-50 text-destructive',
		info: 'bg-blue-50 text-blue-700'
	};
</script>

<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium {colors[variant]} {className}">
	{@render children?.()}
</span>
