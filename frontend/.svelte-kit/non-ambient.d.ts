
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/" | "/auditoria" | "/auditoria/[id]" | "/bodegas" | "/bodegas/[id]" | "/catalogo" | "/catalogo/[id]" | "/dashboard" | "/login" | "/transferencias" | "/transferencias/[id]" | "/unidades" | "/unidades/[id]" | "/usuarios" | "/usuarios/[id]";
		RouteParams(): {
			"/auditoria/[id]": { id: string };
			"/bodegas/[id]": { id: string };
			"/catalogo/[id]": { id: string };
			"/transferencias/[id]": { id: string };
			"/unidades/[id]": { id: string };
			"/usuarios/[id]": { id: string }
		};
		LayoutParams(): {
			"/": { id?: string | undefined };
			"/auditoria": { id?: string | undefined };
			"/auditoria/[id]": { id: string };
			"/bodegas": { id?: string | undefined };
			"/bodegas/[id]": { id: string };
			"/catalogo": { id?: string | undefined };
			"/catalogo/[id]": { id: string };
			"/dashboard": Record<string, never>;
			"/login": Record<string, never>;
			"/transferencias": { id?: string | undefined };
			"/transferencias/[id]": { id: string };
			"/unidades": { id?: string | undefined };
			"/unidades/[id]": { id: string };
			"/usuarios": { id?: string | undefined };
			"/usuarios/[id]": { id: string }
		};
		Pathname(): "/" | "/auditoria" | "/bodegas" | `/bodegas/${string}` & {} | "/catalogo" | `/catalogo/${string}` & {} | "/dashboard" | "/login" | "/transferencias" | "/unidades" | `/unidades/${string}` & {} | "/usuarios" | `/usuarios/${string}` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): string & {};
	}
}