import { writable, derived, get } from 'svelte/store';
import type { Usuario, RolNombre, DecodedToken } from '$lib/types';

interface AuthState {
	token: string | null;
	usuario: Usuario | null;
	roles: RolNombre[];
	id_empresa: number | null;
}

function decodeToken(token: string): DecodedToken | null {
	try {
		const payload = token.split('.')[1];
		return JSON.parse(atob(payload));
	} catch {
		return null;
	}
}

function createAuthStore() {
	const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('auth') : null;
	const initial: AuthState = stored
		? JSON.parse(stored)
		: { token: null, usuario: null, roles: [], id_empresa: null };

	const { subscribe, set, update } = writable<AuthState>(initial);

	function persist(state: AuthState) {
		localStorage.setItem('auth', JSON.stringify(state));
	}

	return {
		subscribe,
		login(token: string, usuario: Usuario) {
			const decoded = decodeToken(token);
			const state: AuthState = {
				token,
				usuario,
				roles: decoded?.roles ?? [],
				id_empresa: decoded?.id_empresa ?? null
			};
			set(state);
			persist(state);
		},
		logout() {
			set({ token: null, usuario: null, roles: [], id_empresa: null });
			localStorage.removeItem('auth');
		},
		setUser(usuario: Usuario) {
			update((s) => {
				const state = { ...s, usuario };
				persist(state);
				return state;
			});
		}
	};
}

export const authStore = createAuthStore();

export const isAuthenticated = derived(authStore, ($a) => $a.token !== null);
export const userRoles = derived(authStore, ($a) => $a.roles);
export const currentUser = derived(authStore, ($a) => $a.usuario);

export function hasRole(role: RolNombre): boolean {
	const store = get(authStore);
	return store.roles.includes(role);
}
