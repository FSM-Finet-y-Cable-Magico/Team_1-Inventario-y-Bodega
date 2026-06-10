import { h as store_get, u as unsubscribe_stores } from "../../../../chunks/root.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/state.svelte.js";
import { p as page } from "../../../../chunks/stores.js";
import { r as restablecerPassword } from "../../../../chunks/index.js";
import { C as ConfirmDialog } from "../../../../chunks/ConfirmDialog.js";
import { A as Arrow_left } from "../../../../chunks/arrow-left.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let success = "";
    let showResetConfirm = false;
    let resetResult = "";
    async function handleResetPassword() {
      resetResult = "";
      try {
        const res = await restablecerPassword(Number(store_get($$store_subs ??= {}, "$page", page).params.id));
        resetResult = res.nueva_password;
        showResetConfirm = false;
        success = "Contraseña restablecida correctamente";
      } catch (err) {
        err instanceof Error ? err.message : "Error al restablecer contraseña";
      } finally {
      }
    }
    $$renderer2.push(`<div class="max-w-3xl mx-auto"><button class="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-4">`);
    Arrow_left($$renderer2, { class: "h-4 w-4" });
    $$renderer2.push(`<!----> Volver a usuarios</button> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="bg-white rounded-lg border border-border p-6 animate-pulse space-y-4"><div class="h-6 w-48 bg-surface-alt rounded"></div> <div class="h-4 w-full bg-surface-alt rounded"></div> <div class="h-4 w-3/4 bg-surface-alt rounded"></div></div>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    ConfirmDialog($$renderer2, {
      open: showResetConfirm,
      title: "Restablecer contraseña",
      message: "",
      confirmlabel: "Restablecer",
      variant: "primary",
      onconfirm: handleResetPassword,
      oncancel: () => showResetConfirm = false
    });
    $$renderer2.push(`<!---->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
