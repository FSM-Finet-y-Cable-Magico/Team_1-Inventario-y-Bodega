import { s as spread_props, e as escape_html } from "./root.js";
import { I as Icon } from "./Icon.js";
import "clsx";
function Plus($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [["path", { "d": "M5 12h14" }], ["path", { "d": "M12 5v14" }]];
  Icon($$renderer, spread_props([{ name: "plus" }, props, { iconNode }]));
}
function EmptyState($$renderer, $$props) {
  let { message = "No hay datos disponibles", action, actionlabel } = $$props;
  $$renderer.push(`<div class="flex flex-col items-center justify-center py-12 text-center"><svg class="h-12 w-12 text-muted mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg> <p class="text-sm text-muted">${escape_html(message)}</p> `);
  if (action) {
    $$renderer.push("<!--[0-->");
    $$renderer.push(`<button class="mt-3 text-sm font-medium text-accent hover:text-accent-hover transition-colors">${escape_html(actionlabel || "Crear")}</button>`);
  } else {
    $$renderer.push("<!--[-1-->");
  }
  $$renderer.push(`<!--]--></div>`);
}
export {
  EmptyState as E,
  Plus as P
};
