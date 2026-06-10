import { a as attr_class, i as stringify } from "./root.js";
function Badge($$renderer, $$props) {
  let { variant = "default", children } = $$props;
  const colors = {
    default: "bg-surface-alt text-foreground",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-destructive",
    info: "bg-blue-50 text-blue-700"
  };
  $$renderer.push(`<span${attr_class(`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${stringify(colors[variant])}`)}>`);
  children?.($$renderer);
  $$renderer.push(`<!----></span>`);
}
export {
  Badge as B
};
