import { c as attr, e as escape_html, d as ensure_array_like, a as attr_class, i as stringify } from "../../../chunks/root.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
import { f as getUsers, h as getRoles, i as deleteUser } from "../../../chunks/index.js";
import { B as Button, M as Modal } from "../../../chunks/Modal.js";
import { F as FormField } from "../../../chunks/FormField.js";
import { S as SearchInput } from "../../../chunks/SearchInput.js";
import { B as Badge } from "../../../chunks/Badge.js";
import { P as Plus, E as EmptyState } from "../../../chunks/EmptyState.js";
import { C as ConfirmDialog } from "../../../chunks/ConfirmDialog.js";
import { R as Rotate_cw } from "../../../chunks/rotate-cw.js";
import { P as Pencil, T as Trash_2 } from "../../../chunks/trash-2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let usuarios = [];
    let roles = [];
    let loading = true;
    let error = "";
    let search = "";
    let showInactivos = false;
    let showCreate = false;
    let createForm = {
      nombre_usuario: "",
      nombre_completo: "",
      email: "",
      password: "",
      roles: []
    };
    let creating = false;
    let deletingUser = null;
    async function load() {
      loading = true;
      error = "";
      try {
        const [usersData, rolesData] = await Promise.all([
          getUsers(showInactivos ? void 0 : true, search || void 0),
          getRoles()
        ]);
        usuarios = usersData;
        roles = rolesData;
      } catch (err) {
        error = err instanceof Error ? err.message : "Error al cargar usuarios";
      } finally {
        loading = false;
      }
    }
    async function handleDelete() {
      if (!deletingUser) return;
      try {
        await deleteUser(deletingUser.id_usuario);
        await load();
      } catch (err) {
        error = err instanceof Error ? err.message : "Error al desactivar usuario";
      } finally {
        deletingUser = null;
      }
    }
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<div class="max-w-6xl mx-auto"><div class="flex items-center justify-between mb-6"><h1 class="text-xl font-bold text-foreground">Usuarios</h1> <div class="flex items-center gap-3">`);
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
          $$renderer4.push(`<!----> Nuevo usuario`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----></div></div> <div class="flex items-center gap-4 mb-4"><div class="flex-1 max-w-xs">`);
      SearchInput($$renderer3, {
        placeholder: "Buscar usuarios...",
        get value() {
          return search;
        },
        set value($$value) {
          search = $$value;
          $$settled = false;
        }
      });
      $$renderer3.push(`<!----></div> <label class="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none"><input type="checkbox"${attr("checked", showInactivos, true)} class="rounded border-border"/> Mostrar inactivos</label></div> `);
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
      } else if (usuarios.length === 0) {
        $$renderer3.push("<!--[1-->");
        EmptyState($$renderer3, {
          message: "No se encontraron usuarios",
          action: () => showCreate = true,
          actionlabel: "Crear usuario"
        });
      } else {
        $$renderer3.push("<!--[-1-->");
        $$renderer3.push(`<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="border-b border-border bg-surface/50"><th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Usuario</th><th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Nombre completo</th><th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Email</th><th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Estado</th><th class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Roles</th><th class="text-right px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">Acciones</th></tr></thead><tbody><!--[-->`);
        const each_array = ensure_array_like(usuarios);
        for (let i = 0, $$length = each_array.length; i < $$length; i++) {
          let user = each_array[i];
          $$renderer3.push(`<tr${attr_class(`border-b border-border transition-colors hover:bg-surface-alt/50 ${i % 2 === 0 ? "bg-white" : "bg-surface/30"}`)}><td class="px-4 py-3 font-medium text-foreground">${escape_html(user.nombre_usuario)}</td><td class="px-4 py-3 text-foreground">${escape_html(user.nombre_completo)}</td><td class="px-4 py-3 text-muted">${escape_html(user.email || "-")}</td><td class="px-4 py-3">`);
          Badge($$renderer3, {
            variant: user.activo ? "success" : "danger",
            children: ($$renderer4) => {
              $$renderer4.push(`<!---->${escape_html(user.activo ? "Activo" : "Inactivo")}`);
            }
          });
          $$renderer3.push(`<!----></td><td class="px-4 py-3"><div class="flex flex-wrap gap-1"><!--[-->`);
          const each_array_1 = ensure_array_like(user.roles ?? []);
          for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
            let rol = each_array_1[$$index];
            Badge($$renderer3, {
              variant: "info",
              children: ($$renderer4) => {
                $$renderer4.push(`<!---->${escape_html(rol.nombre_rol)}`);
              }
            });
          }
          $$renderer3.push(`<!--]--> `);
          if (!user.roles?.length) {
            $$renderer3.push("<!--[0-->");
            $$renderer3.push(`<span class="text-muted text-xs">-</span>`);
          } else {
            $$renderer3.push("<!--[-1-->");
          }
          $$renderer3.push(`<!--]--></div></td><td class="px-4 py-3 text-right"><div class="flex items-center justify-end gap-1"><button class="p-1.5 rounded-md hover:bg-surface-alt text-muted hover:text-foreground transition-colors" aria-label="Editar usuario">`);
          Pencil($$renderer3, { class: "h-4 w-4" });
          $$renderer3.push(`<!----></button> <button class="p-1.5 rounded-md hover:bg-red-50 text-muted hover:text-destructive transition-colors" aria-label="Desactivar usuario">`);
          Trash_2($$renderer3, { class: "h-4 w-4" });
          $$renderer3.push(`<!----></button></div></td></tr>`);
        }
        $$renderer3.push(`<!--]--></tbody></table></div>`);
      }
      $$renderer3.push(`<!--]--></div></div> `);
      Modal($$renderer3, {
        title: "Nuevo usuario",
        open: showCreate,
        onclose: () => showCreate = false,
        children: ($$renderer4) => {
          $$renderer4.push(`<form class="space-y-4">`);
          {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]--> `);
          FormField($$renderer4, {
            label: "Nombre de usuario",
            name: "nu",
            required: true,
            children: ($$renderer5) => {
              $$renderer5.push(`<input id="nu" type="text" required=""${attr("value", createForm.nombre_usuario)} class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="ej: jperez"${attr("pattern", `^[a-z0-9_]${stringify(20)}$`)} title="4-20 caracteres, minúsculas, números y guión bajo"/>`);
            }
          });
          $$renderer4.push(`<!----> `);
          FormField($$renderer4, {
            label: "Nombre completo",
            name: "nc",
            required: true,
            children: ($$renderer5) => {
              $$renderer5.push(`<input id="nc" type="text" required=""${attr("value", createForm.nombre_completo)} class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Juan Pérez"/>`);
            }
          });
          $$renderer4.push(`<!----> `);
          FormField($$renderer4, {
            label: "Email",
            name: "em",
            children: ($$renderer5) => {
              $$renderer5.push(`<input id="em" type="email"${attr("value", createForm.email)} class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="juan@ejemplo.cl"/>`);
            }
          });
          $$renderer4.push(`<!----> `);
          FormField($$renderer4, {
            label: "Contraseña",
            name: "pw",
            required: true,
            children: ($$renderer5) => {
              $$renderer5.push(`<input id="pw" type="password" required=""${attr("value", createForm.password)} class="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Mín. 8 caracteres"${attr("minlength", 8)}/>`);
            }
          });
          $$renderer4.push(`<!----> `);
          FormField($$renderer4, {
            label: "Roles",
            name: "rl",
            required: true,
            children: ($$renderer5) => {
              $$renderer5.push(`<div class="space-y-2 max-h-40 overflow-y-auto"><!--[-->`);
              const each_array_2 = ensure_array_like(roles);
              for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
                let rol = each_array_2[$$index_2];
                $$renderer5.push(`<label class="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox"${attr("value", rol.id_rol)}${attr("checked", createForm.roles.includes(rol.id_rol), true)} class="rounded border-border"/> <span class="font-medium">${escape_html(rol.nombre_rol)}</span></label>`);
              }
              $$renderer5.push(`<!--]--></div>`);
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
              $$renderer5.push(`<!---->Crear usuario`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----></div></form>`);
        }
      });
      $$renderer3.push(`<!----> `);
      ConfirmDialog($$renderer3, {
        open: deletingUser !== null,
        title: "Desactivar usuario",
        message: deletingUser ? `¿Desactivar a "${deletingUser.nombre_completo}"? Esta acción no se puede revertir.` : "",
        confirmlabel: "Desactivar",
        onconfirm: handleDelete,
        oncancel: () => deletingUser = null
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
