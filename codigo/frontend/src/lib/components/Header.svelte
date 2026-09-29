<script lang="ts">
	import { onMount } from 'svelte';
	import { currentUser } from '$lib/stores/auth';
	import { getMyDashboard, getNotificaciones, marcarNotificacionLeida, marcarTodasNotificacionesLeidas } from '$lib/api/index';
	import type { NotificacionCampana } from '$lib/types';
	import { Building2, Bell, Check, CheckCheck } from '@lucide/svelte';

	let user = $state<{ nombre_completo: string; roles?: { nombre_rol: string }[]; empresa?: { id: number; nombre: string } | null } | null>(null);
	currentUser.subscribe((u) => (user = u));

	// CU-46: campana de notificaciones con las alertas de stock mínimo
	type AlertaStock = {
		bodega: string;
		tipo_equipo: string;
		cantidad_disponible: number;
		umbral_minimo: number;
		unidad_medida?: string | null;
	};
	// CU-20: transferencias pendientes de aprobación que también se notifican aquí
	type TransferenciaPendiente = {
		id_transferencia: number;
		empresa_origen: string;
		empresa_destino: string;
		unidades: number;
		fecha: string | null;
	};
	// CU-78: solicitudes de baja definitiva pendientes de aprobación
	type BajaPendiente = {
		id_solicitud: number;
		numero_serie: string | null;
		motivo: string;
		fecha: string | null;
	};
	let alertas = $state<AlertaStock[]>([]);
	let transferenciasPendientes = $state<TransferenciaPendiente[]>([]);
	let bajasPendientes = $state<BajaPendiente[]>([]);
	let showNotificaciones = $state(false);
	// total del bloque "ad-hoc" ya existente (sin estado leída/no leída):
	// decide si se muestra el mensaje genérico previo a CU-96
	const totalAdHoc = $derived(
		alertas.length + transferenciasPendientes.length + bajasPendientes.length
	);

	// CU-96: notificaciones persistidas de la campana (préstamo vencido +
	// stock bajo umbral), con estado leída/no leída propio. Mismos actores
	// que CU-46 (ADMIN_BODEGA/ADMIN/SUPERUSUARIO); un Técnico de terreno no
	// llama al endpoint (le respondería 403).
	const puedeVerNotificaciones = $derived(
		(user?.roles ?? []).some((r) => ['SUPERUSUARIO', 'ADMIN', 'ADMIN_BODEGA'].includes(r.nombre_rol))
	);
	let notificaciones = $state<NotificacionCampana[]>([]);
	let contadorNotificaciones = $state(0);
	// total para el badge de la campana: bloque ad-hoc + notificaciones no leídas (CU-96)
	const totalNotificaciones = $derived(totalAdHoc + contadorNotificaciones);

	async function cargarAlertas() {
		try {
			const data = await getMyDashboard();
			alertas = data?.alertas_stock_minimo ?? [];
			transferenciasPendientes = data?.transferencias_pendientes ?? [];
			bajasPendientes = data?.bajas_pendientes ?? [];
		} catch {
			// sin permiso o sin sesión: la campana queda sin alertas
			alertas = [];
			transferenciasPendientes = [];
			bajasPendientes = [];
		}

		if (!puedeVerNotificaciones) {
			notificaciones = [];
			contadorNotificaciones = 0;
			return;
		}
		try {
			const data = await getNotificaciones();
			notificaciones = data.notificaciones;
			contadorNotificaciones = data.contador;
		} catch {
			notificaciones = [];
			contadorNotificaciones = 0;
		}
	}

	onMount(cargarAlertas);

	function toggleNotificaciones() {
		showNotificaciones = !showNotificaciones;
		// CU-46/CU-96: se recalculan al abrir la campana
		if (showNotificaciones) cargarAlertas();
	}

	// CU-96: marcar una notificación como leída (desaparece del contador,
	// sigue en el historial 30 días)
	async function marcarLeida(id: number) {
		try {
			await marcarNotificacionLeida(id);
			notificaciones = notificaciones.filter((n) => n.id_notificacion !== id);
			contadorNotificaciones = notificaciones.length;
		} catch {
			// si falla, se deja como estaba; el próximo refresco la vuelve a traer
		}
	}

	async function marcarTodas() {
		try {
			await marcarTodasNotificacionesLeidas();
			notificaciones = [];
			contadorNotificaciones = 0;
		} catch {
			// idem: el próximo refresco recalcula el estado real
		}
	}

	// CU-96: fecha/hora de generación DD/MM/YYYY HH:MM:SS, zona America/Santiago
	// (mismo formato que CU-94 en /dashboard)
	function fmtFechaHora(fecha: string): string {
		return new Date(fecha).toLocaleString('en-GB', {
			day: '2-digit', month: '2-digit', year: 'numeric',
			hour: '2-digit', minute: '2-digit', second: '2-digit',
			hour12: false, timeZone: 'America/Santiago'
		}).replace(',', '');
	}
</script>

