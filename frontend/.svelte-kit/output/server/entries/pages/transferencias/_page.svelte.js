import { s as spread_props, e as escape_html, d as ensure_array_like, a as attr_class, c as attr } from "../../../chunks/root.js";
import { c as getTransfers, g as getWarehouses, e as getUnits } from "../../../chunks/index.js";
import { B as Button, M as Modal } from "../../../chunks/Modal.js";
import { F as FormField } from "../../../chunks/FormField.js";
import { P as Plus, E as EmptyState } from "../../../chunks/EmptyState.js";
import { u as userRoles } from "../../../chunks/auth.js";
import { R as Rotate_cw } from "../../../chunks/rotate-cw.js";
import { I as Icon } from "../../../chunks/Icon.js";
function Circle_check_big($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "M21.801 10A10 10 0 1 1 17 3.335" }],
    ["path", { "d": "m9 11 3 3L22 4" }]
  ];
  Icon($$renderer, spread_props([{ name: "circle-check-big" }, props, { iconNode }]));
}
function Circle_x($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["circle", { "cx": "12", "cy": "12", "r": "10" }],
    ["path", { "d": "m15 9-6 6" }],
    ["path", { "d": "m9 9 6 6" }]
  ];
  Icon($$renderer, spread_props([{ name: "circle-x" }, props, { iconNode }]));
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let transfers = [];
    let warehouses = [];
    let units = [];
    let loading = true;
    let error = "";
    let roles = [];
    userRoles.subscribe((r) => roles = r);
    let showCreate = false;
    let createForm = {
      id_empresa_destino: 2,
      id_bodega_origen: 0,
      id_bodega_destino: 0,
      ids_unidades: [],
      observaciones: ""
    };
    let creating = false;
    let rejectForm = { motivo: "" };
    let showReject = false;
    let rejecting = false;
    async function load() {
      loading = true;
      error = "";
      try {
        const [transfersData, whData, unitsData] = await Promise.all([getTransfers(), getWarehouses({ activa: true }), getUnits()]);
        transfers = transfersData;
        warehouses = whData;
        units = unitsData.filter((u) => u.estado === "En bodega");
      } catch (err) {
        error = err instanceof Error ? err.message : "Error al cargar transferencias";
      } finally {
        loading = false;
      }
    }
    $$renderer2.push(`<div class="max-w-6xl mx-auto"><div class="flex items-center justify-between mb-6"><h1 class="text-xl font-bold text-foreground">Transferencias</h1> <div class="flex items-center gap-3">`);
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
        $$renderer3.push(`<!----> Nueva transferencia`);
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
    $$renderer2.push(`<!--]--> <div class="bg-white rounded-lg border border-border overflow-hidden">`);
    if (loading) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="p-8 text-center text-sm text-muted">Cargando...</div>`);
    } else if (transfers.length === 0) {
      $$renderer2.push("<!--[1-->");
      EmptyState($$renderer2, {
        message: "No hay transferencias registradas",
        action: () => showCreate = true,
        actionlabel: "Nueva transferencia"
      });
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="border-b border-border bg-surface/50"><th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">ID</th><th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Empresa origen</th><th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Empresa destino</th><th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Fecha</th><th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Observaciones</th><th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Acciones</th></tr></thead><tbody><!--[-->`);
      const each_array = ensure_array_like(transfers);
      for (let i = 0, $$length = each_array.length; i < $$length; i++) {
        let tr = each_array[i];
        $$renderer2.push(`<tr${attr_class(`border-b border-border ${i % 2 === 0 ? "bg-white" : "bg-surface/30"}`)}><td class="px-4 py-3 font-mono text-foreground">#${escape_html(tr.id_transferencia)}</td><td class="px-4 py-3 text-foreground">Empresa ${escape_html(tr.id_empresa_origen)}</td><td class="px-4 py-3 text-foreground">Empresa ${escape_html(tr.id_empresa_destino)}</td><td class="px-4 py-3 text-muted">${escape_html(tr.fecha_transferencia ? new Date(tr.fecha_transferencia).toLocaleDateString("es-CL") : "-")}</td><td class="px-4 py-3 text-muted max-w-[200px] truncate">${escape_html(tr.observaciones || "-")}</td><td class="px-4 py-3"><div class="flex items-center gap-1">`);
        if (roles.includes("SUPERUSUARIO")) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<button class="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors" aria-label="Aprobar transferencia">`);
          Circle_check_big($$renderer2, { class: "h-4 w-4" });
          $$renderer2.push(`<!----></button> <button class="p-1.5 rounded-md text-destructive hover:bg-red-50 transition-colors" aria-label="Rechazar transferencia">`);
          Circle_x($$renderer2, { class: "h-4 w-4" });
          $$renderer2.push(`<!----></button>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></div></td></tr>`);
      }
      $$renderer2.push(`<!--]--></tbody></table></div>`);
    }
    $$renderer2.push(`<!--]--></div></div> `);
    Modal($$renderer2, {
      title: "Nueva transferencia",
      open: showCreate,
      onclose: () => showCreate = false,
      children: ($$renderer3) => {
        $$renderer3.push(`<form class="space-y-4">`);
        {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--> `);
        FormField($$renderer3, {
          label: "Empresa destino",
          name: "emp_dest",
          required: true,
          children: ($$renderer4) => {
            $$renderer4.select(
              {
                id: "emp_dest",
                required: true,
                value: createForm.id_empresa_destino,
                class: "w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              },
              ($$renderer5) => {
                $$renderer5.option({ value: 1 }, ($$renderer6) => {
                  $$renderer6.push(`Finet (ID: 1)`);
                });
                $$renderer5.option({ value: 2 }, ($$renderer6) => {
                  $$renderer6.push(`Cable Mágico (ID: 2)`);
                });
              }
            );
          }
        });
        $$renderer3.push(`<!----> <div class="grid grid-cols-2 gap-4">`);
        FormField($$renderer3, {
          label: "Bodega origen",
          name: "bod_ori",
          required: true,
          children: ($$renderer4) => {
            $$renderer4.select(
              {
                id: "bod_ori",
                required: true,
                value: createForm.id_bodega_origen,
                class: "w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              },
              ($$renderer5) => {
                $$renderer5.option({ value: 0, disabled: true }, ($$renderer6) => {
                  $$renderer6.push(`Seleccionar...`);
                });
                $$renderer5.push(`<!--[-->`);
                const each_array_1 = ensure_array_like(warehouses);
                for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                  let wh = each_array_1[$$index_1];
                  $$renderer5.option({ value: wh.id_bodega }, ($$renderer6) => {
                    $$renderer6.push(`${escape_html(wh.nombre)}`);
                  });
                }
                $$renderer5.push(`<!--]-->`);
              }
            );
          }
        });
        $$renderer3.push(`<!----> `);
        FormField($$renderer3, {
          label: "Bodega destino",
          name: "bod_des",
          required: true,
          children: ($$renderer4) => {
            $$renderer4.select(
              {
                id: "bod_des",
                required: true,
                value: createForm.id_bodega_destino,
                class: "w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              },
              ($$renderer5) => {
                $$renderer5.option({ value: 0, disabled: true }, ($$renderer6) => {
                  $$renderer6.push(`Seleccionar...`);
                });
                $$renderer5.push(`<!--[-->`);
                const each_array_2 = ensure_array_like(warehouses);
                for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
                  let wh = each_array_2[$$index_2];
                  $$renderer5.option({ value: wh.id_bodega }, ($$renderer6) => {
                    $$renderer6.push(`${escape_html(wh.nombre)}`);
                  });
                }
                $$renderer5.push(`<!--]-->`);
              }
            );
          }
        });
        $$renderer3.push(`<!----></div> `);
        FormField($$renderer3, {
          label: "Unidades a transferir",
          name: "unds",
          required: true,
          children: ($$renderer4) => {
            $$renderer4.push(`<div class="max-h-48 overflow-y-auto space-y-1 border border-border rounded-md p-2"><!--[-->`);
            const each_array_3 = ensure_array_like(units);
            for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
              let u = each_array_3[$$index_3];
              $$renderer4.push(`<label class="flex items-center gap-2 text-sm cursor-pointer px-2 py-1 hover:bg-surface-alt rounded"><input type="checkbox"${attr("value", u.id_unidad)}${attr("checked", createForm.ids_unidades.includes(u.id_unidad), true)} class="rounded border-border"/> <span class="font-mono text-xs">${escape_html(u.numero_serie)}</span> <span class="text-muted text-xs">${escape_html(u.tipo_equipo?.nombre || "")}</span></label>`);
            }
            $$renderer4.push(`<!--]--> `);
            if (units.length === 0) {
              $$renderer4.push("<!--[0-->");
              $$renderer4.push(`<p class="text-xs text-muted text-center py-2">No hay unidades disponibles en bodega</p>`);
            } else {
              $$renderer4.push("<!--[-1-->");
            }
            $$renderer4.push(`<!--]--></div>`);
          }
        });
        $$renderer3.push(`<!----> `);
        FormField($$renderer3, {
          label: "Observaciones",
          name: "obs",
          children: ($$renderer4) => {
            $$renderer4.push(`<textarea id="obs" class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" rows="2"${attr("maxlength", 200)}>`);
            const $$body = escape_html(createForm.observaciones);
            if ($$body) {
              $$renderer4.push(`${$$body}`);
            }
            $$renderer4.push(`</textarea>`);
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
            $$renderer4.push(`<!---->Crear transferencia`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></div></form>`);
      }
    });
    $$renderer2.push(`<!----> `);
    Modal($$renderer2, {
      title: "Rechazar transferencia",
      open: showReject,
      onclose: () => showReject = false,
      children: ($$renderer3) => {
        $$renderer3.push(`<form class="space-y-4">`);
        {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--> `);
        FormField($$renderer3, {
          label: "Motivo del rechazo",
          name: "motivo",
          required: true,
          helper: "Máximo 200 caracteres",
          children: ($$renderer4) => {
            $$renderer4.push(`<textarea id="motivo" required="" class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" rows="3"${attr("maxlength", 200)}>`);
            const $$body_1 = escape_html(rejectForm.motivo);
            if ($$body_1) {
              $$renderer4.push(`${$$body_1}`);
            }
            $$renderer4.push(`</textarea>`);
          }
        });
        $$renderer3.push(`<!----> <div class="flex justify-end gap-3 pt-2">`);
        Button($$renderer3, {
          variant: "secondary",
          onclick: () => showReject = false,
          type: "button",
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->Cancelar`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> `);
        Button($$renderer3, {
          type: "submit",
          variant: "destructive",
          loading: rejecting,
          children: ($$renderer4) => {
            Circle_x($$renderer4, { class: "h-4 w-4" });
            $$renderer4.push(`<!----> Rechazar transferencia`);
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
