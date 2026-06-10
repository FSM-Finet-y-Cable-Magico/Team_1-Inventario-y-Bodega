import { j as derived, w as writable } from "./exports.js";
function decodeToken(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}
function createAuthStore() {
  const stored = typeof localStorage !== "undefined" ? localStorage.getItem("auth") : null;
  const initial = stored ? JSON.parse(stored) : { token: null, usuario: null, roles: [], id_empresa: null };
  const { subscribe, set, update } = writable(initial);
  function persist(state) {
    localStorage.setItem("auth", JSON.stringify(state));
  }
  return {
    subscribe,
    login(token, usuario) {
      const decoded = decodeToken(token);
      const state = {
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
      localStorage.removeItem("auth");
    },
    setUser(usuario) {
      update((s) => {
        const state = { ...s, usuario };
        persist(state);
        return state;
      });
    }
  };
}
const authStore = createAuthStore();
derived(authStore, ($a) => $a.token !== null);
const userRoles = derived(authStore, ($a) => $a.roles);
const currentUser = derived(authStore, ($a) => $a.usuario);
export {
  authStore as a,
  currentUser as c,
  userRoles as u
};
