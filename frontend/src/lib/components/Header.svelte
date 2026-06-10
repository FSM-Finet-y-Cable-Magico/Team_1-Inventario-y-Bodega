<script lang="ts">
	import { authStore, currentUser } from '$lib/stores/auth';
	import { Building2 } from '@lucide/svelte';

	let user = $state<{ nombre_completo: string; roles?: { nombre_rol: string }[] } | null>(null);
	currentUser.subscribe((u) => (user = u));
</script>

<header class="h-14 bg-white border-b border-border flex items-center justify-between px-6">
	<div class="flex items-center gap-2 text-sm text-muted">
		<Building2 class="h-4 w-4" />
		{#if user?.roles?.length}
			<span class="text-xs bg-surface-alt text-primary-light px-2 py-0.5 rounded font-medium">
				{user.roles.map((r) => r.nombre_rol).join(', ')}
			</span>
		{/if}
	</div>

	<div class="flex items-center gap-3">
		<span class="text-sm font-medium text-foreground">{user?.nombre_completo ?? 'Usuario'}</span>
	</div>
</header>
