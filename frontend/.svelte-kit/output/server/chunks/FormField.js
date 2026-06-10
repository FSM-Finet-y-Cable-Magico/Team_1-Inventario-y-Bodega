import { c as attr, e as escape_html } from "./root.js";
function FormField($$renderer, $$props) {
  let {
    children,
    label = "",
    name = "",
    error = "",
    helper = "",
    required = false
  } = $$props;
  $$renderer.push(`<div class="space-y-1">`);
  if (label) {
    $$renderer.push("<!--[0-->");
    $$renderer.push(`<label${attr("for", name)} class="block text-sm font-medium text-foreground">${escape_html(label)} `);
    if (required) {
      $$renderer.push("<!--[0-->");
      $$renderer.push(`<span class="text-destructive ml-0.5">*</span>`);
    } else {
      $$renderer.push("<!--[-1-->");
    }
    $$renderer.push(`<!--]--></label>`);
  } else {
    $$renderer.push("<!--[-1-->");
  }
  $$renderer.push(`<!--]--> `);
  children($$renderer);
  $$renderer.push(`<!----> `);
  if (error) {
    $$renderer.push("<!--[0-->");
    $$renderer.push(`<p${attr("id", name ? `${name}-error` : void 0)} class="text-xs text-destructive">${escape_html(error)}</p>`);
  } else if (helper) {
    $$renderer.push("<!--[1-->");
    $$renderer.push(`<p${attr("id", name ? `${name}-helper` : void 0)} class="text-xs text-muted">${escape_html(helper)}</p>`);
  } else {
    $$renderer.push("<!--[-1-->");
  }
  $$renderer.push(`<!--]--></div>`);
}
export {
  FormField as F
};
