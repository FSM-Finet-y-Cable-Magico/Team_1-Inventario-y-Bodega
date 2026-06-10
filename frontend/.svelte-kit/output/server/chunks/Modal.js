import { k as attributes, i as stringify, c as attr, e as escape_html } from "./root.js";
function Button($$renderer, $$props) {
  let {
    children,
    variant = "primary",
    size = "default",
    disabled = false,
    loading = false,
    type = "button",
    onclick,
    $$slots,
    $$events,
    ...rest
  } = $$props;
  const variants = {
    primary: "bg-accent text-white hover:bg-accent-hover",
    secondary: "bg-white text-foreground border border-border hover:bg-surface-alt",
    destructive: "bg-destructive text-white hover:bg-destructive-hover",
    ghost: "text-foreground hover:bg-surface-alt"
  };
  const sizes = {
    sm: "px-2.5 py-1.5 text-xs",
    default: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };
  $$renderer.push(`<button${attributes({
    type,
    disabled,
    class: `inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${stringify(variants[variant])} ${stringify(sizes[size])}`,
    ...rest
  })}>`);
  if (loading) {
    $$renderer.push("<!--[0-->");
    $$renderer.push(`<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>`);
  } else {
    $$renderer.push("<!--[-1-->");
  }
  $$renderer.push(`<!--]--> `);
  children?.($$renderer);
  $$renderer.push(`<!----></button>`);
}
function Modal($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { children, open = false, title = "", onclose } = $$props;
    if (open) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true"${attr("aria-label", title || "Diálogo")}><div class="bg-white rounded-lg border border-border shadow-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">`);
      if (title) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="flex items-center justify-between px-6 py-4 border-b border-border"><h2 class="text-base font-semibold text-foreground">${escape_html(title)}</h2> <button class="p-1 rounded-md hover:bg-surface-alt text-muted hover:text-foreground transition-colors" aria-label="Cerrar"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg></button></div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <div class="p-6">`);
      children?.($$renderer2);
      $$renderer2.push(`<!----></div></div></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  Button as B,
  Modal as M
};
