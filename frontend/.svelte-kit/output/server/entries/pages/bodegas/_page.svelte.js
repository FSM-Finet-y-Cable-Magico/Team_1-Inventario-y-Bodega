import { d as ensure_array_like, e as escape_html, c as attr } from "../../../chunks/root.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
import { g as getWarehouses, d as deactivateWarehouse } from "../../../chunks/index.js";
import { B as Button, M as Modal } from "../../../chunks/Modal.js";
import { F as FormField } from "../../../chunks/FormField.js";
import { B as Badge } from "../../../chunks/Badge.js";
import { P as Plus, E as EmptyState } from "../../../chunks/EmptyState.js";
import { C as ConfirmDialog } from "../../../chunks/ConfirmDialog.js";
import { R as Rotate_cw } from "../../../chunks/rotate-cw.js";
import { P as Pencil, T as Trash_2 } from "../../../chunks/trash-2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let warehouses = [];
    let loading = true;
    let error = "";
    let showCreate = false;
    let createForm = { nombre: "", direccion: "" };
    let creating = false;
    let deletingWh = null;
    async function load() {
      loading = true;
      error = "";
      try {
        warehouses = await getWarehouses();
      } catch (err) {
        error = err instanceof Error ? err.message : "Error al cargar bodegas";
      } finally {
        loading = false;
      }
    }
    async function handleDelete() {
      if (!deletingWh) return;
      try {
        await deactivateWarehouse(deletingWh.id_bodega);
        await load();
      } catch (err) {
        error = err instanceof Error ? err.message : "Error al desactivar bodega";
      } finally {
        deletingWh = null;
      }
    }
    $$renderer2.push(`<div class="max-w-6xl mx-auto"><div class="flex items-center justify-between mb-6"><h1 class="text-xl font-bold text-foreground">Bodegas</h1> <div class="flex items-center gap-3">`);
    Button($$renderer2, {
      variant: "secondary",
      onclick: load,
      children: ($$renderer3) => {
        Rotate_cw($$renderer3, { class: "h-4 w-4" });
        $$renderer3.push(`<!----> Actualizar`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> `);
    Button($$renderer2, {
      onclick: () => showCreate = true,
      children: ($$renderer3) => {
        Plus($$renderer3, { class: "h-4 w-4" });
        $$renderer3.push(`<!----> Nueva bodega`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div></div> `);
    if (error) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="bg-red-50 border border-red-200 text-destructive rounded-md p-4 text-sm mb-4">${escape_html(error)}</div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">`);
    if (loading) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<!--[-->`);
      const each_array = ensure_array_like([1, 2, 3]);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        each_array[$$index];
        $$renderer2.push(`<div class="bg-white rounded-lg border border-border p-5 animate-pulse"><div class="h-5 w-32 bg-surface-alt rounded mb-3"></div> <div class="h-4 w-full bg-surface-alt rounded"></div></div>`);
      }
      $$renderer2.push(`<!--]-->`);
    } else if (warehouses.length === 0) {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<div class="col-span-full">`);
      EmptyState($$renderer2, {
        message: "No hay bodegas registradas",
        action: () => showCreate = true,
        actionlabel: "Crear bodega"
      });
      $$renderer2.push(`<!----></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<!--[-->`);
      const each_array_1 = ensure_array_like(warehouses);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let wh = each_array_1[$$index_1];
        $$renderer2.push(`<div class="bg-white rounded-lg border border-border p-5 hover:shadow-sm transition-shadow cursor-pointer" role="button"${attr("tabindex", 0)}><div class="flex items-center justify-between mb-2"><h3 class="text-base font-semibold text-foreground">${escape_html(wh.nombre)}</h3> `);
        Badge($$renderer2, {
          variant: wh.activa ? "success" : "danger",
          children: ($$renderer3) => {
            $$renderer3.push(`<!---->${escape_html(wh.activa ? "Activa" : "Inactiva")}`);
          }
        });
        $$renderer2.push(`<!----></div> <p class="text-sm text-muted">${escape_html(wh.direccion || "Sin dirección")}</p> <div class="flex items-center gap-1 mt-3 pt-3 border-t border-border"><button class="p-1.5 rounded-md hover:bg-surface-alt text-muted hover:text-foreground transition-colors" aria-label="Editar bodega">`);
        Pencil($$renderer2, { class: "h-4 w-4" });
        $$renderer2.push(`<!----></button> `);
        if (wh.activa) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<button class="p-1.5 rounded-md hover:bg-red-50 text-muted hover:text-destructive transition-colors" aria-label="Desactivar bodega">`);
          Trash_2($$renderer2, { class: "h-4 w-4" });
          $$renderer2.push(`<!----></button>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></div></div>`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div></div> `);
    Modal($$renderer2, {
      title: "Nueva bodega",
      open: showCreate,
      onclose: () => showCreate = false,
      children: ($$renderer3) => {
        $$renderer3.push(`<form class="space-y-4">`);
        {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--> `);
        FormField($$renderer3, {
          label: "Nombre",
          name: "nom",
          required: true,
          helper: "3-60 caracteres",
          children: ($$renderer4) => {
            $$renderer4.push(`<input id="nom" type="text" required=""${attr("value", createForm.nombre)} class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Ej: Bodega Central"${attr("minlength", 3)}${attr("maxlength", 60)}/>`);
          }
        });
        $$renderer3.push(`<!----> `);
        FormField($$renderer3, {
          label: "Dirección",
          name: "dir",
          helper: "Máximo 200 caracteres",
          children: ($$renderer4) => {
            $$renderer4.push(`<input id="dir" type="text"${attr("value", createForm.direccion)} class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Dirección física"${attr("maxlength", 200)}/>`);
          }
        });
        $$renderer3.push(`<!----> <div class="flex justify-end gap-3 pt-2">`);
        Button($$renderer3, {
          variant: "secondary",
          onclick: () => showCreate = false,
          type: "button",
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->Cancelar`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> `);
        Button($$renderer3, {
          type: "submit",
          loading: creating,
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->Crear bodega`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></div></form>`);
      }
    });
    $$renderer2.push(`<!----> `);
    ConfirmDialog($$renderer2, {
      open: deletingWh !== null,
      title: "Desactivar bodega",
      message: deletingWh ? `¿Desactivar "${deletingWh.nombre}"?` : "",
      confirmlabel: "Desactivar",
      onconfirm: handleDelete,
      oncancel: () => deletingWh = null
    });
    $$renderer2.push(`<!---->`);
  });
}
export {
  _page as default
};
