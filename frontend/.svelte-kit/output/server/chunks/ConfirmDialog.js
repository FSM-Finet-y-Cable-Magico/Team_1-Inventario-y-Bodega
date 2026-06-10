import { c as attr, e as escape_html, a as attr_class } from "./root.js";
function ConfirmDialog($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      open = false,
      title = "Confirmar",
      message = "¿Estás seguro?",
      confirmlabel = "Confirmar",
      cancellabel = "Cancelar",
      variant = "destructive",
      onconfirm,
      oncancel
    } = $$props;
    if (open) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true"${attr("aria-label", title)}><div class="bg-white rounded-lg border border-border shadow-lg w-full max-w-sm mx-4 p-6"><h3 class="text-base font-semibold text-foreground mb-2">${escape_html(title)}</h3> <p class="text-sm text-muted mb-6">${escape_html(message)}</p> <div class="flex justify-end gap-3"><button class="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-surface-alt transition-colors">${escape_html(cancellabel)}</button> <button${attr_class(`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${variant === "destructive" ? "bg-destructive hover:bg-destructive-hover" : "bg-accent hover:bg-accent-hover"}`)}>${escape_html(confirmlabel)}</button></div></div></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  ConfirmDialog as C
};