<header class="h-14 bg-white border-b border-border flex items-center justify-between px-6">
	<div class="flex items-center gap-2 text-sm text-muted">
		<Building2 class="h-4 w-4" />
		<!-- CU-13/CU-16: contexto de la empresa del usuario autenticado -->
		{#if user?.empresa}
			<span class="font-medium text-foreground">{user.empresa.nombre}</span>
		{/if}
		{#if user?.roles?.length}
			<span class="text-xs bg-surface-alt text-primary-light px-2 py-0.5 rounded font-medium">
				{user.roles.map((r) => r.nombre_rol).join(', ')}
			</span>
		{/if}
	</div>

	<div class="flex items-center gap-3">
		<!-- Campana: CU-46 (stock), CU-20/CU-78 (pendientes de aprobación) y
		     CU-96 (notificaciones persistidas de préstamo vencido/stock) -->
		<div class="relative">
			<button onclick={toggleNotificaciones}
				class="relative p-1.5 rounded-md hover:bg-surface-alt text-muted hover:text-foreground transition-colors"
				aria-label="Notificaciones">
				<Bell class="h-5 w-5" />
				{#if totalNotificaciones > 0}
					<span class="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-white text-[10px] font-semibold flex items-center justify-center">
						{totalNotificaciones}
					</span>
				{/if}
			</button>

			{#if showNotificaciones}
				<!-- cierre al hacer clic fuera del panel -->
				<button class="fixed inset-0 z-10 cursor-default" onclick={() => (showNotificaciones = false)} aria-label="Cerrar notificaciones" tabindex={-1}></button>
				<div class="absolute right-0 mt-2 w-80 bg-white border border-border rounded-lg shadow-lg z-20">
					<div class="px-4 py-3 border-b border-border">
						<h3 class="text-sm font-semibold text-foreground">Notificaciones</h3>
					</div>
					<div class="max-h-80 overflow-y-auto">
						{#if totalAdHoc === 0}
							<p class="px-4 py-6 text-sm text-muted text-center">No hay alertas pendientes</p>
						{:else}
							<!-- CU-20: transferencias pendientes de aprobación -->
							{#each transferenciasPendientes as t}
								<a href="/transferencias" onclick={() => (showNotificaciones = false)}
									class="block px-4 py-3 border-b border-border last:border-0 text-sm hover:bg-surface-alt transition-colors">
									<p class="font-medium text-sky-700">🔄 Transferencia pendiente de aprobación</p>
									<p class="text-foreground mt-0.5">#{t.id_transferencia} · {t.empresa_origen} → {t.empresa_destino}</p>
									<p class="text-xs text-muted mt-0.5">
										{t.unidades} {t.unidades === 1 ? 'unidad' : 'unidades'}
									</p>
								</a>
							{/each}
							<!-- CU-78: solicitudes de baja pendientes de aprobación -->
							{#each bajasPendientes as b}
								<a href="/bajas" onclick={() => (showNotificaciones = false)}
									class="block px-4 py-3 border-b border-border last:border-0 text-sm hover:bg-surface-alt transition-colors">
									<p class="font-medium text-destructive">⛔ Solicitud de baja pendiente de aprobación</p>
									<p class="text-foreground mt-0.5">#{b.id_solicitud} · {b.numero_serie ?? 'Equipo sin número de serie'}</p>
									<p class="text-xs text-muted mt-0.5">{b.motivo}</p>
								</a>
							{/each}
							<!-- CU-46: alertas de stock bajo el umbral mínimo -->
							{#each alertas as a}
								<div class="px-4 py-3 border-b border-border last:border-0 text-sm">
									<p class="font-medium text-amber-700">⚠ Stock bajo el umbral mínimo</p>
									<p class="text-foreground mt-0.5">{a.tipo_equipo} en {a.bodega}</p>
									<p class="text-xs text-muted mt-0.5">
										Disponible: {a.cantidad_disponible}{a.unidad_medida ? ` ${a.unidad_medida}` : ''} · Umbral: {a.umbral_minimo}
									</p>
								</div>
							{/each}
						{/if}
						{#if puedeVerNotificaciones}
							<!-- CU-96: notificaciones persistidas (préstamo vencido + stock bajo umbral) -->
							{#if notificaciones.length > 0}
								<div class="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-alt/50">
									<span class="text-xs font-medium text-muted uppercase tracking-wide">Notificaciones del sistema</span>
									<button onclick={marcarTodas} class="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-light transition-colors">
										<CheckCheck class="h-3.5 w-3.5" />
										Marcar todas
									</button>
								</div>
								{#each notificaciones as n}
									<div class="flex items-start justify-between gap-2 px-4 py-3 border-b border-border last:border-0 text-sm">
										<div>
											<p class="font-medium text-amber-700">🔔 {n.tipo}</p>
											<p class="text-foreground mt-0.5">{n.descripcion}</p>
											<p class="text-xs text-muted mt-0.5">{n.empresa} · {fmtFechaHora(n.fecha_hora)}</p>
										</div>
										<button onclick={() => marcarLeida(n.id_notificacion)} title="Marcar como leída"
											class="shrink-0 p-1 rounded text-muted hover:text-primary hover:bg-surface-alt transition-colors">
											<Check class="h-4 w-4" />
										</button>
									</div>
								{/each}
							{:else}
								<!-- CU-96 Excepción 1: mensaje exacto, independiente del bloque ad-hoc de arriba -->
								<p class="px-4 py-3 text-xs text-muted text-center border-t border-border">No tiene notificaciones pendientes.</p>
							{/if}
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<span class="text-sm font-medium text-foreground">{user?.nombre_completo ?? 'Usuario'}</span>
	</div>
</header>
