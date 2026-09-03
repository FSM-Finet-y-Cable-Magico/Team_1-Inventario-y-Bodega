<script lang="ts">
	import {
		LayoutDashboard,
		Users,
		Package,
		Wrench,
		Warehouse,
		ArrowLeftRight,
		BarChart3,
		ScrollText,
		LogOut,
		PanelLeftClose,
		PanelLeft,
		Building2
	} from '@lucide/svelte';
	import { authStore, userRoles } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { logout as apiLogout } from '$lib/api/index';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	type RolNombre = 'SUPERUSUARIO' | 'ADMIN' | 'ADMIN_BODEGA' | 'TECNICO_TERRENO';

	interface NavItem {
		label: string;
		icon: typeof Building2;
		path: string;
		roles: RolNombre[];
	}

	const navItems: NavItem[] = [
		{ label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['SUPERUSUARIO', 'ADMIN'] },
		{ label: 'Usuarios', icon: Users, path: '/usuarios', roles: ['SUPERUSUARIO', 'ADMIN'] },
		{ label: 'Catálogo', icon: Package, path: '/catalogo', roles: ['SUPERUSUARIO', 'ADMIN', 'ADMIN_BODEGA'] },
		{ label: 'Unidades', icon: Wrench, path: '/unidades', roles: ['SUPERUSUARIO', 'ADMIN', 'ADMIN_BODEGA', 'TECNICO_TERRENO'] },
		{ label: 'Bodegas', icon: Warehouse, path: '/bodegas', roles: ['SUPERUSUARIO', 'ADMIN', 'ADMIN_BODEGA'] },
		{ label: 'Transferencias', icon: ArrowLeftRight, path: '/transferencias', roles: ['SUPERUSUARIO', 'ADMIN'] },
		{ label: 'Reportes', icon: BarChart3, path: '/reportes', roles: ['SUPERUSUARIO', 'ADMIN', 'ADMIN_BODEGA'] },
		{ label: 'Auditoría', icon: ScrollText, path: '/auditoria', roles: ['SUPERUSUARIO', 'ADMIN'] }
	];

	let collapsed = $state(false);

	let roles: RolNombre[] = [];
	userRoles.subscribe((r) => (roles = r));

	const visibleItems = $derived(navItems.filter((item) => item.roles.some((r) => roles.includes(r))));

	function isActive(path: string) {
		return $page.url.pathname.startsWith(path);
	}

	// CU-12: cerrar sesión requiere confirmación explícita
	let showLogoutConfirm = $state(false);

	async function handleLogout() {
		showLogoutConfirm = false;
		try { await apiLogout('manual'); } catch { /* ignore */ }
		authStore.logout();
		goto('/login');
	}
</script>

<aside
	class="bg-white border-r border-border flex flex-col transition-all duration-200"
	class:collapsed
	style={collapsed ? 'width: 60px' : 'width: 240px'}
>
	<div class="flex items-center h-14 px-4 border-b border-border">
		{#if !collapsed}
			<div class="flex items-center gap-2 flex-1 min-w-0">
				<Building2 class="h-5 w-5 text-accent shrink-0" />
				<span class="text-sm font-semibold text-primary truncate">Inventario</span>
			</div>
		{:else}
			<Building2 class="h-5 w-5 text-accent mx-auto" />
		{/if}
		<button
			onclick={() => (collapsed = !collapsed)}
			class="p-1 rounded-md hover:bg-surface-alt text-muted hover:text-foreground transition-colors shrink-0"
			aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
		>
			{#if collapsed}
				<PanelLeft class="h-4 w-4" />
			{:else}
				<PanelLeftClose class="h-4 w-4" />
			{/if}
		</button>
	</div>

	<nav class="flex-1 py-2 overflow-y-auto space-y-0.5 px-2">
		{#each visibleItems as item}
			<a
				href={item.path}
				class="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors"
				class:bg-surface-alt={isActive(item.path)}
				class:text-accent={isActive(item.path)}
				class:text-foreground={!isActive(item.path)}
				class:hover:bg-surface-alt={!isActive(item.path)}
			>
				<item.icon class="h-4 w-4 shrink-0" />
				{#if !collapsed}
					<span class="truncate">{item.label}</span>
				{/if}
			</a>
		{/each}
	</nav>

	<div class="border-t border-border p-2">
		<button
			onclick={() => (showLogoutConfirm = true)}
			class="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-muted hover:text-destructive hover:bg-red-50 transition-colors"
		>
			<LogOut class="h-4 w-4 shrink-0" />
			{#if !collapsed}
				<span>Cerrar sesión</span>
			{/if}
		</button>
	</div>
</aside>

<!-- CU-12: confirmación de cierre de sesión -->
<ConfirmDialog
	open={showLogoutConfirm}
	title="Cerrar sesión"
	message="¿Está seguro que desea cerrar su sesión?"
	confirmlabel="Confirmar"
	cancellabel="Cancelar"
	onconfirm={handleLogout}
	oncancel={() => (showLogoutConfirm = false)}
/>
