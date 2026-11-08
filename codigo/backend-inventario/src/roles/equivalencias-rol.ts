// BDD global de los 4 grupos: los roles se llaman distinto que en G1.
// G1 sigue usando sus nombres internos (los de @Roles y del frontend); al leer
// un rol de la base se traduce con esta tabla. Acordado con G8 (nov-2026).
// Un nombre que no está aquí (p. ej. SUPERUSUARIO o los nombres antiguos de
// G1) se usa tal cual; Comercial y Soporte no tienen equivalente en G1.
export const EQUIVALENCIAS_ROL: Readonly<Record<string, string>> = {
  Administrador: 'ADMIN',
  Inventario: 'ADMIN_BODEGA',
  Terreno: 'TECNICO_TERRENO',
};

/** Nombre interno de G1 para un rol leído de la base. */
export function rolInterno(nombre: string): string {
  return EQUIVALENCIAS_ROL[nombre] ?? nombre;
}

/** Todos los nombres con que puede estar guardado en la base un rol interno. */
export function nombresRolEnBase(interno: string): string[] {
  return [
    interno,
    ...Object.keys(EQUIVALENCIAS_ROL).filter(
      (nombre) => EQUIVALENCIAS_ROL[nombre] === interno,
    ),
  ];
}
