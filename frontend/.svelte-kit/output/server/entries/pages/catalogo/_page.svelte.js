import { s as spread_props, d as ensure_array_like, e as escape_html, a as attr_class, c as attr } from "../../../chunks/root.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
import { a as getCatalog, b as deleteCatalogItem } from "../../../chunks/index.js";
import { B as Button, M as Modal } from "../../../chunks/Modal.js";
import { F as FormField } from "../../../chunks/FormField.js";
import { S as SearchInput } from "../../../chunks/SearchInput.js";
import { B as Badge } from "../../../chunks/Badge.js";
import { P as Plus, E as EmptyState } from "../../../chunks/EmptyState.js";
import { C as ConfirmDialog } from "../../../chunks/ConfirmDialog.js";
import { R as Rotate_cw } from "../../../chunks/rotate-cw.js";
import { I as Icon } from "../../../chunks/Icon.js";
import { P as Pencil, T as Trash_2 } from "../../../chunks/trash-2.js";
function File_text($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "path",
      {
        "d": "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"
      }
    ],
    ["path", { "d": "M14 2v5a1 1 0 0 0 1 1h5" }],
    ["path", { "d": "M10 9H8" }],
    ["path", { "d": "M16 13H8" }],
    ["path", { "d": "M16 17H8" }]
  ];
  Icon($$renderer, spread_props([{ name: "file-text" }, props, { iconNode }]));
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let items = [];
    let loading = true;
    let error = "";
    let search = "";
    let categFilter = "";
    let showCreate = false;
    let createForm = { nombre: "", categoria: "", requiereSerialNumber: true };
    let creating = false;
    let deletingItem = null;
    const categorias = [
      "ONT/ONU",
      "Decodificador",
      "Splitter",
      "Router",
      "Fuente de poder",
      "Fibra óptica",
      "Conector",
      "Otro"
    ];
    async function load() {
      loading = true;
      error = "";
      try {
        items = await getCatalog({
          activo: true,
          buscar: search || void 0,
          categoria: categFilter || void 0
        });
      } catch (err) {
        error = err instanceof Error ? err.message : "Error al cargar catálogo";
      } finally {
        loading = false;
      }
    }
    async function handleDelete() {
      if (!deletingItem) return;
      try {
        await deleteCatalogItem(deletingItem.id_tipo_equipo);
        await load();
      } catch (err) {
        error = err instanceof Error ? err.message : "Error al desactivar equipo";
      } finally {
        deletingItem = null;
      }
    }
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<div class="max-w-6xl mx-auto"><div class="flex items-center justify-between mb-6"><h1 class="text-xl font-bold text-foreground">Catálogo de Equipos</h1> <div class="flex items-center gap-3">`);
      Button($$renderer3, {
        variant: "secondary",
        onclick: load,
        children: ($$renderer4) => {
          Rotate_cw($$renderer4, { class: "h-4 w-4" });
          $$renderer4.push(`<!----> Actualizar`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      Button($$renderer3, {
        onclick: () => showCreate = true,
        children: ($$renderer4) => {
          Plus($$renderer4, { class: "h-4 w-4" });
          $$renderer4.push(`<!----> Nuevo tipo`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----></div></div> <div class="flex items-center gap-4 mb-4"><div class="flex-1 max-w-xs">`);
      SearchInput($$renderer3, {
        placeholder: "Buscar por nombre...",
        get value() {
          return search;
        },
        set value($$value) {
          search = $$value;
          $$settled = false;
        }
      });
      $$renderer3.push(`<!----></div> `);
      $$renderer3.select(
        {
          value: categFilter,
          class: "px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
        },
        ($$renderer4) => {
          $$renderer4.option({ value: "" }, ($$renderer5) => {
            $$renderer5.push(`Todas las categorías`);
          });
          $$renderer4.push(`<!--[-->`);
          const each_array = ensure_array_like(categorias);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let cat = each_array[$$index];
            $$renderer4.option({ value: cat }, ($$renderer5) => {
              $$renderer5.push(`${escape_html(cat)}`);
            });
          }
          $$renderer4.push(`<!--]-->`);
        }
      );
      $$renderer3.push(`</div> `);
      if (error) {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4">${escape_html(error)}</div>`);
      } else {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]--> <div class="bg-white rounded-lg border border-border overflow-hidden">`);
      if (loading) {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<div class="p-8 text-center text-sm text-muted">Cargando...</div>`);
      } else if (items.length === 0) {
        $$renderer3.push("<!--[1-->");
        EmptyState($$renderer3, {
          message: "No hay tipos de equipo registrados",
          action: () => showCreate = true,
          actionlabel: "Crear tipo"
        });
      } else {
        $$renderer3.push("<!--[-1-->");
        $$renderer3.push(`<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="border-b border-border bg-surface/50"><th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Nombre</th><th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Categoría</th><th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Naturaleza</th><th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Ficha técnica</th><th class="text-right px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Acciones</th></tr></thead><tbody><!--[-->`);
        const each_array_1 = ensure_array_like(items);
        for (let i = 0, $$length = each_array_1.length; i < $$length; i++) {
          let item = each_array_1[i];
          $$renderer3.push(`<tr${attr_class(`border-b border-border transition-colors hover:bg-surface-alt/50 ${i % 2 === 0 ? "bg-white" : "bg-surface/30"}`)}><td class="px-4 py-3 font-medium text-foreground">${escape_html(item.nombre)}</td><td class="px-4 py-3">`);
          Badge($$renderer3, {
            children: ($$renderer4) => {
              $$renderer4.push(`<!---->${escape_html(item.categoria || "Sin categoría")}`);
            }
          });
          $$renderer3.push(`<!----></td><td class="px-4 py-3">`);
          Badge($$renderer3, {
            variant: item.requiere_serie_individual ? "info" : "default",
            children: ($$renderer4) => {
              $$renderer4.push(`<!---->${escape_html(item.requiere_serie_individual ? "Individualizable" : "Consumible")}`);
            }
          });
          $$renderer3.push(`<!----></td><td class="px-4 py-3">`);
          if (item.ficha_tecnica_pdf_url) {
            $$renderer3.push("<!--[0-->");
            $$renderer3.push(`<a${attr("href", item.ficha_tecnica_pdf_url)} target="_blank" class="inline-flex items-center gap-1 text-accent hover:text-accent-hover">`);
            File_text($$renderer3, { class: "h-4 w-4" });
            $$renderer3.push(`<!----> <span class="text-xs">Ver PDF</span></a>`);
          } else {
            $$renderer3.push("<!--[-1-->");
            $$renderer3.push(`<span class="text-muted text-xs">Sin ficha</span>`);
          }
          $$renderer3.push(`<!--]--></td><td class="px-4 py-3 text-right"><div class="flex items-center justify-end gap-1"><button class="p-1.5 rounded-md hover:bg-surface-alt text-muted hover:text-foreground transition-colors" aria-label="Editar">`);
          Pencil($$renderer3, { class: "h-4 w-4" });
          $$renderer3.push(`<!----></button> <button class="p-1.5 rounded-md hover:bg-red-50 text-muted hover:text-destructive transition-colors" aria-label="Desactivar">`);
          Trash_2($$renderer3, { class: "h-4 w-4" });
          $$renderer3.push(`<!----></button></div></td></tr>`);
        }
        $$renderer3.push(`<!--]--></tbody></table></div>`);
      }
      $$renderer3.push(`<!--]--></div></div> `);
      Modal($$renderer3, {
        title: "Nuevo tipo de equipo",
        open: showCreate,
        onclose: () => showCreate = false,
        children: ($$renderer4) => {
          $$renderer4.push(`<form class="space-y-4">`);
          {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]--> `);
          FormField($$renderer4, {
            label: "Nombre",
            name: "nom",
            required: true,
            children: ($$renderer5) => {
              $$renderer5.push(`<input id="nom" type="text" required=""${attr("value", createForm.nombre)} class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Ej: ONT Huawei"/>`);
            }
          });
          $$renderer4.push(`<!----> `);
          FormField($$renderer4, {
            label: "Categoría",
            name: "cat",
            children: ($$renderer5) => {
              $$renderer5.select(
                {
                  id: "cat",
                  value: createForm.categoria,
                  class: "w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                },
                ($$renderer6) => {
                  $$renderer6.option({ value: "" }, ($$renderer7) => {
                    $$renderer7.push(`Sin categoría`);
                  });
                  $$renderer6.push(`<!--[-->`);
                  const each_array_2 = ensure_array_like(categorias);
                  for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
                    let cat = each_array_2[$$index_2];
                    $$renderer6.option({ value: cat }, ($$renderer7) => {
                      $$renderer7.push(`${escape_html(cat)}`);
                    });
                  }
                  $$renderer6.push(`<!--]-->`);
                }
              );
            }
          });
          $$renderer4.push(`<!----> `);
          FormField($$renderer4, {
            label: "Naturaleza",
            name: "nat",
            children: ($$renderer5) => {
              $$renderer5.push(`<div class="flex gap-4"><label class="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="naturaleza"${attr("checked", createForm.requiereSerialNumber === true, true)}${attr("value", true)} class="text-accent"/> Individualizable (con serie)</label> <label class="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="naturaleza"${attr("checked", createForm.requiereSerialNumber === false, true)}${attr("value", false)} class="text-accent"/> Consumible / Volumen</label></div>`);
            }
          });
          $$renderer4.push(`<!----> <div class="flex justify-end gap-3 pt-2">`);
          Button($$renderer4, {
            variant: "secondary",
            onclick: () => showCreate = false,
            type: "button",
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Cancelar`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----> `);
          Button($$renderer4, {
            type: "submit",
            loading: creating,
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Crear tipo`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----></div></form>`);
        }
      });
      $$renderer3.push(`<!----> `);
      ConfirmDialog($$renderer3, {
        open: deletingItem !== null,
        title: "Desactivar tipo de equipo",
        message: deletingItem ? `¿Desactivar "${deletingItem.nombre}"? Los equipos existentes no se eliminarán.` : "",
        confirmlabel: "Desactivar",
        onconfirm: handleDelete,
        oncancel: () => deletingItem = null
      });
      $$renderer3.push(`<!---->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
  });
}
export {
  _page as default
};
