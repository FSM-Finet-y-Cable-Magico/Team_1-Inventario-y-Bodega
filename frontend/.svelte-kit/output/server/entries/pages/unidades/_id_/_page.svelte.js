import "clsx";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
import "../../../../chunks/auth.js";
import { M as Modal, B as Button } from "../../../../chunks/Modal.js";
import { A as Arrow_left } from "../../../../chunks/arrow-left.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let showChangeState = false;
    let changing = false;
    $$renderer2.push(`<div class="max-w-4xl mx-auto"><button class="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-4">`);
    Arrow_left($$renderer2, { class: "h-4 w-4" });
    $$renderer2.push(`<!----> Volver a unidades</button> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="bg-white rounded-lg border border-border p-6 animate-pulse space-y-4"><div class="h-6 w-48 bg-surface-alt rounded"></div> <div class="h-4 w-full bg-surface-alt rounded"></div></div>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    Modal($$renderer2, {
      title: "Cambiar estado",
      open: showChangeState,
      onclose: () => showChangeState = false,
      children: ($$renderer3) => {
        $$renderer3.push(`<form class="space-y-4">`);
        {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--> `);
        {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--> <div class="flex justify-end gap-3 pt-2">`);
        Button($$renderer3, {
          variant: "secondary",
          onclick: () => showChangeState = false,
          type: "button",
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->Cancelar`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> `);
        Button($$renderer3, {
          type: "submit",
          loading: changing,
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->Cambiar estado`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></div></form>`);
      }
    });
    $$renderer2.push(`<!---->`);
  });
}
export {
  _page as default
};
