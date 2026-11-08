// BDD global (acuerdo con G8): los roles se llaman distinto que en G1.
// G1 sigue validando con sus códigos; aquí se traducen los nombres de la base.
// Un nombre que no está en la tabla se deja igual (Comercial, Soporte: sin acceso).
const EQUIVALENCIAS: Record<string, string> = {
  superusuario: 'SUPERUSUARIO',
  admin: 'ADMIN',
  administrador: 'ADMIN',
  admin_bodega: 'ADMIN_BODEGA',
  inventario: 'ADMIN_BODEGA',
  tecnico_terreno: 'TECNICO_TERRENO',
  terreno: 'TECNICO_TERRENO',
};

export function codigoRol(nombre: string | null | undefined): string {
  if (!nombre) return '';
  return EQUIVALENCIAS[nombre.trim().toLowerCase()] ?? nombre;
}

// Nombres de la base que equivalen a un código de G1 (para filtrar en SQL).
export function nombresDeRol(codigo: string): string[] {
  const nombres = Object.keys(EQUIVALENCIAS).filter(
    (n) => EQUIVALENCIAS[n] === codigo,
  );
  const variantes = nombres.flatMap((n) => [
    n,
    n.toUpperCase(),
    n.charAt(0).toUpperCase() + n.slice(1),
  ]);
  return [...new Set([codigo, ...variantes])];
}
