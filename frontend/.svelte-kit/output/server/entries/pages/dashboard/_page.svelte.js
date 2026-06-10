import { d as ensure_array_like } from "../../../chunks/root.js";
import { u as userRoles } from "../../../chunks/auth.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    userRoles.subscribe((r) => r);
    $$renderer2.push(`<div class="max-w-6xl mx-auto"><h1 class="text-xl font-bold text-foreground mb-6">Dashboard</h1> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="grid grid-cols-1 md:grid-cols-2 gap-6"><!--[-->`);
      const each_array = ensure_array_like([1, 2]);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        each_array[$$index];
        $$renderer2.push(`<div class="bg-white rounded-lg border border-border p-6 animate-pulse"><div class="h-5 w-32 bg-surface-alt rounded mb-4"></div> <div class="space-y-2"><div class="h-4 w-full bg-surface-alt rounded"></div> <div class="h-4 w-3/4 bg-surface-alt rounded"></div></div></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
