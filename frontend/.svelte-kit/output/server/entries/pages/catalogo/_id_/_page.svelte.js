import "clsx";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
import "../../../../chunks/auth.js";
import { A as Arrow_left } from "../../../../chunks/arrow-left.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<div class="max-w-3xl mx-auto"><button class="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-4">`);
    Arrow_left($$renderer2, { class: "h-4 w-4" });
    $$renderer2.push(`<!----> Volver al catálogo</button> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="bg-white rounded-lg border border-border p-6 animate-pulse space-y-4"><div class="h-6 w-48 bg-surface-alt rounded"></div> <div class="h-4 w-full bg-surface-alt rounded"></div></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
