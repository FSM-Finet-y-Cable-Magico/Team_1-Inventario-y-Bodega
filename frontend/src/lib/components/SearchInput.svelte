<script lang="ts">
	import { Search } from '@lucide/svelte';

	let {
		value = $bindable(''),
		placeholder = 'Buscar...',
		onsearch
	} = $props();

	let timer: ReturnType<typeof setTimeout>;

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		value = target.value;
		clearTimeout(timer);
		timer = setTimeout(() => onsearch?.(value), 300);
	}
</script>

<div class="relative">
	<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
	<input
		type="text"
		{placeholder}
		value={value}
		oninput={handleInput}
		class="w-full pl-9 pr-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
		aria-label={placeholder}
	/>
</div>
