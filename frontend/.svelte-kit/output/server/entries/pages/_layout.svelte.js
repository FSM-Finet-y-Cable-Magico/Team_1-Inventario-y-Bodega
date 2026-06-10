import { s as spread_props, a as attr_class, b as attr_style, c as attr, d as ensure_array_like, e as escape_html, f as derived, h as store_get, u as unsubscribe_stores } from "../../chunks/root.js";
import { u as userRoles, c as currentUser, a as authStore } from "../../chunks/auth.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../chunks/state.svelte.js";
import { p as page } from "../../chunks/stores.js";
import { I as Icon } from "../../chunks/Icon.js";
import "clsx";
function Arrow_left_right($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "M8 3 4 7l4 4" }],
    ["path", { "d": "M4 7h16" }],
    ["path", { "d": "m16 21 4-4-4-4" }],
    ["path", { "d": "M20 17H4" }]
  ];
  Icon($$renderer, spread_props([{ name: "arrow-left-right" }, props, { iconNode }]));
}
function Building_2($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "M10 12h4" }],
    ["path", { "d": "M10 8h4" }],
    ["path", { "d": "M14 21v-3a2 2 0 0 0-4 0v3" }],
    [
      "path",
      {
        "d": "M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"
      }
    ],
    ["path", { "d": "M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" }]
  ];
  Icon($$renderer, spread_props([{ name: "building-2" }, props, { iconNode }]));
}
function Layout_dashboard($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "rect",
      { "width": "7", "height": "9", "x": "3", "y": "3", "rx": "1" }
    ],
    [
      "rect",
      { "width": "7", "height": "5", "x": "14", "y": "3", "rx": "1" }
    ],
    [
      "rect",
      { "width": "7", "height": "9", "x": "14", "y": "12", "rx": "1" }
    ],
    [
      "rect",
      { "width": "7", "height": "5", "x": "3", "y": "16", "rx": "1" }
    ]
  ];
  Icon($$renderer, spread_props([{ name: "layout-dashboard" }, props, { iconNode }]));
}
function Log_out($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "m16 17 5-5-5-5" }],
    ["path", { "d": "M21 12H9" }],
    ["path", { "d": "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }]
  ];
  Icon($$renderer, spread_props([{ name: "log-out" }, props, { iconNode }]));
}
function Package($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "path",
      {
        "d": "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"
      }
    ],
    ["path", { "d": "M12 22V12" }],
    ["polyline", { "points": "3.29 7 12 12 20.71 7" }],
    ["path", { "d": "m7.5 4.27 9 5.15" }]
  ];
  Icon($$renderer, spread_props([{ name: "package" }, props, { iconNode }]));
}
function Panel_left_close($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "rect",
      { "width": "18", "height": "18", "x": "3", "y": "3", "rx": "2" }
    ],
    ["path", { "d": "M9 3v18" }],
    ["path", { "d": "m16 15-3-3 3-3" }]
  ];
  Icon($$renderer, spread_props([{ name: "panel-left-close" }, props, { iconNode }]));
}
function Scroll_text($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "M15 12h-5" }],
    ["path", { "d": "M15 8h-5" }],
    ["path", { "d": "M19 17V5a2 2 0 0 0-2-2H4" }],
    [
      "path",
      {
        "d": "M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"
      }
    ]
  ];
  Icon($$renderer, spread_props([{ name: "scroll-text" }, props, { iconNode }]));
}
function Users($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    ["path", { "d": "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }],
    ["path", { "d": "M16 3.128a4 4 0 0 1 0 7.744" }],
    ["path", { "d": "M22 21v-2a4 4 0 0 0-3-3.87" }],
    ["circle", { "cx": "9", "cy": "7", "r": "4" }]
  ];
  Icon($$renderer, spread_props([{ name: "users" }, props, { iconNode }]));
}
function Warehouse($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "path",
      { "d": "M18 21V10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v11" }
    ],
    [
      "path",
      {
        "d": "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 1.132-1.803l7.95-3.974a2 2 0 0 1 1.837 0l7.948 3.974A2 2 0 0 1 22 8z"
      }
    ],
    ["path", { "d": "M6 13h12" }],
    ["path", { "d": "M6 17h12" }]
  ];
  Icon($$renderer, spread_props([{ name: "warehouse" }, props, { iconNode }]));
}
function Wrench($$renderer, $$props) {
  let { $$slots, $$events, ...props } = $$props;
  const iconNode = [
    [
      "path",
      {
        "d": "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"
      }
    ]
  ];
  Icon($$renderer, spread_props([{ name: "wrench" }, props, { iconNode }]));
}
function Sidebar($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    const navItems = [
      {
        label: "Dashboard",
        icon: Layout_dashboard,
        path: "/dashboard",
        roles: ["SUPERUSUARIO", "ADMIN"]
      },
      {
        label: "Usuarios",
        icon: Users,
        path: "/usuarios",
        roles: ["SUPERUSUARIO", "ADMIN"]
      },
      {
        label: "Catálogo",
        icon: Package,
        path: "/catalogo",
        roles: ["SUPERUSUARIO", "ADMIN", "ADMIN_BODEGA"]
      },
      {
        label: "Unidades",
        icon: Wrench,
        path: "/unidades",
        roles: ["SUPERUSUARIO", "ADMIN", "ADMIN_BODEGA", "TECNICO_TERRENO"]
      },
      {
        label: "Bodegas",
        icon: Warehouse,
        path: "/bodegas",
        roles: ["SUPERUSUARIO", "ADMIN", "ADMIN_BODEGA"]
      },
      {
        label: "Transferencias",
        icon: Arrow_left_right,
        path: "/transferencias",
        roles: ["SUPERUSUARIO", "ADMIN"]
      },
      {
        label: "Auditoría",
        icon: Scroll_text,
        path: "/auditoria",
        roles: ["SUPERUSUARIO", "ADMIN"]
      }
    ];
    let collapsed = false;
    let roles = [];
    userRoles.subscribe((r) => roles = r);
    const visibleItems = derived(() => navItems.filter((item) => item.roles.some((r) => roles.includes(r))));
    function isActive(path) {
      return store_get($$store_subs ??= {}, "$page", page).url.pathname.startsWith(path);
    }
    $$renderer2.push(`<aside${attr_class("bg-white border-r border-border flex flex-col transition-all duration-200", void 0, { "collapsed": collapsed })}${attr_style("width: 240px")}><div class="flex items-center h-14 px-4 border-b border-border">`);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="flex items-center gap-2 flex-1 min-w-0">`);
      Building_2($$renderer2, { class: "h-5 w-5 text-accent shrink-0" });
      $$renderer2.push(`<!----> <span class="text-sm font-semibold text-primary truncate">Inventario</span></div>`);
    }
    $$renderer2.push(`<!--]--> <button class="p-1 rounded-md hover:bg-surface-alt text-muted hover:text-foreground transition-colors shrink-0"${attr("aria-label", "Colapsar menú")}>`);
    {
      $$renderer2.push("<!--[-1-->");
      Panel_left_close($$renderer2, { class: "h-4 w-4" });
    }
    $$renderer2.push(`<!--]--></button></div> <nav class="flex-1 py-2 overflow-y-auto space-y-0.5 px-2"><!--[-->`);
    const each_array = ensure_array_like(visibleItems());
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let item = each_array[$$index];
      $$renderer2.push(`<a${attr("href", item.path)}${attr_class("flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", void 0, {
        "bg-surface-alt": isActive(item.path),
        "text-accent": isActive(item.path),
        "text-foreground": !isActive(item.path),
        "hover:bg-surface-alt": !isActive(item.path)
      })}>`);
      if (item.icon) {
        $$renderer2.push("<!--[-->");
        item.icon($$renderer2, { class: "h-4 w-4 shrink-0" });
        $$renderer2.push("<!--]-->");
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push("<!--]-->");
      }
      $$renderer2.push(` `);
      {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<span class="truncate">${escape_html(item.label)}</span>`);
      }
      $$renderer2.push(`<!--]--></a>`);
    }
    $$renderer2.push(`<!--]--></nav> <div class="border-t border-border p-2"><button class="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-muted hover:text-destructive hover:bg-red-50 transition-colors">`);
    Log_out($$renderer2, { class: "h-4 w-4 shrink-0" });
    $$renderer2.push(`<!----> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span>Cerrar sesión</span>`);
    }
    $$renderer2.push(`<!--]--></button></div></aside>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
function Header($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let user = null;
    currentUser.subscribe((u) => user = u);
    $$renderer2.push(`<header class="h-14 bg-white border-b border-border flex items-center justify-between px-6"><div class="flex items-center gap-2 text-sm text-muted">`);
    Building_2($$renderer2, { class: "h-4 w-4" });
    $$renderer2.push(`<!----> `);
    if (user?.roles?.length) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="text-xs bg-surface-alt text-primary-light px-2 py-0.5 rounded font-medium">${escape_html(user.roles.map((r) => r.nombre_rol).join(", "))}</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="flex items-center gap-3"><span class="text-sm font-medium text-foreground">${escape_html(user?.nombre_completo ?? "Usuario")}</span></div></header>`);
  });
}
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { children } = $$props;
    const isLoginPage = derived(() => store_get($$store_subs ??= {}, "$page", page).url.pathname === "/login");
    if (isLoginPage()) {
      $$renderer2.push("<!--[0-->");
      children($$renderer2);
      $$renderer2.push(`<!---->`);
    } else if (store_get($$store_subs ??= {}, "$authStore", authStore).token) {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<div class="flex h-dvh overflow-hidden">`);
      Sidebar($$renderer2);
      $$renderer2.push(`<!----> <div class="flex-1 flex flex-col overflow-hidden">`);
      Header($$renderer2);
      $$renderer2.push(`<!----> <main class="flex-1 overflow-y-auto p-6">`);
      children($$renderer2);
      $$renderer2.push(`<!----></main></div></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _layout as default
};
