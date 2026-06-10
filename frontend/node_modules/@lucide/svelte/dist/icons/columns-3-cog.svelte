<!--
@lucide/svelte v1.17.0 - ISC

This source code is licensed under the ISC license.
See the LICENSE file in the root directory of this source tree.
-->


<script lang="ts">import Icon from '../Icon.svelte';
let props = $props();
const iconNode = [["path", { "d": "M10.5 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5.5" }], ["path", { "d": "m14.3 19.6 1-.4" }], ["path", { "d": "M15 3v7.5" }], ["path", { "d": "m15.2 16.9-.9-.3" }], ["path", { "d": "m16.6 21.7.3-.9" }], ["path", { "d": "m16.8 15.3-.4-1" }], ["path", { "d": "m19.1 15.2.3-.9" }], ["path", { "d": "m19.6 21.7-.4-1" }], ["path", { "d": "m20.7 16.8 1-.4" }], ["path", { "d": "m21.7 19.4-.9-.3" }], ["path", { "d": "M9 3v18" }], ["circle", { "cx": "18", "cy": "18", "r": "3" }]];
</script>

<!--
@component

Lucide SVG icon component, renders SVG Element with children.

@preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTAuNSAyMUg1YTIgMiAwIDAgMS0yLTJWNWEyIDIgMCAwIDEgMi0yaDE0YTIgMiAwIDAgMSAyIDJ2NS41IiAvPgogIDxwYXRoIGQ9Im0xNC4zIDE5LjYgMS0uNCIgLz4KICA8cGF0aCBkPSJNMTUgM3Y3LjUiIC8+CiAgPHBhdGggZD0ibTE1LjIgMTYuOS0uOS0uMyIgLz4KICA8cGF0aCBkPSJtMTYuNiAyMS43LjMtLjkiIC8+CiAgPHBhdGggZD0ibTE2LjggMTUuMy0uNC0xIiAvPgogIDxwYXRoIGQ9Im0xOS4xIDE1LjIuMy0uOSIgLz4KICA8cGF0aCBkPSJtMTkuNiAyMS43LS40LTEiIC8+CiAgPHBhdGggZD0ibTIwLjcgMTYuOCAxLS40IiAvPgogIDxwYXRoIGQ9Im0yMS43IDE5LjQtLjktLjMiIC8+CiAgPHBhdGggZD0iTTkgM3YxOCIgLz4KICA8Y2lyY2xlIGN4PSIxOCIgY3k9IjE4IiByPSIzIiAvPgo8L3N2Zz4=) - https://lucide.dev/icons/columns-3-cog
@see https://lucide.dev/guide/packages/lucide-svelte - Documentation
-->

<Icon name="columns-3-cog" {...props} iconNode={iconNode} />
