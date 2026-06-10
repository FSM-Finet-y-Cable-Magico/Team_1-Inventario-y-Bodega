import { d as ensure_array_like, e as escape_html, a as attr_class, c as attr, i as stringify } from "../../../chunks/root.js";
import { g as goto } from "../../../chunks/client.js";
import { e as getUnits, a as getCatalog } from "../../../chunks/index.js";
import { B as Button, M as Modal } from "../../../chunks/Modal.js";
import { F as FormField } from "../../../chunks/FormField.js";
import { S as SearchInput } from "../../../chunks/SearchInput.js";
import { B as Badge } from "../../../chunks/Badge.js";
import { P as Plus, E as EmptyState } from "../../../chunks/EmptyState.js";
import { R as Rotate_cw } from "../../../chunks/rotate-cw.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let units = [];
    let tipos = [];
    let loading = true;
    let error = "";
    let search = "";
    let estadoFilter = "";
    let showCreate = false;
    let createForm = {
      id_tipo_equipo: 0,
      numero_serie: "",
      modelo: "",
      estado: "En bodega",
      fecha_adquisicion: "",
      fecha_venc_garantia: ""
    };
    let creating = false;
    const estados = [
      "En bodega",
      "Asignado a tecnico",
      "Instalado en cliente",
      "En revision",
      "En prestamo externo",
      "Dado de baja"
    ];
    const estadoBadge = {
      "En bodega": "default",
      "Asignado a tecnico": "info",
      "Instalado en cliente": "success",
      "En revision": "warning",
      "En prestamo externo": "info",
      "Dado de baja": "danger"
    };
    async function load() {
      loading = true;
      error = "";
      try {
        const [unitsData, tiposData] = await Promise.all([
          getUnits({
            estado: estadoFilter || void 0,
            buscar: search || void 0
          }),
          getCatalog({ activo: true })
        ]);
        units = unitsData;
        tipos = tiposData;
      } catch (err) {
        error = err instanceof Error ? err.message : "Error al cargar unidades";
      } finally {
        loading = false;
      }
    }
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<div class="max-w-6xl mx-auto"><div class="flex items-center justify-between mb-6"><h1 class="text-xl font-bold text-foreground">Unidades de Equipo</h1> <div class="flex items-center gap-3">`);
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
          $$renderer4.push(`<!----> Registrar unidad`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----></div></div> <div class="flex items-center gap-4 mb-4"><div class="flex-1 max-w-xs">`);
      SearchInput($$renderer3, {
        placeholder: "Buscar por serie o modelo...",
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
          value: estadoFilter,
          class: "px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
        },
        ($$renderer4) => {
          $$renderer4.option({ value: "" }, ($$renderer5) => {
            $$renderer5.push(`Todos los estados`);
          });
          $$renderer4.push(`<!--[-->`);
          const each_array = ensure_array_like(estados);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let est = each_array[$$index];
            $$renderer4.option({ value: est }, ($$renderer5) => {
              $$renderer5.push(`${escape_html(est)}`);
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
      } else if (units.length === 0) {
        $$renderer3.push("<!--[1-->");
        EmptyState($$renderer3, {
          message: "No hay unidades registradas",
          action: () => showCreate = true,
          actionlabel: "Registrar unidad"
        });
      } else {
        $$renderer3.push("<!--[-1-->");
        $$renderer3.push(`<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="border-b border-border bg-surface/50"><th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Serie</th><th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Tipo</th><th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Modelo</th><th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Estado</th><th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Garantía</th><th class="text-right px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Acciones</th></tr></thead><tbody><!--[-->`);
        const each_array_1 = ensure_array_like(units);
        for (let i = 0, $$length = each_array_1.length; i < $$length; i++) {
          let unit = each_array_1[i];
          $$renderer3.push(`<tr${attr_class(`border-b border-border transition-colors hover:bg-surface-alt/50 ${i % 2 === 0 ? "bg-white" : "bg-surface/30"}`)}><td class="px-4 py-3 font-mono text-sm font-medium text-foreground">${escape_html(unit.numero_serie)}</td><td class="px-4 py-3 text-foreground">${escape_html(unit.tipo_equipo?.nombre || "-")}</td><td class="px-4 py-3 text-muted">${escape_html(unit.modelo || "-")}</td><td class="px-4 py-3">`);
          Badge($$renderer3, {
            variant: estadoBadge[unit.estado],
            children: ($$renderer4) => {
              $$renderer4.push(`<!---->${escape_html(unit.estado)}`);
            }
          });
          $$renderer3.push(`<!----></td><td class="px-4 py-3">`);
          if (unit.fecha_venc_garantia) {
            $$renderer3.push("<!--[0-->");
            $$renderer3.push(`<span class="text-xs text-muted">${escape_html(unit.fecha_venc_garantia)}</span>`);
          } else {
            $$renderer3.push("<!--[-1-->");
            $$renderer3.push(`<span class="text-xs text-muted">Sin garantía</span>`);
          }
          $$renderer3.push(`<!--]--></td><td class="px-4 py-3 text-right">`);
          Button($$renderer3, {
            variant: "ghost",
            size: "sm",
            onclick: () => goto(`/unidades/${unit.id_unidad}`),
            children: ($$renderer4) => {
              $$renderer4.push(`<!---->Ver detalle`);
            },
            $$slots: { default: true }
          });
          $$renderer3.push(`<!----></td></tr>`);
        }
        $$renderer3.push(`<!--]--></tbody></table></div>`);
      }
      $$renderer3.push(`<!--]--></div></div> `);
      Modal($$renderer3, {
        title: "Registrar unidad",
        open: showCreate,
        onclose: () => showCreate = false,
        children: ($$renderer4) => {
          $$renderer4.push(`<form class="space-y-4">`);
          {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]--> `);
          FormField($$renderer4, {
            label: "Tipo de equipo",
            name: "tipo",
            required: true,
            children: ($$renderer5) => {
              $$renderer5.select(
                {
                  id: "tipo",
                  required: true,
                  value: createForm.id_tipo_equipo,
                  class: "w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                },
                ($$renderer6) => {
                  $$renderer6.option({ value: 0, disabled: true }, ($$renderer7) => {
                    $$renderer7.push(`Seleccionar tipo`);
                  });
                  $$renderer6.push(`<!--[-->`);
                  const each_array_2 = ensure_array_like(tipos);
                  for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
                    let t = each_array_2[$$index_2];
                    $$renderer6.option({ value: t.id_tipo_equipo }, ($$renderer7) => {
                      $$renderer7.push(`${escape_html(t.nombre)} ${escape_html(t.categoria ? `(${t.categoria})` : "")}`);
                    });
                  }
                  $$renderer6.push(`<!--]-->`);
                }
              );
            }
          });
          $$renderer4.push(`<!----> `);
          FormField($$renderer4, {
            label: "Número de serie",
            name: "serie",
            required: true,
            helper: "4-30 caracteres, mayúsculas, números y guiones",
            children: ($$renderer5) => {
              $$renderer5.push(`<input id="serie" type="text" required=""${attr("value", createForm.numero_serie)} class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono" placeholder="Ej: ONT-2024-0001"${attr("pattern", `^[A-Z0-9-]${stringify(30)}$`)} title="4-30 caracteres, solo mayúsculas, números y guiones"/>`);
            }
          });
          $$renderer4.push(`<!----> `);
          FormField($$renderer4, {
            label: "Modelo",
            name: "mod",
            children: ($$renderer5) => {
              $$renderer5.push(`<input id="mod" type="text"${attr("value", createForm.modelo)} class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Ej: HG8245H"/>`);
            }
          });
          $$renderer4.push(`<!----> `);
          FormField($$renderer4, {
            label: "Estado inicial",
            name: "est",
            children: ($$renderer5) => {
              $$renderer5.select(
                {
                  id: "est",
                  value: createForm.estado,
                  class: "w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                },
                ($$renderer6) => {
                  $$renderer6.push(`<!--[-->`);
                  const each_array_3 = ensure_array_like(estados);
                  for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
                    let est = each_array_3[$$index_3];
                    $$renderer6.option({ value: est }, ($$renderer7) => {
                      $$renderer7.push(`${escape_html(est)}`);
                    });
                  }
                  $$renderer6.push(`<!--]-->`);
                }
              );
            }
          });
          $$renderer4.push(`<!----> <div class="grid grid-cols-2 gap-4">`);
          FormField($$renderer4, {
            label: "Fecha adquisición",
            name: "fec_adq",
            children: ($$renderer5) => {
              $$renderer5.push(`<input id="fec_adq" type="date"${attr("value", createForm.fecha_adquisicion)} class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"/>`);
            }
          });
          $$renderer4.push(`<!----> `);
          FormField($$renderer4, {
            label: "Venc. garantía",
            name: "fec_gar",
            children: ($$renderer5) => {
              $$renderer5.push(`<input id="fec_gar" type="date"${attr("value", createForm.fecha_venc_garantia)} class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"/>`);
            }
          });
          $$renderer4.push(`<!----></div> <div class="flex justify-end gap-3 pt-2">`);
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
              $$renderer5.push(`<!---->Registrar unidad`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----></div></form>`);
        }
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
