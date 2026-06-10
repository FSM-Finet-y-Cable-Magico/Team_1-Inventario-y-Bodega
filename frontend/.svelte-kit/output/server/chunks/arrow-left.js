import { s as spread_props } from "./root.js";
import { I as Icon } from "./Icon.js";
function Arrow_left($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "m12 19-7-7 7-7" }],
    ["path", { "d": "M19 12H5" }]
  ];
  Icon($$renderer, spread_props([{ name: "arrow-left" }, props, { iconNode }]));
}
export {
  Arrow_left as A
};
