import { d as ensure_array_like, e as escape_html, c as attr } from "../../../chunks/root.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
import "../../../chunks/auth.js";
import { R as Rotate_cw } from "../../../chunks/rotate-cw.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let filters = {
      accion: "",
      entidad_afectada: "",
      fecha_inicio: "",
      fecha_fin: ""
    };
    const acciones = [
      "LOGIN",
      "LOGOUT",
      "CREAR",
      "ACTUALIZAR",
      "DESACTIVAR",
      "RESTABLECER_PASSWORD"
    ];
    const entidades = [
      "usuario",
      "bodega",
      "transferencia_equipo",
      "unidad_equipo",
      "tipo_equipo",
      "stock_consumible"
    ];
    $$renderer2.push(`<div class="max-w-6xl mx-auto"><div class="flex items-center justify-between mb-6"><h1 class="text-xl font-bold text-foreground">Auditoría</h1> <button class="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-surface-alt transition-colors">`);
    Rotate_cw($$renderer2, { class: "h-4 w-4" });
    $$renderer2.push(`<!----> Actualizar</button></div> <div class="flex flex-wrap items-center gap-3 mb-4">`);
    $$renderer2.select(
      {
        value: filters.accion,
        class: "px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
      },
      ($$renderer3) => {
        $$renderer3.option({ value: "" }, ($$renderer4) => {
          $$renderer4.push(`Todas las acciones`);
        });
        $$renderer3.push(`<!--[-->`);
        const each_array = ensure_array_like(acciones);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let a = each_array[$$index];
          $$renderer3.option({ value: a }, ($$renderer4) => {
            $$renderer4.push(`${escape_html(a)}`);
          });
        }
        $$renderer3.push(`<!--]-->`);
      }
    );
    $$renderer2.push(` `);
    $$renderer2.select(
      {
        value: filters.entidad_afectada,
        class: "px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
      },
      ($$renderer3) => {
        $$renderer3.option({ value: "" }, ($$renderer4) => {
          $$renderer4.push(`Todas las entidades`);
        });
        $$renderer3.push(`<!--[-->`);
        const each_array_1 = ensure_array_like(entidades);
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let e = each_array_1[$$index_1];
          $$renderer3.option({ value: e }, ($$renderer4) => {
            $$renderer4.push(`${escape_html(e)}`);
          });
        }
        $$renderer3.push(`<!--]-->`);
      }
    );
    $$renderer2.push(` <input type="date"${attr("value", filters.fecha_inicio)} class="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" aria-label="Fecha inicio"/> <input type="date"${attr("value", filters.fecha_fin)} class="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" aria-label="Fecha fin"/></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="bg-white rounded-lg border border-border overflow-hidden">`);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="p-8 text-center text-sm text-muted">Cargando...</div>`);
    }
    $$renderer2.push(`<!--]--></div></div>`);
  });
}
export {
  _page as default
};
