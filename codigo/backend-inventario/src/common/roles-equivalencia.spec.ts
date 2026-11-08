import { codigoRol, nombresDeRol } from './roles-equivalencia';

describe('roles-equivalencia (BDD global)', () => {
  it('traduce los nombres de la base global a los códigos de G1', () => {
    expect(codigoRol('Administrador')).toBe('ADMIN');
    expect(codigoRol('Inventario')).toBe('ADMIN_BODEGA');
    expect(codigoRol('Terreno')).toBe('TECNICO_TERRENO');
    expect(codigoRol('SUPERUSUARIO')).toBe('SUPERUSUARIO');
  });

  it('mantiene los códigos propios y no da acceso a roles ajenos', () => {
    expect(codigoRol('ADMIN_BODEGA')).toBe('ADMIN_BODEGA');
    expect(codigoRol('Comercial')).toBe('Comercial');
    expect(codigoRol(undefined)).toBe('');
  });

  it('lista los nombres de la base que equivalen a un código', () => {
    expect(nombresDeRol('TECNICO_TERRENO')).toEqual(
      expect.arrayContaining(['TECNICO_TERRENO', 'Terreno']),
    );
  });
});
