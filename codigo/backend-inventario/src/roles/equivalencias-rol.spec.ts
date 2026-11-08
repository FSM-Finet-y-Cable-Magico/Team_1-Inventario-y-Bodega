import { nombresRolEnBase, rolInterno } from './equivalencias-rol';

describe('equivalencias de rol (BDD global)', () => {
  it('traduce los roles de la base global a los nombres de G1', () => {
    expect(rolInterno('Administrador')).toBe('ADMIN');
    expect(rolInterno('Inventario')).toBe('ADMIN_BODEGA');
    expect(rolInterno('Terreno')).toBe('TECNICO_TERRENO');
  });

  it('deja igual SUPERUSUARIO y los nombres propios de G1', () => {
    expect(rolInterno('SUPERUSUARIO')).toBe('SUPERUSUARIO');
    expect(rolInterno('TECNICO_TERRENO')).toBe('TECNICO_TERRENO');
  });

  it('no da acceso a roles sin equivalente', () => {
    expect(rolInterno('Comercial')).toBe('Comercial');
    expect(rolInterno('Soporte')).toBe('Soporte');
  });

  it('lista los nombres guardados para un rol interno', () => {
    expect(nombresRolEnBase('TECNICO_TERRENO')).toEqual([
      'TECNICO_TERRENO',
      'Terreno',
    ]);
    expect(nombresRolEnBase('SUPERUSUARIO')).toEqual(['SUPERUSUARIO']);
  });
});
