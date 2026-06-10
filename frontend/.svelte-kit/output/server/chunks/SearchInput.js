import { s as spread_props, c as attr, j as bind_props } from "./root.js";
import { I as Icon } from "./Icon.js";
function Search($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "m21 21-4.34-4.34" }],
    ["circle", { "cx": "11", "cy": "11", "r": "8" }]
  ];
  Icon($$renderer, spread_props([{ name: "search" }, props, { iconNode }]));
}
function SearchInput($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { value = "", placeholder = "Buscar...", onsearch } = $$props;
    $$renderer2.push(`<div class="relative">`);
    Search($$renderer2, {
      class: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
    });
    $$renderer2.push(`<!----> <input type="text"${attr("placeholder", placeholder)}${attr("value", value)} class="w-full pl-9 pr-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"${attr("aria-label", placeholder)}/></div>`);
    bind_props($$props, { value });
  });
}
export {
  SearchInput as S
};
