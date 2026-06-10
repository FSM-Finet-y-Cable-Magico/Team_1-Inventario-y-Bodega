import { s as spread_props, c as attr } from "../../../chunks/root.js";
import "../../../chunks/auth.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
import { I as Icon } from "../../../chunks/Icon.js";
function Log_in($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "m10 17 5-5-5-5" }],
    ["path", { "d": "M15 12H3" }],
    ["path", { "d": "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" }]
  ];
  Icon($$renderer, spread_props([{ name: "log-in" }, props, { iconNode }]));
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let nombre_usuario = "";
    let password = "";
    let loading = false;
    $$renderer2.push(`<div class="min-h-dvh flex items-center justify-center bg-surface px-4"><div class="w-full max-w-sm"><div class="text-center mb-8"><h1 class="text-2xl font-bold text-primary">Inventario y Bodega</h1> <p class="text-sm text-muted mt-1">Sistema de gestión de inventario</p></div> <form class="bg-white rounded-lg border border-border p-6 shadow-sm space-y-4"><h2 class="text-lg font-semibold text-foreground">Iniciar sesión</h2> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div><label for="nombre_usuario" class="block text-sm font-medium text-foreground mb-1">Usuario</label> <input id="nombre_usuario" type="text"${attr("value", nombre_usuario)} required="" autocomplete="username" class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="nombre de usuario"/></div> <div><label for="password" class="block text-sm font-medium text-foreground mb-1">Contraseña</label> <input id="password" type="password"${attr("value", password)} required="" autocomplete="current-password" class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="contraseña"/></div> <button type="submit"${attr("disabled", loading, true)} class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white rounded-md text-sm font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors">`);
    {
      $$renderer2.push("<!--[-1-->");
      Log_in($$renderer2, { class: "h-4 w-4" });
      $$renderer2.push(`<!----> <span>Ingresar</span>`);
    }
    $$renderer2.push(`<!--]--></button></form></div></div>`);
  });
}
export {
  _page as default
};
