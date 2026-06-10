<!--
@lucide/svelte v1.17.0 - ISC

This source code is licensed under the ISC license.
See the LICENSE file in the root directory of this source tree.
-->


<script lang="ts">import Icon from '../Icon.svelte';
let props = $props();
const iconNode = [["path", { "d": "M14.5 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v3.8" }], ["path", { "d": "M14 2v5a1 1 0 0 0 1 1h5" }], ["path", { "d": "M11.7 14.2 7 17l-4.7-2.8" }], ["path", { "d": "M3 13.1a2 2 0 0 0-.999 1.76v3.24a2 2 0 0 0 .969 1.78L6 21.7a2 2 0 0 0 2.03.01L11 19.9a2 2 0 0 0 1-1.76V14.9a2 2 0 0 0-.97-1.78L8 11.3a2 2 0 0 0-2.03-.01z" }], ["path", { "d": "M7 17v5" }]];
</script>

<!--
@component

Lucide SVG icon component, renders SVG Element with children.

@preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTQuNSAyMkgxOGEyIDIgMCAwIDAgMi0yVjhhMi40IDIuNCAwIDAgMC0uNzA2LTEuNzA2bC0zLjU4OC0zLjU4OEEyLjQgMi40IDAgMCAwIDE0IDJINmEyIDIgMCAwIDAtMiAydjMuOCIgLz4KICA8cGF0aCBkPSJNMTQgMnY1YTEgMSAwIDAgMCAxIDFoNSIgLz4KICA8cGF0aCBkPSJNMTEuNyAxNC4yIDcgMTdsLTQuNy0yLjgiIC8+CiAgPHBhdGggZD0iTTMgMTMuMWEyIDIgMCAwIDAtLjk5OSAxLjc2djMuMjRhMiAyIDAgMCAwIC45NjkgMS43OEw2IDIxLjdhMiAyIDAgMCAwIDIuMDMuMDFMMTEgMTkuOWEyIDIgMCAwIDAgMS0xLjc2VjE0LjlhMiAyIDAgMCAwLS45Ny0xLjc4TDggMTEuM2EyIDIgMCAwIDAtMi4wMy0uMDF6IiAvPgogIDxwYXRoIGQ9Ik03IDE3djUiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/file-box
@see https://lucide.dev/guide/packages/lucide-svelte - Documentation
-->

<Icon name="file-box" {...props} iconNode={iconNode} />
