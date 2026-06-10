import { s as spread_props, c as attr, d as ensure_array_like, e as escape_html } from "../../../../chunks/root.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/state.svelte.js";
import "../../../../chunks/auth.js";
import { M as Modal, B as Button } from "../../../../chunks/Modal.js";
import { F as FormField } from "../../../../chunks/FormField.js";
import { A as Arrow_left } from "../../../../chunks/arrow-left.js";
import { I as Icon } from "../../../../chunks/Icon.js";
function Save($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "path",
      {
        "d": "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"
      }
    ],
    ["path", { "d": "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" }],
    ["path", { "d": "M7 3v4a1 1 0 0 0 1 1h7" }]
  ];
  Icon($$renderer, spread_props([{ name: "save" }, props, { iconNode }]));
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let tipos = [];
    let saving = false;
    let editForm = { nombre: "", direccion: "" };
    let showEdit = false;
    let showThreshold = false;
    let thresholdForm = { id_tipo_equipo: 0, umbral: 0 };
    let thresholdSaving = false;
    $$renderer2.push(`<div class="max-w-6xl mx-auto"><button class="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-4">`);
    Arrow_left($$renderer2, { class: "h-4 w-4" });
    $$renderer2.push(`<!----> Volver a bodegas</button> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="bg-white rounded-lg border border-border p-6 animate-pulse space-y-4"><div class="h-6 w-48 bg-surface-alt rounded"></div> <div class="h-4 w-full bg-surface-alt rounded"></div></div>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    Modal($$renderer2, {
      title: "Editar bodega",
      open: showEdit,
      onclose: () => showEdit = false,
      children: ($$renderer3) => {
        $$renderer3.push(`<form class="space-y-4">`);
        FormField($$renderer3, {
          label: "Nombre",
          name: "edit_nom",
          required: true,
          children: ($$renderer4) => {
            $$renderer4.push(`<input id="edit_nom" type="text" required=""${attr("value", editForm.nombre)} class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"/>`);
          }
        });
        $$renderer3.push(`<!----> `);
        FormField($$renderer3, {
          label: "Dirección",
          name: "edit_dir",
          children: ($$renderer4) => {
            $$renderer4.push(`<input id="edit_dir" type="text"${attr("value", editForm.direccion)} class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"/>`);
          }
        });
        $$renderer3.push(`<!----> <div class="flex justify-end gap-3 pt-2">`);
        Button($$renderer3, {
          variant: "secondary",
          onclick: () => showEdit = false,
          type: "button",
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->Cancelar`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> `);
        Button($$renderer3, {
          type: "submit",
          loading: saving,
          children: ($$renderer4) => {
            Save($$renderer4, { class: "h-4 w-4" });
            $$renderer4.push(`<!----> Guardar`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></div></form>`);
      }
    });
    $$renderer2.push(`<!----> `);
    Modal($$renderer2, {
      title: "Configurar umbral de stock",
      open: showThreshold,
      onclose: () => showThreshold = false,
      children: ($$renderer3) => {
        $$renderer3.push(`<form class="space-y-4">`);
        {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--> `);
        FormField($$renderer3, {
          label: "Tipo de equipo",
          name: "te",
          required: true,
          children: ($$renderer4) => {
            $$renderer4.select(
              {
                id: "te",
                required: true,
                value: thresholdForm.id_tipo_equipo,
                class: "w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              },
              ($$renderer5) => {
                $$renderer5.option({ value: 0, disabled: true }, ($$renderer6) => {
                  $$renderer6.push(`Seleccionar...`);
                });
                $$renderer5.push(`<!--[-->`);
                const each_array_1 = ensure_array_like(tipos);
                for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                  let t = each_array_1[$$index_1];
                  $$renderer5.option({ value: t.id_tipo_equipo }, ($$renderer6) => {
                    $$renderer6.push(`${escape_html(t.nombre)}`);
                  });
                }
                $$renderer5.push(`<!--]-->`);
              }
            );
          }
        });
        $$renderer3.push(`<!----> `);
        FormField($$renderer3, {
          label: "Umbral mínimo",
          name: "umb",
          required: true,
          helper: "Valor entre 0 y 9999",
          children: ($$renderer4) => {
            $$renderer4.push(`<input id="umb" type="number" required=""${attr("value", thresholdForm.umbral)}${attr("min", 0)}${attr("max", 9999)} class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"/>`);
          }
        });
        $$renderer3.push(`<!----> <div class="flex justify-end gap-3 pt-2">`);
        Button($$renderer3, {
          variant: "secondary",
          onclick: () => showThreshold = false,
          type: "button",
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->Cancelar`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> `);
        Button($$renderer3, {
          type: "submit",
          loading: thresholdSaving,
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->Configurar`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></div></form>`);
      }
    });
    $$renderer2.push(`<!---->`);
  });
}
export {
  _page as default
};
