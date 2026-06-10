import { g as goto } from "./client.js";
import { a as authStore } from "./auth.js";
import { i as get } from "./exports.js";
const BASE = "/api";
class ApiError extends Error {
  status;
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
async function request(method, path, body) {
  const token = get(authStore).token;
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : void 0
  });
  if (res.status === 401) {
    authStore.logout();
    goto();
    throw new ApiError("Sesión expirada", 401);
  }
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = typeof data === "object" && data !== null ? data.message || "Error del servidor" : "Error del servidor";
    throw new ApiError(msg, res.status);
  }
  return data;
}
const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  patch: (path, body) => request("PATCH", path, body),
  delete: (path) => request("DELETE", path)
};
async function restablecerPassword(id) {
  return api.post(`/auth/restablecer-password/${id}`);
}
function getUsers(activo, buscar) {
  const params = new URLSearchParams();
  params.set("activo", String(activo));
  if (buscar) params.set("buscar", buscar);
  const qs = params.toString();
  return api.get(`/usuario${qs ? "?" + qs : ""}`);
}
function deleteUser(id) {
  return api.delete(`/usuario/${id}`);
}
function getRoles() {
  return api.get("/roles");
}
function getCatalog(params) {
  const qs = new URLSearchParams();
  if (params?.categoria) qs.set("categoria", params.categoria);
  if (params?.activo !== void 0) qs.set("activo", String(params.activo));
  if (params?.buscar) qs.set("buscar", params.buscar);
  const query = qs.toString();
  return api.get(`/catalogo${query ? "?" + query : ""}`);
}
function deleteCatalogItem(id) {
  return api.delete(`/catalogo/${id}`);
}
function getUnits(params) {
  const qs = new URLSearchParams();
  if (params?.estado) qs.set("estado", params.estado);
  if (params?.buscar) qs.set("buscar", params.buscar);
  const query = qs.toString();
  return api.get(`/unidades${query ? "?" + query : ""}`);
}
function getWarehouses(params) {
  const qs = new URLSearchParams();
  if (params?.activa !== void 0) qs.set("activa", String(params.activa));
  if (params?.nombre) qs.set("nombre", params.nombre);
  const query = qs.toString();
  return api.get(`/bodegas${query ? "?" + query : ""}`);
}
function deactivateWarehouse(id) {
  return api.delete(`/bodegas/${id}/desactivar`);
}
function getTransfers(params) {
  const qs = "";
  return api.get(`/transferencias${qs}`);
}
export {
  getCatalog as a,
  deleteCatalogItem as b,
  getTransfers as c,
  deactivateWarehouse as d,
  getUnits as e,
  getUsers as f,
  getWarehouses as g,
  getRoles as h,
  deleteUser as i,
  restablecerPassword as r
};
